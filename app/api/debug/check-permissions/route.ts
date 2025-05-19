import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({
            name,
            value,
            ...options,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
        },
        remove(name: string, options: any) {
          cookieStore.set({
            name,
            value: '',
            ...options,
            maxAge: -1,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
        },
      },
    }
  );
}

// Check a user's permissions for a specific list
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServer();
    const json = await request.json();
    const { userId, listId } = json;
    
    if (!userId || !listId) {
      return NextResponse.json({ error: 'userId and listId are required' }, { status: 400 });
    }
    
    // 1. Check if the list exists
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('id, name, created_by')
      .eq('id', listId)
      .single();
    
    if (listError) {
      return NextResponse.json({ 
        exists: false,
        error: 'List not found',
        details: listError.message
      }, { status: 404 });
    }
    
    // 2. Check if user is the owner
    const isOwner = list.created_by === userId;
    
    // 3. Check if user has shared access
    const { data: sharedAccess, error: sharedError } = await supabase
      .from('users_lists')
      .select('role')
      .eq('list_id', listId)
      .eq('user_id', userId)
      .maybeSingle();
    
    // 4. Check for nested queries permissions
    const { data: ownedListResult, error: ownedListError } = await supabase
      .from('lists')
      .select('id')
      .eq('id', listId)
      .eq('created_by', userId)
      .maybeSingle();
      
    const { data: sharedListResult, error: sharedListError } = await supabase
      .from('users_lists')
      .select('list_id, role')
      .eq('list_id', listId)
      .eq('user_id', userId)
      .eq('role', 'editor')
      .maybeSingle();
    
    // 5. Policy check - explicitly check the condition from the RLS policy
    const unionQuery = `
      SELECT id FROM lists WHERE id = '${listId}' AND created_by = '${userId}'
      UNION
      SELECT list_id FROM users_lists WHERE list_id = '${listId}' AND user_id = '${userId}' AND role = 'editor'
    `;
    
    let policyResult = null;
    let policyError = null;
    
    try {
      const response = await supabase.rpc(
        'execute_sql',
        { query: unionQuery }
      );
      policyResult = response.data;
      policyError = response.error;
    } catch (err) {
      policyError = { message: 'execute_sql function not available or failed' };
    }
    
    return NextResponse.json({
      listId,
      userId,
      list: {
        name: list.name,
        created_by: list.created_by
      },
      permissions: {
        exists: true,
        isOwner,
        sharedAccess: sharedAccess ? {
          exists: true,
          role: sharedAccess.role
        } : {
          exists: false
        },
        canEdit: isOwner || (sharedAccess?.role === 'editor'),
        policyChecks: {
          ownedListCheck: {
            passed: !!ownedListResult,
            error: ownedListError?.message
          },
          sharedListCheck: {
            passed: !!sharedListResult,
            error: sharedListError?.message
          },
          policyUnionQuery: {
            ran: !policyError,
            passed: Array.isArray(policyResult) && policyResult.length > 0,
            error: policyError?.message,
            result: policyResult
          }
        }
      }
    });
  } catch (error) {
    console.error('Error checking permissions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 