'use client';

import { useState } from 'react';
import { GroceryItem } from '@/types/database';

interface Message {
  role: string;
  content: string;
}

interface RecipeChatProps {
  purchasedItems: GroceryItem[];
  isOpen: boolean;
  onClose: () => void;
}

export default function RecipeChat({ purchasedItems, isOpen, onClose }: RecipeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecipeSuggestion = async (previousMessages: Message[] = []) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchasedItems,
          previousMessages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recipe suggestion');
      }

      const data = await response.json();
      return {
        role: data.role,
        content: data.message,
      };
    } catch (error) {
      console.error('Error fetching recipe:', error);
      return {
        role: 'assistant',
        content: 'Sorry, I had trouble generating a recipe suggestion. Please try again.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() && messages.length === 0) {
      // If it's the first message, automatically ask for a recipe
      const assistantMessage = await fetchRecipeSuggestion();
      setMessages([assistantMessage]);
    } else if (inputMessage.trim()) {
      // For follow-up questions
      const newMessages = [
        ...messages,
        { role: 'user', content: inputMessage },
      ];
      setMessages(newMessages);
      setInputMessage('');
      
      const assistantMessage = await fetchRecipeSuggestion(newMessages);
      setMessages([...newMessages, assistantMessage]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Recipe Suggestions</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500">
              {isLoading ? (
                'Generating recipe suggestions...'
              ) : (
                'Click "Get Recipe Suggestions" to start'
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`${
                  message.role === 'assistant'
                    ? 'bg-blue-100'
                    : 'bg-gray-100'
                } p-3 rounded-lg`}
              >
                {message.content}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={messages.length === 0 ? "Click 'Get Recipe Suggestions' to start" : "Ask a follow-up question..."}
              className="flex-1 p-2 border rounded-lg"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              disabled={isLoading}
            >
              {messages.length === 0 ? 'Get Recipe Suggestions' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 