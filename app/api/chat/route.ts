import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { generateRecipeSuggestion, generateFollowupResponse } from './fallback';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Check if we should use a fallback response
// Set this to true to completely bypass the OpenAI API for testing
const USE_FALLBACK_ONLY = false;

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
    
    // Option to skip OpenAI API completely
    if (USE_FALLBACK_ONLY) {
      const fallbackContent = isFirstMessage
        ? generateRecipeSuggestion(purchasedItems.map((item: any) => item.name))
        : generateFollowupResponse(userMessage, purchasedItems.map((item: any) => item.name));
      
      return NextResponse.json({
        message: fallbackContent,
        role: 'assistant',
        source: 'fallback'
      });
    }

    // Prepare messages array
    const messages = [
      ...previousMessages,
      {
        role: 'user',
        content: userMessage
      }
    ];

    try {
      // Call ChatGPT API
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages as any[],
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0].message;

      return NextResponse.json({
        message: response.content,
        role: response.role,
        source: 'openai'
      });
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError);
      
      // If the API fails, use our fallback recipe generator
      const fallbackContent = isFirstMessage
        ? generateRecipeSuggestion(purchasedItems.map((item: any) => item.name))
        : generateFollowupResponse(
            previousMessages[previousMessages.length - 1]?.content || userMessage,
            purchasedItems.map((item: any) => item.name)
          );
      
      // If it's a quota error, also return error details
      if (openaiError?.status === 429) {
        return NextResponse.json({
          message: fallbackContent,
          role: 'assistant',
          source: 'fallback',
          error: {
            message: 'API quota exceeded. Using fallback recipe generator.',
            original: openaiError.message,
            code: openaiError.code || 'quota_exceeded'
          }
        });
      }
      
      // For other errors, just use fallback without detailed error
      return NextResponse.json({
        message: fallbackContent,
        role: 'assistant',
        source: 'fallback'
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