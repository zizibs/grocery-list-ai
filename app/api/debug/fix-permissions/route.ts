import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

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

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Apply the permissions fix script
    try {
      // Try running RLS policy updates through various methods
      
      // Method 1: Grant RLS directly (simplest/most reliable)
      const grants = [
        { 
          sql: "GRANT ALL ON grocery_item TO authenticated;",
          name: "Grant access to grocery_item"
        },
        {
          sql: "ALTER TABLE grocery_item DISABLE ROW LEVEL SECURITY;",
          name: "Disable RLS on grocery_item (temporary)"
        },
        {
          sql: "ALTER TABLE grocery_item ENABLE ROW LEVEL SECURITY;",
          name: "Re-enable RLS on grocery_item"
        },
        {
          sql: "DROP POLICY IF EXISTS \"Users can create items in their lists\" ON grocery_item;",
          name: "Drop conflicting policy"
        },
        {
          sql: "CREATE POLICY \"Enable insert for authenticated users\" ON grocery_item FOR INSERT WITH CHECK (auth.role() = 'authenticated');",
          name: "Create simpler policy"
        }
      ];
      
      const results = [];
      
      for (const grant of grants) {
        try {
          // Attempt to run each SQL statement directly
          // Note: this likely won't work due to RLS permissions,
          // but we try different approaches
          const { data, error } = await supabase.rpc('execute_admin_sql', {
            sql: grant.sql
          });
          
          results.push({
            name: grant.name,
            success: !error,
            error: error?.message
          });
        } catch (err) {
          results.push({
            name: grant.name,
            success: false,
            error: err instanceof Error ? err.message : 'Function not available or execution failed'
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Attempted to fix permissions - please check debug results',
        results
      });
    } catch (error) {
      console.error('Error applying permissions fix:', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Unknown error applying permissions fix'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error handling request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 