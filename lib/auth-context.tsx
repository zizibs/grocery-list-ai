'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Get the site URL for redirect
  const getSiteUrl = () => {
    let url = process.env.NEXT_PUBLIC_SITE_URL;
    // When deploying to production, we should have NEXT_PUBLIC_SITE_URL set
    if (!url) {
      // Fallback for development/preview deployments
      url = window.location.origin;
    }
    // Ensure URL has no trailing slash
    return url.replace(/\/$/, '');
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session check error:', error);
        }
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const testSupabaseConnection = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Testing Supabase connection...', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      url: supabaseUrl?.substring(0, 20) + '...' // Log part of the URL safely
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration:', {
        url: !supabaseUrl ? 'Missing URL' : 'URL present',
        key: !supabaseKey ? 'Missing key' : 'Key present'
      });
      throw new Error('Supabase configuration is incomplete');
    }

    try {
      // First try a direct auth check
      const { data, error } = await supabase.auth.getSession();
      console.log('Auth check result:', {
        success: !error,
        hasSession: !!data.session,
        error: error?.message
      });

      if (error) {
        console.error('Auth check failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Connection test failed:', {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : 'Unknown error',
        supabaseUrl: supabaseUrl?.substring(0, 20) + '...' // Log part of the URL safely
      });
      return false;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const siteUrl = getSiteUrl();
      console.log('Starting sign up process...', { 
        email,
        redirectTo: `${siteUrl}/auth/callback`,
        supabaseConfigured: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL
        }
      });
      
      // Test connection before attempting sign up
      const isConnected = await testSupabaseConnection();
      if (!isConnected) {
        throw new Error('Cannot establish connection to authentication service');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          data: {
            email_confirm_url: `${siteUrl}/auth/callback`
          }
        }
      });
      
      console.log('Sign up response:', {
        success: !error,
        hasData: !!data,
        errorMessage: error?.message,
        timestamp: new Date().toISOString(),
        redirectUrl: `${siteUrl}/auth/callback`
      });

      if (error) {
        console.error('Supabase sign up error:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack,
          redirectUrl: `${siteUrl}/auth/callback`
        });
        throw error;
      }

      if (!data.user) {
        throw new Error('Sign up successful but no user returned');
      }
    } catch (error) {
      console.error('Sign up process error:', {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : 'Unknown error type',
        timestamp: new Date().toISOString(),
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...' // Log part of the URL safely
      });
      
      if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
          throw new Error('Unable to connect to authentication service. Please check your internet connection and try again.');
        } else if (error.message.includes('health check failed')) {
          throw new Error('Authentication service is currently unavailable. Please try again later.');
        } else if (error.message.includes('Cannot establish connection')) {
          throw new Error('Cannot connect to authentication service. Please try again later.');
        } else if (error.message.includes('configuration is incomplete')) {
          throw new Error('Authentication service is not properly configured. Please contact support.');
        }
      }
      
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Test connection before attempting sign in
      const isConnected = await testSupabaseConnection();
      if (!isConnected) {
        throw new Error('Cannot establish connection to authentication service');
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
          throw new Error('Unable to connect to authentication service. Please check your internet connection and try again.');
        } else if (error.message.includes('health check failed')) {
          throw new Error('Authentication service is currently unavailable. Please try again later.');
        } else if (error.message.includes('Cannot establish connection')) {
          throw new Error('Cannot connect to authentication service. Please try again later.');
        }
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 