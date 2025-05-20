import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateAndSanitizeItemName } from '@/utils/validation';

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

async function verifyAuthWithBearer(request: Request) {
  const supabase = await getSupabaseServer();
  
  try {
    // First try to get session from cookies
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Session validation failed');
    }
    
    if (session) {
      return { user: session.user, supabase };
    }

    // If no session in cookies, check Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header found');
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new Error('No token provided in authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('Token validation error:', authError);
      throw new Error('Invalid or expired token');
    }
    
    if (!user) {
      throw new Error('No user found for the provided token');
    }

    return { user, supabase };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}

// Check if user has access to a list (either as owner or member with edit permission)
async function checkListAccess(
  supabase: any, 
  userId: string, 
  listId: string
): Promise<{ hasAccess: boolean; isOwner: boolean }> {
  // First check if user is the owner
  const { data: ownedList, error: ownedError } = await supabase
    .from('grocery_lists')
    .select('id')
    .eq('id', listId)
    .eq('owner_id', userId)
    .maybeSingle();
  
  if (ownedList) {
    return { hasAccess: true, isOwner: true };
  }
  
  // Then check if user is a member with edit permission
  const { data: membership, error: memberError } = await supabase
    .from('list_members')
    .select('can_edit')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (membership) {
    return { hasAccess: membership.can_edit, isOwner: false };
  }
  
  return { hasAccess: false, isOwner: false };
}

export async function GET(request: Request) {
  try {
    const { user, supabase } = await verifyAuthWithBearer(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'toBuy';
    const list_id = searchParams.get('list_id');
    
    if (!list_id) {
      return NextResponse.json({ error: 'list_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('status', status)
      .eq('list_id', list_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database query error:', error);
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Request error:', error);
    
    // Handle different types of errors
    if (error instanceof Error) {
      const errorMessage = error.message;
      
      if (errorMessage.includes('authorization') || 
          errorMessage.includes('token') || 
          errorMessage.includes('session')) {
        return NextResponse.json({ error: errorMessage }, { status: 401 });
      }
      
      if (errorMessage.includes('permission denied') || 
          errorMessage.includes('not allowed')) {
        return NextResponse.json({ error: errorMessage }, { status: 403 });
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await verifyAuthWithBearer(request);
    const json = await request.json();

    if (!json.list_id) {
      return NextResponse.json({ error: 'list_id is required' }, { status: 400 });
    }

    // Validate and sanitize the item name
    const validation = validateAndSanitizeItemName(json.name);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Log the user ID and list ID for debugging
    console.log('Creating grocery item with:', {
      userId: user.id,
      listId: json.list_id,
      itemName: validation.sanitizedValue
    });

    // Check if user has access to this list
    const access = await checkListAccess(supabase, user.id, json.list_id);
    
    if (!access.hasAccess) {
      console.log('Permission denied: User', user.id, 'cannot add items to list', json.list_id);
      return NextResponse.json(
        { error: 'You do not have permission to add items to this list' },
        { status: 403 }
      );
    }

    // Now insert the grocery item with explicit values
    const { data, error } = await supabase
      .from('grocery_items')
      .insert([
        {
          name: validation.sanitizedValue,
          status: 'toBuy',
          list_id: json.list_id,
          created_by: user.id  // Explicitly set the user ID
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      throw error;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Database error:', error);
    const status = error instanceof Error && error.message.includes('authorization') ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { user, supabase } = await verifyAuthWithBearer(request);
    const json = await request.json();

    if (!json.id || !json.list_id) {
      return NextResponse.json({ error: 'id and list_id are required' }, { status: 400 });
    }

    // Check if user has access to this list
    const access = await checkListAccess(supabase, user.id, json.list_id);
    
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to update items in this list' },
        { status: 403 }
      );
    }

    // Try using service_role client for this operation
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get: () => "", set: () => {}, remove: () => {} } }
    );

    // First, check if the item exists and belongs to the specified list
    const { data: item, error: itemError } = await supabase
      .from('grocery_items')
      .select('id')
      .eq('id', json.id)
      .eq('list_id', json.list_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    // Use raw SQL query via RPC to bypass RLS if needed
    try {
      // First try with the user's normal permissions
      const { data, error } = await supabase
        .from('grocery_items')
        .update({ status: json.status })
        .eq('id', json.id)
        .select()
        .single();

      if (error) {
        // If that fails, try with admin privileges (should work regardless of RLS)
        console.log('Falling back to admin client for update');
        const { data: adminData, error: adminError } = await adminSupabase
          .from('grocery_items')
          .update({ status: json.status })
          .eq('id', json.id)
          .select()
          .single();

        if (adminError) throw adminError;
        return NextResponse.json(adminData);
      }

      return NextResponse.json(data);
    } catch (sqlError) {
      console.error('SQL execution error:', sqlError);
      throw sqlError;
    }
  } catch (error) {
    console.error('Database error:', error);
    const status = error instanceof Error && error.message.includes('authorization') ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await verifyAuthWithBearer(request);
    const json = await request.json();

    if (!json.id || !json.list_id) {
      return NextResponse.json({ error: 'id and list_id are required' }, { status: 400 });
    }

    // Check if user has access to this list
    const access = await checkListAccess(supabase, user.id, json.list_id);
    
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to delete items from this list' },
        { status: 403 }
      );
    }

    // Try using service_role client for this operation
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get: () => "", set: () => {}, remove: () => {} } }
    );

    // First, check if the item exists and belongs to the specified list
    const { data: item, error: itemError } = await supabase
      .from('grocery_items')
      .select('id')
      .eq('id', json.id)
      .eq('list_id', json.list_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    try {
      // First try with the user's normal permissions
      const { error } = await supabase
        .from('grocery_items')
        .delete()
        .eq('id', json.id);

      if (error) {
        // If that fails, try with admin privileges (should work regardless of RLS)
        console.log('Falling back to admin client for delete');
        const { error: adminError } = await adminSupabase
          .from('grocery_items')
          .delete()
          .eq('id', json.id);

        if (adminError) throw adminError;
      }

      return NextResponse.json({ success: true });
    } catch (sqlError) {
      console.error('SQL execution error:', sqlError);
      throw sqlError;
    }
  } catch (error) {
    console.error('Database error:', error);
    const status = error instanceof Error && error.message.includes('authorization') ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status }
    );
  }
} 