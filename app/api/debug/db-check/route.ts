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

// Database structure check
export async function GET(request: Request) {
  const supabase = await getSupabaseServer();
  const results: any = {};
  
  try {
    // Check for grocery_lists table
    try {
      const { data: lists, error: listsError } = await supabase
        .from('grocery_lists')
        .select('*')
        .limit(1);
      
      results.grocery_lists = {
        exists: !listsError,
        count: Array.isArray(lists) ? lists.length : 0,
        error: listsError?.message
      };
    } catch (err) {
      results.grocery_lists = {
        exists: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
    
    // Check for list_members table
    try {
      const { data: listMembers, error: listMembersError } = await supabase
        .from('list_members')
        .select('*')
        .limit(1);
      
      results.list_members = {
        exists: !listMembersError,
        count: Array.isArray(listMembers) ? listMembers.length : 0,
        error: listMembersError?.message
      };
    } catch (err) {
      results.list_members = {
        exists: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
    
    // Check for grocery_items table
    try {
      const { data: items, error: itemsError } = await supabase
        .from('grocery_items')
        .select('*')
        .limit(1);
      
      results.grocery_items = {
        exists: !itemsError,
        count: Array.isArray(items) ? items.length : 0,
        error: itemsError?.message
      };
    } catch (err) {
      results.grocery_items = {
        exists: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
    
    // Try to get specific list by ID
    const listId = request.url.includes('?list_id=') 
      ? new URL(request.url).searchParams.get('list_id')
      : '269dff84-2b70-4ade-a084-5452c650daeb'; // Default to the problematic list ID
    
    try {
      const { data: specificList, error: specificListError } = await supabase
        .from('grocery_lists')
        .select('*')
        .eq('id', listId)
        .maybeSingle();
      
      results.specific_list = {
        id: listId,
        found: !!specificList,
        data: specificList,
        error: specificListError?.message,
        errorCode: specificListError?.code
      };
    } catch (err) {
      results.specific_list = {
        id: listId,
        found: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
    
    // Test RLS is correctly configured by trying direct SQL
    try {
      // This requires a custom function in Supabase - may not exist
      const { data: directSql, error: directSqlError } = await supabase
        .rpc('db_info');
      
      results.db_info = {
        available: !directSqlError,
        data: directSql,
        error: directSqlError?.message
      };
    } catch (err) {
      results.db_info = {
        available: false,
        error: 'db_info function not available'
      };
    }

    // Check RLS configuration
    try {
      // This requires a custom function in Supabase - may not exist
      const { data: rlsCheck, error: rlsError } = await supabase
        .rpc('check_rls_config');
      
      results.rls_check = {
        available: !rlsError, 
        data: rlsCheck,
        error: rlsError?.message
      };
    } catch (err) {
      results.rls_check = {
        available: false,
        error: 'check_rls_config function not available'
      };
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database_check: results
    });
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      partial_results: results
    }, { status: 500 });
  }
}

// Fix a specific list by recreating it with the same ID
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const json = await request.json();
    const { listId, name } = json;
    
    if (!listId) {
      return NextResponse.json({ error: 'listId is required' }, { status: 400 });
    }
    
    const listName = name || 'Fixed List';
    
    // First try to delete the list if it exists but has issues
    try {
      await supabase
        .from('grocery_lists')
        .delete()
        .eq('id', listId);
    } catch (e) {
      // Ignore errors here, as the list might not exist
      console.log('Delete attempt result:', e);
    }
    
    // Create a new list with the same ID
    const { data, error } = await supabase
      .from('grocery_lists')
      .insert([
        {
          id: listId,
          name: listName,
          owner_id: session.user.id,
          share_code: Math.random().toString(36).substring(2, 8).toUpperCase()
        }
      ])
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'List fixed successfully',
      list: data
    });
  } catch (error) {
    console.error('Error fixing list:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 