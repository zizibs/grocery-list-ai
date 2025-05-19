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

// Update a user's permission (can_edit) in a shared list
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const json = await request.json();
    const { user_id, can_edit } = json;
    
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }
    
    if (typeof can_edit !== 'boolean') {
      return NextResponse.json({ error: 'can_edit boolean value is required' }, { status: 400 });
    }
    
    const listId = params.id;
    
    // First check if the requesting user is the owner of the list
    const { data: listData, error: listError } = await supabase
      .from('grocery_lists')
      .select('owner_id')
      .eq('id', listId)
      .single();
    
    if (listError) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }
    
    if (listData.owner_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the list owner can update user permissions' },
        { status: 403 }
      );
    }
    
    // Update the user's permission in the list
    const { data, error } = await supabase
      .from('list_members')
      .update({ can_edit })
      .eq('list_id', listId)
      .eq('user_id', user_id)
      .select();
    
    if (error) {
      console.error('Error updating permission:', error);
      return NextResponse.json({ error: 'Failed to update user permission' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 