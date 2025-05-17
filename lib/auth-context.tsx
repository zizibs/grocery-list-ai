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

  const signUp = async (email: string, password: string) => {
    try {
      console.log('Starting sign up process...', { email });
      
      // First check if we can reach Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        try {
          const response = await fetch(supabaseUrl);
          console.log('Supabase reachability check:', {
            status: response.status,
            ok: response.ok
          });
        } catch (error) {
          console.error('Cannot reach Supabase URL:', error);
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email_confirm_url: `${window.location.origin}/auth/callback`
          }
        }
      });
      
      console.log('Sign up response:', {
        success: !error,
        hasData: !!data,
        errorMessage: error?.message,
        timestamp: new Date().toISOString()
      });

      if (error) {
        console.error('Supabase sign up error:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack
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
        url: process.env.NEXT_PUBLIC_SUPABASE_URL
      });
      
      // Enhance the error message for network issues
      if (error instanceof Error && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to authentication service. Please check your internet connection and try again.');
      }
      
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      if (error instanceof Error && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to authentication service. Please check your internet connection and try again.');
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