"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import TabNavigation from './components/TabNavigation';
import RecipeChat from './components/RecipeChat';
import { supabase } from '@/lib/supabase';
import { validateAndSanitizeListName, validateShareCode, validateAndSanitizeItemName } from '@/utils/validation';
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
  const [listNameError, setListNameError] = useState<string | null>(null);
  const [itemNameError, setItemNameError] = useState<string | null>(null);

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
      setIsLoading(true);
      
      // Get user's owned lists
      const { data: ownedLists, error: ownedError } = await supabase
        .from('grocery_lists')
        .select('*')
        .eq('owner_id', user?.id);
      
      if (ownedError) throw ownedError;
      
      // Get lists shared with the user
      const { data: sharedListRelations, error: sharedError } = await supabase
        .from('list_members')
        .select('list_id, can_edit')
        .eq('user_id', user?.id);
      
      if (sharedError) throw sharedError;
      
      // Fetch the actual shared list data
      let sharedLists: any[] = [];
      if (sharedListRelations && sharedListRelations.length > 0) {
        const { data: sharedListsData, error: sharedListsError } = await supabase
          .from('grocery_lists')
          .select('*')
          .in('id', sharedListRelations.map(r => r.list_id));
        
        if (sharedListsError) throw sharedListsError;
        
        // Add can_edit information to shared lists for UI display
        sharedLists = sharedListsData.map(list => {
          const userListRelation = sharedListRelations.find(r => r.list_id === list.id);
          return {
            ...list,
            can_edit: userListRelation?.can_edit
          };
        });
      }
      
      // Combine owned and shared lists
      const allLists = [...ownedLists, ...sharedLists];
      setLists(allLists);
      
      // If there's at least one list, select the first one
      if (allLists.length > 0 && !currentList) {
        setCurrentList(allLists[0].id);
      }
    } catch (error) {
      console.error('Error fetching lists:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch lists');
    } finally {
      setIsLoading(false);
    }
  };

  const checkListPermissions = async (listId: string) => {
    if (!user) return false;
    
    try {
      // Check if user is the owner
      const { data: ownedList, error: ownedError } = await supabase
        .from('grocery_lists')
        .select('id')
        .eq('id', listId)
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (ownedList) return true;
      
      // Check if user has shared access with edit permission
      const { data: sharedAccess, error: sharedError } = await supabase
        .from('list_members')
        .select('can_edit')
        .eq('list_id', listId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (sharedError) {
        console.error('Error checking permissions:', sharedError);
        return false;
      }
      
      return {
        canEdit: sharedAccess?.can_edit === true
      };
      
      // If can_edit is true, user can edit the list
      return sharedAccess?.can_edit === true;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  };

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validate list name
    const validationResult = validateAndSanitizeListName(newListName);
    if (!validationResult.isValid) {
      setListNameError(validationResult.error);
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      setListNameError(null);
      
      // Generate a random 6-character share code
      const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error } = await supabase
        .from('grocery_lists')
        .insert([
          {
            name: validationResult.sanitizedValue,
            owner_id: user.id,
            share_code: shareCode
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      // Add the new list to the state
      setLists([...lists, data]);
      setCurrentList(data.id);
      setNewListName('');
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error creating list:', error);
      setError(error instanceof Error ? error.message : 'Failed to create list');
    } finally {
      setIsLoading(false);
    }
  };

  const joinList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shareCode.trim() || !user) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      // Find the list with this share code
      const { data: list, error: listError } = await supabase
        .from('grocery_lists')
        .select('*')
        .eq('share_code', shareCode.trim())
        .maybeSingle();
      
      if (listError || !list) {
        throw new Error('Invalid share code or list not found');
      }
      
      // Check if user already has access to this list
      const { data: existingAccess, error: accessError } = await supabase
        .from('list_members')
        .select('*')
        .eq('list_id', list.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingAccess) {
        throw new Error('You already have access to this list');
      }
      
      // Add user to the list with viewer permissions
      const { data: membership, error: membershipError } = await supabase
        .from('list_members')
        .insert([
          {
            list_id: list.id,
            user_id: user.id,
            can_edit: false
          }
        ])
        .select()
        .single();
      
      if (membershipError) throw membershipError;
      
      // Add the shared list to the state
      const listWithRole = {
        ...list,
        can_edit: false
      };
      
      setLists([...lists, listWithRole]);
      setCurrentList(list.id);
      setShareCode('');
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error joining list:', error);
      setError(error instanceof Error ? error.message : 'Failed to join list');
    } finally {
      setIsLoading(false);
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
    
    if (!currentList || !user) return;
    
    // Validate item name
    const validationResult = validateAndSanitizeItemName(newItem);
    if (!validationResult.isValid) {
      setItemNameError(validationResult.error);
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      setItemNameError(null);
      
      const { data, error } = await supabase
        .from('grocery_items')
        .insert([
          {
            list_id: currentList,
            name: validationResult.sanitizedValue,
            added_by: user.id
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      // Add the new item to the state
      setItems([...items, data]);
      setNewItem('');
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error adding item:', error);
      setError(error instanceof Error ? error.message : 'Failed to add item');
    } finally {
      setIsLoading(false);
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

  const deleteList = async (listId: string) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      // Check if user is the owner of the list
      const isOwner = await checkListPermissions(listId);
      if (!isOwner) {
        throw new Error('Only the list owner can delete the list');
      }
      
      // Delete the list
      const { error } = await supabase
        .from('grocery_lists')
        .delete()
        .eq('id', listId);
      
      if (error) throw error;
      
      // Update the state
      const updatedLists = lists.filter(list => list.id !== listId);
      setLists(updatedLists);
      
      // If the deleted list was the current list, select another list
      if (currentList === listId) {
        setCurrentList(updatedLists.length > 0 ? updatedLists[0].id : null);
      }
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error deleting list:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete list');
    } finally {
      setIsLoading(false);
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
                onChange={(e) => {
                  setNewListName(e.target.value);
                  setListNameError(null);
                }}
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
            
            {listNameError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {listNameError}
              </div>
            )}

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
                const isOwner = list.owner_id === user?.id;
                const canEdit = isOwner ? true : (list as any).can_edit || false;
                const roleLabel = isOwner ? '(Owner)' : canEdit ? '(Editor)' : '(Viewer)';
                
                return (
                  <option key={list.id} value={list.id}>
                    {list.name} {roleLabel}
                  </option>
                );
              })}
            </select>

            {currentList && (
              <div className="text-center space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    Share Code:{' '}
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {lists.find((l) => l.id === currentList)?.share_code}
                    </span>
                  </div>
                  
                  {/* Add delete button for list owner */}
                  {lists.find(l => l.id === currentList)?.owner_id === user?.id && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
                          deleteList(currentList);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 px-3 py-1 rounded border border-red-500 hover:bg-red-50"
                    >
                      Delete List
                    </button>
                  )}
                </div>
                
                {/* Show upgrade button if the user is a viewer for this list */}
                {currentList && lists.find(l => l.id === currentList)?.owner_id !== user?.id && 
                 !(lists.find(l => l.id === currentList) as any)?.can_edit && (
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
                  onChange={(e) => {
                    setNewItem(e.target.value);
                    setItemNameError(null);
                  }}
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
              
              {itemNameError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {itemNameError}
                </div>
              )}

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
              
              <div className="mt-6">
                <button
                  onClick={findRecipes}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  {isRecipeChatOpen ? 'Update Recipe Suggestions' : 'Get Recipe Suggestions'}
                </button>
              </div>

              {isRecipeChatOpen && (
                <RecipeChat
                  isOpen={isRecipeChatOpen}
                  onClose={() => setIsRecipeChatOpen(false)}
                  purchasedItems={purchasedItems}
                />
              )}
            </>
          )}
      </div>
    </main>
    </ProtectedRoute>
  );
}
