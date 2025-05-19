import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  
  // Add security and CORS headers
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Set proper Content Security Policy to allow Supabase connections
  res.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; frame-ancestors 'none'; upgrade-insecure-requests`
  );
  
  // Note: We don't need to create a Supabase client here unless we need to check session
  // Auth will be handled in the individual route handlers
  
  return res;
}

// Apply middleware to all routes except specific exclusions
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder contents)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 