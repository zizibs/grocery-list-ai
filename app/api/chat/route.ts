import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { generateRecipeSuggestion, generateFollowupResponse } from './fallback';

// Initialize Google Generative AI with API key
const API_KEY = process.env.GOOGLE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// Force fallback mode if no API key is provided
const USE_FALLBACK_ONLY = !API_KEY;

// Updated model name to ensure compatibility
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
      console.log(`Attempting to use ${MODEL_NAME} model`);
      
      // Set up generation config with reduced tokens to preserve quota
      const generationConfig = {
        maxOutputTokens: 800,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      };
      
      // Initialize the model - simplified to avoid potential issues
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      
      try {
        // For first-time conversations
        if (isFirstMessage || previousMessages.length === 0 || previousMessages[0].role !== 'user') {
          console.log('Using generateContent for first message or invalid history');
          
          // Create content parts with the user's message
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig,
          });
          
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
          
          // Start a chat session
          const chat = model.startChat({ generationConfig });
          
          // Add history messages one by one
          for (let i = 0; i < previousMessages.length; i++) {
            const msg = previousMessages[i];
            try {
              if (i < previousMessages.length - 1) {
                // Send all but the last message silently (no need to process responses)
                await chat.sendMessage(msg.content);
              }
            } catch (historyError) {
              console.warn('Error adding history message, continuing:', historyError);
              // Continue despite errors in history
            }
          }
          
          // Send the current user message and get response
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
        console.error('Gemini API error:', apiError);
        
        // Check for specific 404 error about model not found
        if (apiError.status === 404 && apiError.message?.includes('not found for API version')) {
          console.log('Model naming issue detected, falling back to simpler call format');
          
          // Try with simpler generateContent call
          try {
            const result = await model.generateContent(userMessage);
            const text = result.response.text();
            
            return NextResponse.json({
              message: text,
              role: 'assistant',
              source: 'gemini',
              model: MODEL_NAME
            });
          } catch (retryError) {
            console.error('Final API attempt failed:', retryError);
            throw retryError;
          }
        }
        
        // For other errors, just throw and catch in outer try-catch
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