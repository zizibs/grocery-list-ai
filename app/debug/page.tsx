'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';

export default function DebugPage() {
  const { user } = useAuth();
  const [userId, setUserId] = useState('afbcdccf-edd5-4174-a81d-0cfa16e3b0cb');
  const [listId, setListId] = useState('269dff84-2b70-4ade-a084-5452c650daeb');
  const [role, setRole] = useState('editor');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lists, setLists] = useState<any[]>([]);
  const [userLists, setUserLists] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [permissionCheck, setPermissionCheck] = useState<any>(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [dbCheck, setDbCheck] = useState<any>(null);
  const [checkingDb, setCheckingDb] = useState(false);
  const [fixingList, setFixingList] = useState(false);
  const [fixingPermissions, setFixingPermissions] = useState(false);
  const [permissionFixResult, setPermissionFixResult] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchLists();
    }
  }, [user]);

  const fetchLists = async () => {
    try {
      setLoadingLists(true);
      
      // Fetch all lists from the database (for admin purposes)
      const { data: allLists, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (listsError) throw listsError;
      setLists(allLists || []);
      
      // Fetch the current user's lists (both owned and shared)
      const { data: ownedLists, error: ownedError } = await supabase
        .from('lists')
        .select('*')
        .eq('created_by', user?.id);
      
      if (ownedError) throw ownedError;
      
      // Get shared lists
      const { data: sharedIds, error: sharedError } = await supabase
        .from('users_lists')
        .select('list_id, role')
        .eq('user_id', user?.id);
      
      if (sharedError) throw sharedError;
      
      let sharedLists: any[] = [];
      if (sharedIds && sharedIds.length > 0) {
        const { data: sharedListsData, error: fetchError } = await supabase
          .from('lists')
          .select('*')
          .in('id', sharedIds.map(item => item.list_id));
        
        if (fetchError) throw fetchError;
        
        // Add role information
        sharedLists = (sharedListsData || []).map(list => {
          const userList = sharedIds.find(ul => ul.list_id === list.id);
          return {
            ...list,
            relationship: 'shared',
            role: userList?.role
          };
        });
      }
      
      const combinedLists = [
        ...(ownedLists || []).map(list => ({ ...list, relationship: 'owner' })),
        ...sharedLists
      ];
      
      setUserLists(combinedLists);
    } catch (err) {
      console.error('Failed to fetch lists:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch lists');
    } finally {
      setLoadingLists(false);
    }
  };

  const grantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug/fix-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          listId,
          role
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to grant access');
      }
      
      setResult(data);
      fetchLists(); // Refresh lists after changes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error granting access:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFromList = (list: any) => {
    setListId(list.id);
    // Auto-fill the current user's ID if not set
    if (!userId && user) {
      setUserId(user.id);
    }
  };

  const checkPermissions = async () => {
    if (!userId || !listId) {
      setError('Please provide both user ID and list ID to check permissions');
      return;
    }
    
    setCheckingPermissions(true);
    setPermissionCheck(null);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/check-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          listId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check permissions');
      }
      
      setPermissionCheck(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check permissions');
      console.error('Error checking permissions:', err);
    } finally {
      setCheckingPermissions(false);
    }
  };

  const checkDatabase = async () => {
    setCheckingDb(true);
    setDbCheck(null);
    setError(null);
    
    try {
      const response = await fetch(`/api/debug/db-check?list_id=${listId}`);
      const data = await response.json();
      setDbCheck(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check database');
      console.error('Error checking database:', err);
    } finally {
      setCheckingDb(false);
    }
  };
  
  const fixList = async () => {
    if (!listId) {
      setError('Please provide a list ID to fix');
      return;
    }
    
    setFixingList(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/db-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listId,
          name: 'Fixed List'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix list');
      }
      
      setDbCheck({
        ...dbCheck,
        list_fix_result: data
      });
      
      fetchLists(); // Refresh lists after fix
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fix list');
      console.error('Error fixing list:', err);
    } finally {
      setFixingList(false);
    }
  };

  const fixPermissions = async () => {
    setFixingPermissions(true);
    setPermissionFixResult(null);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/fix-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix permissions');
      }
      
      setPermissionFixResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fix permissions');
      console.error('Error fixing permissions:', err);
    } finally {
      setFixingPermissions(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen flex-col items-center p-24 bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
          <h1 className="text-4xl font-bold text-center mb-8 text-blue-800">
            Debug Tools
          </h1>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Current User</h2>
            {user ? (
              <div className="mb-4 p-3 bg-blue-50 rounded">
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
              </div>
            ) : (
              <p className="text-red-500">Not logged in</p>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Lists</h2>
            {loadingLists ? (
              <p>Loading lists...</p>
            ) : userLists.length === 0 ? (
              <p>You don't have any lists yet.</p>
            ) : (
              <div className="overflow-auto max-h-60">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Relationship</th>
                      <th className="p-2 text-left">List ID</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userLists.map(list => (
                      <tr key={list.id} className="border-t">
                        <td className="p-2">{list.name}</td>
                        <td className="p-2">
                          {list.relationship === 'owner' ? (
                            <span className="text-green-600">Owner</span>
                          ) : (
                            <span className="text-blue-600">{list.role || 'Shared'}</span>
                          )}
                        </td>
                        <td className="p-2 text-xs">{list.id}</td>
                        <td className="p-2">
                          <button 
                            onClick={() => applyFromList(list)}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Use
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">All Lists (Debug)</h2>
            {loadingLists ? (
              <p>Loading lists...</p>
            ) : lists.length === 0 ? (
              <p>No lists found in the database.</p>
            ) : (
              <div className="overflow-auto max-h-60">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Owner ID</th>
                      <th className="p-2 text-left">List ID</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lists.map(list => (
                      <tr key={list.id} className="border-t">
                        <td className="p-2">{list.name}</td>
                        <td className="p-2 text-xs">
                          {list.created_by === user?.id ? (
                            <span className="text-green-600">{list.created_by} (You)</span>
                          ) : (
                            list.created_by
                          )}
                        </td>
                        <td className="p-2 text-xs">{list.id}</td>
                        <td className="p-2">
                          <button 
                            onClick={() => applyFromList(list)}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Use
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Grant List Access</h2>
            <p className="mb-4 text-gray-600">
              Use this tool to grant a user access to a specific list.
            </p>
            
            <form onSubmit={grantAccess} className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">User ID:</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="User ID"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">List ID:</label>
                <input
                  type="text"
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="List ID"
                  required
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={checkPermissions}
                  disabled={checkingPermissions}
                  className={`p-2 rounded text-white ${
                    checkingPermissions ? 'bg-gray-300' : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {checkingPermissions ? 'Checking...' : 'Check Permissions'}
                </button>
                
                <button
                  type="button"
                  onClick={checkDatabase}
                  disabled={checkingDb}
                  className={`p-2 rounded text-white ${
                    checkingDb ? 'bg-gray-300' : 'bg-purple-500 hover:bg-purple-600'
                  }`}
                >
                  {checkingDb ? 'Checking...' : 'Check Database'}
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex-1 p-2 rounded text-white ${
                    isLoading ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isLoading ? 'Processing...' : 'Grant Access'}
                </button>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Role:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </form>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {permissionCheck && (
              <div className="mt-4 p-3 bg-blue-100 text-blue-700 rounded">
                <h3 className="font-bold text-lg mb-2">Permission Check Results</h3>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <strong>List:</strong> {permissionCheck.list.name}
                  </div>
                  <div>
                    <strong>Owner:</strong> {permissionCheck.list.created_by}
                  </div>
                </div>
                
                <div className="mb-2">
                  <strong>Permission Status:</strong>{' '}
                  {permissionCheck.permissions.canEdit ? (
                    <span className="text-green-600 font-bold">Has Edit Access ✓</span>
                  ) : (
                    <span className="text-red-600 font-bold">No Edit Access ✗</span>
                  )}
                </div>
                
                <div className="mb-2">
                  <strong>Details:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>
                      Owner Check: {permissionCheck.permissions.isOwner ? (
                        <span className="text-green-600">Pass ✓</span>
                      ) : (
                        <span className="text-red-600">Fail ✗</span>
                      )}
                    </li>
                    <li>
                      Shared Access: {permissionCheck.permissions.sharedAccess.exists ? (
                        <span>
                          {permissionCheck.permissions.sharedAccess.role === 'editor' ? (
                            <span className="text-green-600">Yes (Editor) ✓</span>
                          ) : (
                            <span className="text-yellow-600">Yes (Viewer) ⚠️</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-red-600">None ✗</span>
                      )}
                    </li>
                  </ul>
                </div>
                
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm">View Raw Data</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
                    {JSON.stringify(permissionCheck, null, 2)}
                  </pre>
                </details>
              </div>
            )}
            
            {dbCheck && (
              <div className="mt-4 p-3 bg-indigo-100 text-indigo-800 rounded">
                <h3 className="font-bold text-lg mb-2">Database Check Results</h3>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className={`p-2 rounded ${dbCheck.database_check?.lists?.exists ? 'bg-green-100' : 'bg-red-100'}`}>
                    <strong>Lists Table:</strong>{' '}
                    {dbCheck.database_check?.lists?.exists ? 'OK' : 'Missing'}
                  </div>
                  <div className={`p-2 rounded ${dbCheck.database_check?.users_lists?.exists ? 'bg-green-100' : 'bg-red-100'}`}>
                    <strong>Users Lists Table:</strong>{' '}
                    {dbCheck.database_check?.users_lists?.exists ? 'OK' : 'Missing'}
                  </div>
                  <div className={`p-2 rounded ${dbCheck.database_check?.grocery_item?.exists ? 'bg-green-100' : 'bg-red-100'}`}>
                    <strong>Grocery Items Table:</strong>{' '}
                    {dbCheck.database_check?.grocery_item?.exists ? 'OK' : 'Missing'}
                  </div>
                </div>
                
                <div className="mb-4">
                  <strong>Specific List Check:</strong>
                  {dbCheck.database_check?.specific_list?.found ? (
                    <div className="p-2 mt-1 bg-green-100 rounded">
                      <p>List found in database ✓</p>
                      <p><strong>Name:</strong> {dbCheck.database_check.specific_list.data.name}</p>
                      <p><strong>Owner:</strong> {dbCheck.database_check.specific_list.data.created_by}</p>
                    </div>
                  ) : (
                    <div className="p-2 mt-1 bg-red-100 rounded">
                      <p>List not found in database ✗</p>
                      <p><strong>Error:</strong> {dbCheck.database_check?.specific_list?.error}</p>
                      <button
                        onClick={fixList}
                        disabled={fixingList}
                        className={`mt-2 px-3 py-1 rounded text-white ${
                          fixingList ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'
                        }`}
                      >
                        {fixingList ? 'Fixing...' : 'Fix This List'}
                      </button>
                    </div>
                  )}
                </div>
                
                {dbCheck.list_fix_result && (
                  <div className="mb-4 p-2 bg-green-100 rounded">
                    <p className="font-bold text-green-700">
                      ✓ List fixed successfully!
                    </p>
                    <p>The list has been recreated with the same ID.</p>
                    <p>Please try adding items to it now.</p>
                  </div>
                )}
                
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm">View Raw Data</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
                    {JSON.stringify(dbCheck, null, 2)}
                  </pre>
                </details>
              </div>
            )}
            
            {result && (
              <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
                <p><strong>Result:</strong> {result.message}</p>
                <p><strong>Action:</strong> {result.action}</p>
                {result.list && (
                  <p><strong>List:</strong> {result.list.name} ({result.list.id})</p>
                )}
                {result.warning && (
                  <p className="text-yellow-600"><strong>Warning:</strong> {result.warning}</p>
                )}
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold mb-4">Troubleshooting Tools</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">Database Permissions</h3>
                <p className="text-sm text-gray-600 mb-4">
                  If you're having permission issues, try running this fix to update your database permissions.
                </p>
                <button
                  onClick={fixPermissions}
                  disabled={fixingPermissions}
                  className={`w-full p-2 rounded text-white ${
                    fixingPermissions ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {fixingPermissions ? 'Fixing Permissions...' : 'Fix Database Permissions'}
                </button>
                
                {permissionFixResult && (
                  <div className="mt-4 p-2 bg-green-100 text-green-800 rounded text-sm">
                    <p className="font-bold">✓ Permission fix attempt completed</p>
                    <details>
                      <summary className="cursor-pointer">View Results</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
                        {JSON.stringify(permissionFixResult, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
              
              <div className="p-4 border rounded bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">Fix List Structure</h3>
                <p className="text-sm text-gray-600 mb-4">
                  If a list exists but has structural issues, use this to recreate it with the same ID.
                </p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={listId}
                    onChange={(e) => setListId(e.target.value)}
                    placeholder="List ID to fix"
                    className="flex-1 p-2 border rounded"
                  />
                  <button
                    onClick={fixList}
                    disabled={fixingList || !listId}
                    className={`px-4 py-2 rounded text-white ${
                      fixingList || !listId ? 'bg-gray-400' : 'bg-yellow-500 hover:bg-yellow-600'
                    }`}
                  >
                    {fixingList ? 'Fixing...' : 'Fix List'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <a 
              href="/" 
              className="text-blue-500 hover:text-blue-700 underline"
            >
              Return to Home Page
            </a>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
} 