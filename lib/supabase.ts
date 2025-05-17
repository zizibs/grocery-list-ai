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
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-v2',
      },
      fetch: (url, options = {}) => {
        const fetchOptions = {
          ...options,
          headers: {
            ...options.headers,
            'Access-Control-Allow-Origin': '*',
          },
        };
        return fetch(url, fetchOptions).then(async (response) => {
          if (!response.ok) {
            const error = await response.text();
            console.error('Supabase fetch error:', {
              status: response.status,
              statusText: response.statusText,
              error,
              url: url.toString(),
            });
          }
          return response;
        }).catch(error => {
          console.error('Network error:', {
            message: error.message,
            url: url.toString(),
          });
          throw error;
        });
      }
    }
  }
); 