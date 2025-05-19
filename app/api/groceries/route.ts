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
      .from('grocery_item')
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

    const { data, error } = await supabase
      .from('grocery_item')
      .insert([
        {
          name: validation.sanitizedValue,
        status: 'toBuy',
          list_id: json.list_id,
          created_by: user.id
        }
      ])
      .select()
      .single();

    if (error) throw error;
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

    const { data, error } = await supabase
      .from('grocery_item')
      .update({ status: json.status })
      .eq('id', json.id)
      .select()
      .single();

    if (error) throw error;
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

export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await verifyAuthWithBearer(request);
    const json = await request.json();

    const { error } = await supabase
      .from('grocery_item')
      .delete()
      .eq('id', json.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    const status = error instanceof Error && error.message.includes('authorization') ? 401 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status }
    );
  }
} 