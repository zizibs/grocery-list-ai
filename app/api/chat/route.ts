import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { purchasedItems, previousMessages = [] } = await request.json();

    // Format purchased items for the prompt
    const itemsList = purchasedItems?.map((item: any) => item.name).join(', ') || '';

    // Prepare messages array
    const messages = [
      ...previousMessages,
      {
        role: 'user',
        content: previousMessages.length === 0
          ? `What recipe can I make using these purchased ingredients: ${itemsList}? Please suggest a recipe that uses as many of these ingredients as possible.`
          : `Continue the conversation about recipe suggestions using these ingredients: ${itemsList}`
      }
    ];

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
    });
  } catch (error) {
    console.error('Error calling ChatGPT:', error);
    return NextResponse.json(
      { error: 'Failed to get recipe suggestions' },
      { status: 500 }
    );
  }
} 