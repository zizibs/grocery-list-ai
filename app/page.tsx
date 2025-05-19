"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import TabNavigation from './components/TabNavigation';
import RecipeChat from './components/RecipeChat';
import { supabase } from '@/lib/supabase';
import { validateAndSanitizeListName, validateShareCode } from '@/utils/validation';
import { List, GroceryItem, Recipe } from '@/types/database';

export default function Home() {
  const { user } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [currentList, setCurrentList] = useState<string | null>(null);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [newListName, setNewListName] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [activeTab, setActiveTab] = useState<'toBuy' | 'purchased'>('toBuy');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRecipeChatOpen, setIsRecipeChatOpen] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState<GroceryItem[]>([]);

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
      // First get the lists where user is the creator
      const { data: ownedLists, error: ownedError } = await supabase
        .from('lists')
        .select('*')
        .eq('created_by', user?.id);

      if (ownedError) throw ownedError;

      // Then get the lists shared with the user
      const { data: sharedListIds, error: sharedError } = await supabase
        .from('users_lists')
        .select('list_id, role')
        .eq('user_id', user?.id);

      if (sharedError) throw sharedError;

      // Log for debugging
      console.log('User lists:', {
        owned: ownedLists?.length || 0,
        shared: sharedListIds?.length || 0,
        userId: user?.id
      });

      // If there are shared lists, fetch their details
      let sharedLists = [];
      if (sharedListIds && sharedListIds.length > 0) {
        const { data: sharedListsData, error: listsError } = await supabase
          .from('lists')
          .select('*')
          .in('id', sharedListIds.map(item => item.list_id));

        if (listsError) throw listsError;
        sharedLists = sharedListsData || [];
        
        // Add role information to shared lists for UI display
        sharedLists = sharedLists.map(list => {
          const userListRelation = sharedListIds.find(item => item.list_id === list.id);
          return {
            ...list,
            role: userListRelation?.role
          };
        });
      }

      // Combine both lists
      const combinedLists = [...(ownedLists || []), ...sharedLists];
      setLists(combinedLists);
      
      if (combinedLists.length > 0 && !currentList) {
        setCurrentList(combinedLists[0].id);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
    }
  };

  // Function to check permissions for the current list
  const checkListPermissions = async (listId: string) => {
    if (!user?.id || !listId) return false;
    
    try {
      // Check if user owns the list
      const { data: ownedList, error: ownedError } = await supabase
        .from('lists')
        .select('id')
        .eq('id', listId)
        .eq('created_by', user.id)
        .maybeSingle();
      
      if (ownedList) {
        console.log('User owns this list:', listId);
        return true;
      }
      
      // Check if user has shared access with editor role
      const { data: sharedAccess, error: sharedError } = await supabase
        .from('users_lists')
        .select('role')
        .eq('list_id', listId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('Shared list access check:', {
        listId,
        hasAccess: !!sharedAccess,
        role: sharedAccess?.role
      });
      
      return sharedAccess?.role === 'editor';
    } catch (error) {
      console.error('Error checking list permissions:', error);
      return false;
    }
  };

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!user?.id) {
      setError('Please sign in to create a list');
      return;
    }

    // Validate list name
    const nameValidation = validateAndSanitizeListName(newListName);
    if (!nameValidation.isValid) {
      setError(nameValidation.error);
      return;
    }

    try {
      // Generate a unique share code
      const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error: supabaseError } = await supabase
        .from('lists')
        .insert([
          {
            name: nameValidation.sanitizedValue,
            created_by: user.id,
            share_code: shareCode
          }
        ])
        .select()
        .single();

      if (supabaseError) {
        console.error('Error creating list:', supabaseError);
        if (supabaseError.code === '23505') { // unique violation
          setError('A list with this share code already exists. Please try again.');
        } else if (supabaseError.code === '42P01') { // undefined table
          setError('Database setup incomplete. Please contact support.');
        } else if (supabaseError.code === '42703') { // undefined column
          setError('Database schema mismatch. Please contact support.');
        } else {
          setError('Failed to create list. Please try again.');
        }
        return;
      }

      if (data) {
        const newList = data as unknown as List;
        if (!newList.id) {
          setError('Invalid list data received');
          return;
        }
        setLists(prevLists => [...prevLists, newList]);
        setNewListName('');
        setCurrentList(newList.id);
        setError(null);
      }
    } catch (error) {
      console.error('Error creating list:', error);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const joinList = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate share code
    const codeValidation = validateShareCode(shareCode);
    if (!codeValidation.isValid) {
      setError(codeValidation.error);
      return;
    }

    try {
      const { data: listData, error: listError } = await supabase
        .from('lists')
        .select('*')
        .eq('share_code', codeValidation.sanitizedValue)
        .single();

      if (listError) {
        if (listError.code === 'PGRST116') {
          setError('List not found. Please check the share code.');
        } else {
          throw listError;
        }
        return;
      }

      if (listData) {
        const list = listData as unknown as List;
        if (!list.id) {
          setError('Invalid list data received');
          return;
        }

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
        setError(null);
      } else {
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('Error joining list:', error);
      setError('Failed to join list. Please try again.');
    }
  };

  const fetchItems = async () => {
    try {
      // Get the session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to view items');
        return;
      }

      const response = await fetch(`/api/groceries?status=${activeTab}&list_id=${currentList}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
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
    setError(null);
    if (!newItem.trim()) {
      setError('Please enter an item name');
      return;
    }
    if (!currentList) {
      setError('Please select a list first');
      return;
    }

    try {
      // Get the session and ensure we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        setError('Please sign in to add items');
        console.error('Authentication issue: No valid session found');
        return;
      }

      // Check permissions before attempting to add
      const hasPermission = await checkListPermissions(currentList);
      if (!hasPermission) {
        console.error('Permission denied: User cannot add items to this list');
        setError('You do not have permission to add items to this list. Please select a different list or request editor access.');
        return;
      }

      // Get current list details for debugging
      const currentListObj = lists.find(list => list.id === currentList);
      console.log('Adding item to list:', { 
        listId: currentList, 
        listName: currentListObj?.name,
        userId: session.user.id,
        itemName: newItem
      });
      
      const response = await fetch('/api/groceries', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          name: newItem, 
          list_id: currentList,
          created_by: session.user.id // Explicitly set the created_by field
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Failed to add item');
      }
      
      setNewItem('');
      fetchItems();
      setError(null);
    } catch (error) {
      console.error('Failed to add item:', error);
      setError(error instanceof Error ? error.message : 'Failed to add item');
    }
  };

  const updateItemStatus = async (id: string, newStatus: 'toBuy' | 'purchased') => {
    try {
      // Get the session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to update items');
        return;
      }

      await fetch('/api/groceries', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id, status: newStatus, list_id: currentList }),
        credentials: 'include'
      });
      fetchItems();
    } catch (error) {
      console.error('Failed to update item:', error);
      setError(error instanceof Error ? error.message : 'Failed to update item');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      // Get the session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to delete items');
        return;
      }

      await fetch('/api/groceries', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id, list_id: currentList }),
        credentials: 'include'
      });
      fetchItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete item');
    }
  };

  const findRecipes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to view recipes');
        return;
      }

      const response = await fetch(`/api/groceries?status=purchased&list_id=${currentList}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setPurchasedItems(data);
        setIsRecipeChatOpen(true);
      } else {
        console.error('API did not return an array:', data);
        setError('Failed to fetch purchased items');
      }
    } catch (error) {
      console.error('Failed to fetch purchased items:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch purchased items');
    }
  };

  // Function to request editor access for a shared list
  const requestEditorAccess = (listId: string) => {
    // In a real app, this would send a notification to the list owner
    // For now, we'll just show a message
    setError('Request sent to list owner. They will need to grant you editor access.');
    
    // You could implement an actual notification system later
    console.log('Editor access requested for list:', listId);
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
              {lists.map((list) => {
                // Determine if user is owner or shared user
                const isOwner = list.created_by === user?.id;
                const role = isOwner ? 'owner' : (list as any).role || 'viewer';
                const roleLabel = isOwner ? '(Owner)' : role === 'editor' ? '(Editor)' : '(Viewer)';
                
                return (
                  <option key={list.id} value={list.id}>
                    {list.name} {roleLabel}
                  </option>
                );
              })}
            </select>

            {currentList && (
              <div className="text-center space-y-2">
                <div>
                  Share Code:{' '}
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                    {lists.find((l) => l.id === currentList)?.share_code}
                  </span>
                </div>
                
                {/* Show upgrade button if the user is a viewer for this list */}
                {currentList && lists.find(l => l.id === currentList)?.created_by !== user?.id && 
                 (lists.find(l => l.id === currentList) as any)?.role === 'viewer' && (
                  <div className="mt-2">
                    <button
                      onClick={() => requestEditorAccess(currentList)}
                      className="text-xs bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    >
                      Request Editor Access
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

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
        <div className="mt-4">
          <button
            onClick={findRecipes}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Get Recipe Suggestions
          </button>
        </div>
      </div>

      <RecipeChat
        isOpen={isRecipeChatOpen}
        onClose={() => setIsRecipeChatOpen(false)}
        purchasedItems={purchasedItems}
      />
    </main>
    </ProtectedRoute>
  );
}
