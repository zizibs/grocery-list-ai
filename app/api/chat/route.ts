import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { generateRecipeSuggestion, generateFollowupResponse } from './fallback';

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Force fallback mode - set to true to completely disable Gemini API calls
const USE_FALLBACK_ONLY = process.env.GOOGLE_AI_API_KEY ? false : true;

// Model to use - gemini-pro has the most generous quota
const MODEL_NAME = "gemini-pro";

export async function POST(request: Request) {
  try {
    const { purchasedItems, previousMessages = [] } = await request.json();

    // Format purchased items for the prompt
    const itemsList = purchasedItems?.map((item: any) => item.name).join(', ') || '';
    const isFirstMessage = previousMessages.length === 0;
    
    // Prepare the user message
    const userMessage = isFirstMessage
      ? `What recipe can I make using these purchased ingredients: ${itemsList}? Please suggest a recipe that uses as many of these ingredients as possible.`
      : `Continue the conversation about recipe suggestions using these ingredients: ${itemsList}`;
    
    // Use fallback if explicitly configured to use fallback only (no API key)
    if (USE_FALLBACK_ONLY) {
      console.log('Using fallback recipe generator because no API key available');
      const fallbackContent = isFirstMessage
        ? generateRecipeSuggestion(purchasedItems.map((item: any) => item.name))
        : generateFollowupResponse(
            previousMessages.length > 0 ? previousMessages[previousMessages.length - 1].content : userMessage, 
            purchasedItems.map((item: any) => item.name)
          );
      
      return NextResponse.json({
        message: "⚠️ *This is an auto-generated response while the AI service is unavailable*\n\n" + fallbackContent,
        role: 'assistant',
        source: 'fallback'
      });
    }

    try {
      console.log(`Attempting to use ${MODEL_NAME} model first`);
      
      // Set up generation config with reduced tokens to preserve quota
      const generationConfig = {
        maxOutputTokens: 800,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      };
      
      // Initialize model with optimal safety settings
      const model = genAI.getGenerativeModel({ 
        model: MODEL_NAME,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });
          
      // Try generating content with the model
      try {
        // For first-time conversations
        if (isFirstMessage || previousMessages.length === 0 || previousMessages[0].role !== 'user') {
          console.log('Using generateContent for first message or invalid history');
          const result = await model.generateContent(userMessage);
          const text = result.response.text();
          
          return NextResponse.json({
            message: text,
            role: 'assistant',
            source: 'gemini',
            model: MODEL_NAME
          });
        } 
        // For conversations with history
        else {
          console.log('Using chat session with history');
          // Create valid history with proper role mapping
          const validHistory = previousMessages.map((msg: {role: string, content: string}) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }));
          
          // Start a chat session with the valid history
          const chat = model.startChat({
            history: validHistory,
            generationConfig
          });
          
          // Generate a response
          const result = await chat.sendMessage(userMessage);
          const text = result.response.text();
          
          return NextResponse.json({
            message: text,
            role: 'assistant',
            source: 'gemini',
            model: MODEL_NAME
          });
        }
      } catch (apiError: any) {
        // Only fall back if we get an error from the API
        console.error('Gemini API error:', apiError);
        throw apiError;
      }
    } catch (geminiError: any) {
      console.error('Gemini API error details:', geminiError);
      
      // If the API fails, use our fallback recipe generator
      const fallbackContent = isFirstMessage
        ? generateRecipeSuggestion(purchasedItems.map((item: any) => item.name))
        : generateFollowupResponse(
            previousMessages[previousMessages.length - 1]?.content || userMessage,
            purchasedItems.map((item: any) => item.name)
          );
      
      // Include the error details
      return NextResponse.json({
        message: "⚠️ *This is an auto-generated response while the AI service is unavailable*\n\n" + fallbackContent,
        role: 'assistant',
        source: 'fallback',
        error: {
          message: 'Gemini API error. Using fallback recipe generator.',
          original: geminiError.message,
          code: geminiError.status || 'api_error'
        }
      });
    }
  } catch (error: any) {
    console.error('General error in chat route:', error);
    
    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to get recipe suggestions',
        message: 'Sorry, something went wrong with the recipe suggestions. Please try again later.'
      },
      { status: 500 }
    );
  }
} 