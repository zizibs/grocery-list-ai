"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import TabNavigation from './components/TabNavigation';
import RecipeModal from './components/RecipeModal';
import { supabase } from '@/lib/supabase';

interface GroceryItemType {
  id: string;
  name: string;
  status: 'toBuy' | 'purchased';
  list_id: string;
}

interface Recipe {
  title: string;
  ingredients: string[];
}

interface List {
  id: string;
  name: string;
  share_code: string;
}

export default function Home() {
  const { user } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [currentList, setCurrentList] = useState<string | null>(null);
  const [items, setItems] = useState<GroceryItemType[]>([]);
  const [newItem, setNewItem] = useState('');
  const [newListName, setNewListName] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [activeTab, setActiveTab] = useState<'toBuy' | 'purchased'>('toBuy');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    if (user) {
      fetchLists();
    }
  }, [user]);

  useEffect(() => {
    if (currentList) {
      fetchItems();
    }
  }, [currentList, activeTab]);

  const fetchLists = async () => {
    try {
      const { data: listsData, error } = await supabase
        .from('lists')
        .select('*')
        .or(`created_by.eq.${user?.id},id.in.(${
          supabase.from('users_lists').select('list_id').eq('user_id', user?.id)
        })`);

      if (error) throw error;
      setLists(listsData || []);
      if (listsData?.length > 0 && !currentList) {
        setCurrentList(listsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('lists')
        .insert([
          {
            name: newListName,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setLists([...lists, data]);
      setNewListName('');
      setCurrentList(data.id);
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  const joinList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareCode.trim()) return;

    try {
      const { data: list, error: listError } = await supabase
        .from('lists')
        .select('*')
        .eq('share_code', shareCode)
        .single();

      if (listError) throw listError;

      const { error: shareError } = await supabase
        .from('users_lists')
        .insert([
          {
            user_id: user?.id,
            list_id: list.id,
            role: 'viewer',
          },
        ]);

      if (shareError) throw shareError;

      setLists([...lists, list]);
      setShareCode('');
      setCurrentList(list.id);
    } catch (error) {
      console.error('Error joining list:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(`/api/groceries?status=${activeTab}&list_id=${currentList}`);
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
        body: JSON.stringify({ name: newItem, list_id: currentList }),
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
        body: JSON.stringify({ id, status: newStatus, list_id: currentList }),
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
        body: JSON.stringify({ id, list_id: currentList }),
      });
      fetchItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const findRecipes = async () => {
    try {
      const response = await fetch('/api/groceries?status=purchased&list_id=' + currentList);
      const purchasedItems = await response.json();
      if (Array.isArray(purchasedItems)) {
        const recipeResponse = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchasedItems }),
        });
        const { recipes } = await recipeResponse.json();
        setRecipes(recipes);
        setIsModalOpen(true);
      } else {
        console.error('API did not return an array:', purchasedItems);
      }
    } catch (error) {
      console.error('Failed to fetch purchased items or recipes:', error);
    }
  };

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen flex-col items-center p-24 bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
          <h1 className="text-4xl font-bold text-center mb-8 text-blue-800">
            Grocery Lists
          </h1>

          <div className="mb-8 space-y-4">
            <form onSubmit={createList} className="flex gap-2">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New list name..."
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Create List
              </button>
            </form>

            <form onSubmit={joinList} className="flex gap-2">
              <input
                type="text"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                placeholder="Enter share code..."
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                Join List
              </button>
            </form>

            <select
              value={currentList || ''}
              onChange={(e) => setCurrentList(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a list...</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>

            {currentList && (
              <div className="text-center">
                Share Code:{' '}
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {lists.find((l) => l.id === currentList)?.share_code}
                </span>
              </div>
            )}
          </div>

          {currentList && (
            <>
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
            </>
          )}
        </div>

        <RecipeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} recipes={recipes} />
      </main>
    </ProtectedRoute>
  );
}
