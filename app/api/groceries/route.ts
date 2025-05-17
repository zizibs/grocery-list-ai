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

async function verifyAuth(request: Request) {
  const supabase = await getSupabaseServer();
  
  // First try to get session from cookies
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (session) {
    return { user: session.user, supabase };
  }

  // If no session in cookies, check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No valid authorization found');
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    throw new Error('Invalid authorization token');
  }

  return { user, supabase };
}

export async function GET(request: Request) {
  try {
    const { user, supabase } = await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'toBuy';
    const list_id = searchParams.get('list_id');
    
    if (!list_id) {
      throw new Error('list_id is required');
    }

    const { data, error } = await supabase
      .from('grocery_item')
      .select('*')
      .eq('status', status)
      .eq('list_id', list_id)
      .order('created_at', { ascending: false });

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

export async function POST(request: Request) {
  try {
    const { user, supabase } = await verifyAuth(request);
    const json = await request.json();

    if (!json.list_id) {
      return NextResponse.json({ error: 'list_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('grocery_item')
      .insert([
        {
          name: json.name,
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
    const { user, supabase } = await verifyAuth(request);
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
    const { user, supabase } = await verifyAuth(request);
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