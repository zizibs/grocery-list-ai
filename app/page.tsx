"use client";

import { useEffect, useState } from "react";

interface GroceryItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/groceries');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      try {
        const response = await fetch('/api/groceries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newItem.trim() }),
        });
        const item = await response.json();
        setItems([item, ...items]);
        setNewItem("");
      } catch (error) {
        console.error('Failed to add item:', error);
      }
    }
  };

  const removeItem = async (id: string) => {
    try {
      await fetch('/api/groceries', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      setItems(items.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Grocery List AI</h1>
        
        <form onSubmit={addItem} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add a new item..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
            >
              Add
            </button>
          </div>
        </form>

        {isLoading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <>
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg"
                >
                  <span>{item.name}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-600 focus:outline-none"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            
            {items.length === 0 && (
              <p className="text-gray-500 text-center">Your grocery list is empty</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
