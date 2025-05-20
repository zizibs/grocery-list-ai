import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { generateRecipeSuggestion, generateFollowupResponse } from './fallback';

// Initialize Google Generative AI with API key
const API_KEY = process.env.GOOGLE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// Force fallback mode if no API key is provided
const USE_FALLBACK_ONLY = !API_KEY;

// Fully qualified model name to ensure compatibility
const MODELS = [
  "gemini-1.0-pro",      // Try older version naming first
  "gemini-pro",          // Standard version
  "models/gemini-pro"    // With models/ prefix
];

// Helper function to list available models - for debugging
async function listAvailableModels() {
  try {
    if (!API_KEY) return "No API key provided";
    
    // Using raw fetch since the SDK might not expose model listing
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY
      }
    });
    
    if (!response.ok) {
      return `Error listing models: ${response.status} ${response.statusText}`;
    }
    
    const data = await response.json();
    return data.models ? data.models.map((m: any) => m.name).join(', ') : "No models found";
  } catch (error: any) {
    return `Error listing models: ${error.message}`;
  }
}

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

    // Try each model in sequence
    let lastError = null;
    
    for (const modelName of MODELS) {
      try {
        console.log(`Attempting to use ${modelName} model`);
        
        // Set up generation config with reduced tokens to preserve quota
        const generationConfig = {
          maxOutputTokens: 800,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        };
        
        // Initialize the model - simplified to avoid potential issues
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Try the simplest possible call format
        console.log('Using simple text prompt to test API connection');
        try {
          const result = await model.generateContent(userMessage);
          const text = result.response.text();
          
          console.log(`Successfully used ${modelName} model`);
          
          return NextResponse.json({
            message: text,
            role: 'assistant',
            source: 'gemini',
            model: modelName
          });
        } catch (callError: any) {
          console.warn(`Simple call failed with ${modelName}:`, callError.message);
          lastError = callError;
          // Continue to next model
        }
      } catch (modelError: any) {
        console.warn(`Error initializing ${modelName}:`, modelError.message);
        lastError = modelError;
        // Continue to next model
      }
    }
    
    // If we got here, all models failed
    // Try to get list of available models for debugging
    const availableModels = await listAvailableModels();
    console.log("Available models:", availableModels);
    
    // Use fallback response
    const fallbackContent = isFirstMessage
      ? generateRecipeSuggestion(purchasedItems.map((item: any) => item.name))
      : generateFollowupResponse(
          previousMessages[previousMessages.length - 1]?.content || userMessage,
          purchasedItems.map((item: any) => item.name)
        );
    
    // Include detailed error info
    return NextResponse.json({
      message: "⚠️ *This is an auto-generated response while the AI service is unavailable*\n\n" + fallbackContent,
      role: 'assistant',
      source: 'fallback',
      error: {
        message: 'Gemini API error. Using fallback recipe generator.',
        original: lastError ? lastError.message : 'All models failed',
        availableModels: availableModels,
        code: lastError ? lastError.status || 'api_error' : 'all_models_failed'
      }
    });
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