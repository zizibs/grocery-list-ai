import { createClient } from '@supabase/supabase-js';

// Log environment variable status (but not the values)
console.log('Supabase Configuration Status:', {
  url: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
  key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
  environment: process.env.NODE_ENV
});

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-v2',
      },
      fetch: async (url, options = {}) => {
        const fetchOptions = {
          ...options,
          headers: {
            ...options.headers,
          },
          credentials: 'include' as const,
          mode: 'cors' as const,
        };

        try {
          const response = await fetch(url, fetchOptions);
          if (!response.ok) {
            const error = await response.text();
            console.error('Supabase fetch error:', {
              status: response.status,
              statusText: response.statusText,
              error,
              url: url.toString(),
              headers: Object.fromEntries(response.headers.entries()),
            });
          }
          return response;
        } catch (error) {
          console.error('Network error:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            url: url.toString(),
            options: {
              ...fetchOptions,
              headers: Object.fromEntries(Object.entries(fetchOptions.headers || {})),
            },
          });
          throw error;
        }
      }
    }
  }
); 