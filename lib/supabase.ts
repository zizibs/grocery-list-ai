import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log environment variable status (but not the values)
console.log('Supabase Configuration Status:', {
  url: !!supabaseUrl ? 'Set' : 'Missing',
  key: !!supabaseAnonKey ? 'Set' : 'Missing',
  environment: process.env.NODE_ENV
});

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? localStorage : {
        getItem: (key) => {
          return null;
        },
        setItem: (key, value) => {},
        removeItem: (key) => {},
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-v2',
      },
    },
  }
);

// Add a function to help check authentication status
export const isAuthenticated = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Auth session check error:', error);
      return false;
    }
    return !!session?.user;
  } catch (err) {
    console.error('Auth check failed:', err);
    return false;
  }
}; 