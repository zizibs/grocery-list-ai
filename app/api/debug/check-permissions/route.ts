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
      .from('grocery_lists')
      .select('id, name, owner_id')
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
    const isOwner = list.owner_id === userId;
    
    // 3. Check if user has shared access
    const { data: sharedAccess, error: sharedError } = await supabase
      .from('list_members')
      .select('can_edit')
      .eq('list_id', listId)
      .eq('user_id', userId)
      .maybeSingle();
    
    // 4. Check for nested queries permissions
    const { data: ownedListResult, error: ownedListError } = await supabase
      .from('grocery_lists')
      .select('id')
      .eq('id', listId)
      .eq('owner_id', userId)
      .maybeSingle();
      
    const { data: sharedListResult, error: sharedListError } = await supabase
      .from('list_members')
      .select('list_id, can_edit')
      .eq('list_id', listId)
      .eq('user_id', userId)
      .eq('can_edit', true)
      .maybeSingle();
    
    // 5. Policy check - explicitly check the condition from the RLS policy
    const unionQuery = `
      SELECT id FROM grocery_lists WHERE id = '${listId}' AND owner_id = '${userId}'
      UNION
      SELECT list_id FROM list_members WHERE list_id = '${listId}' AND user_id = '${userId}' AND can_edit = true
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
        owner_id: list.owner_id
      },
      permissions: {
        exists: true,
        isOwner,
        sharedAccess: sharedAccess ? {
          exists: true,
          can_edit: sharedAccess.can_edit
        } : {
          exists: false
        },
        canEdit: isOwner || (sharedAccess?.can_edit === true),
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