import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { generateRecipeSuggestion, generateFollowupResponse } from './fallback';

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Whether to use local fallback implementation
const USE_FALLBACK_ONLY = process.env.GOOGLE_AI_API_KEY ? false : true;

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
    
    // Use fallback if no API key is set or if explicitly configured to use fallback
    if (USE_FALLBACK_ONLY) {
      console.log('Using fallback recipe generator instead of Gemini API');
      const fallbackContent = isFirstMessage
        ? generateRecipeSuggestion(purchasedItems.map((item: any) => item.name))
        : generateFollowupResponse(
            previousMessages.length > 0 ? previousMessages[previousMessages.length - 1].content : userMessage, 
            purchasedItems.map((item: any) => item.name)
          );
      
      return NextResponse.json({
        message: fallbackContent,
        role: 'assistant',
        source: 'fallback'
      });
    }

    try {
      // Create a generative model
      const model = genAI.getGenerativeModel({ 
        model: "gemini-pro",
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

      // Set up generation config
      const generationConfig = {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      };
      
      let response;

      // Convert messages for Gemini API - if we have previous messages
      // Filter and validate the history - Gemini requires first message to be from user
      if (previousMessages.length > 0) {
        // If first message is not from user, skip the history entirely
        if (previousMessages[0].role === 'user') {
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
          response = result.response;
        } else {
          // If history starts with non-user message, use single request
          console.log('Starting fresh because history begins with non-user message');
          const result = await model.generateContent(userMessage);
          response = result.response;
        }
      } else {
        // For first-time conversations, use generateContent
        console.log('First time conversation, using generateContent');
        const result = await model.generateContent(userMessage);
        response = result.response;
      }
      
      const text = response.text();

      return NextResponse.json({
        message: text,
        role: 'assistant',
        source: 'gemini'
      });
    } catch (geminiError: any) {
      console.error('Gemini API error:', geminiError);
      
      // If the API fails, use our fallback recipe generator
      const fallbackContent = isFirstMessage
        ? generateRecipeSuggestion(purchasedItems.map((item: any) => item.name))
        : generateFollowupResponse(
            previousMessages[previousMessages.length - 1]?.content || userMessage,
            purchasedItems.map((item: any) => item.name)
          );
      
      // Include the error details
      return NextResponse.json({
        message: fallbackContent,
        role: 'assistant',
        source: 'fallback',
        error: {
          message: 'Gemini API error. Using fallback recipe generator.',
          original: geminiError.message,
          code: geminiError.code || 'api_error'
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