"use client";

import { useState, useEffect } from 'react';
import TabNavigation from './components/TabNavigation';

interface GroceryItem {
  id: string;
  name: string;
  status: 'toBuy' | 'purchased';
}

export default function Home() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [activeTab, setActiveTab] = useState<'toBuy' | 'purchased'>('toBuy');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/groceries?status=${activeTab}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]); // or handle error as needed
        console.error('API did not return an array:', data);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setIsLoading(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    try {
      const response = await fetch('/api/groceries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItem }),
      });
      if (response.ok) {
        setNewItem('');
        fetchItems();
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const updateItemStatus = async (id: string, newStatus: 'toBuy' | 'purchased') => {
    try {
      await fetch('/api/groceries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      fetchItems();
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch('/api/groceries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gradient-to-b from-blue-50 to-blue-100">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8 text-blue-800">
          Grocery List
        </h1>

        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

        <form onSubmit={addItem} className="flex gap-2 mb-8">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add new item..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </form>

        {isLoading ? (
          <div className="text-center">Loading...</div>
        ) : (
          <ul className="w-full space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
              >
                <span>{item.name}</span>
                <div className="flex gap-2">
                  {activeTab === 'toBuy' ? (
                    <button
                      onClick={() => updateItemStatus(item.id, 'purchased')}
                      className="text-green-500 hover:text-green-600"
                    >
                      ✓
                    </button>
                  ) : (
                    <button
                      onClick={() => updateItemStatus(item.id, 'toBuy')}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      ↩
                    </button>
                  )}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
