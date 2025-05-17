'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  // Check if environment variables are set and test Supabase connection
  useEffect(() => {
    const checkConnection = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError('Supabase configuration is missing. Please check environment variables.');
        console.error('Missing env vars:', {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
        });
        return;
      }

      try {
        // Test the connection using a more reliable method
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        console.log('Supabase connection successful', data);
      } catch (err) {
        console.error('Supabase connection test failed:', err);
        setError('Failed to connect to Supabase. Check console for details.');
      }
    };

    checkConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isSignUp) {
        console.log('Attempting sign up...');
        await signUp(email, password);
        alert('Check your email for the confirmation link!');
      } else {
        console.log('Attempting sign in...');
        await signIn(email, password);
        router.push('/');
      }
    } catch (error) {
      console.error('Auth error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An error occurred during authentication. Please try again.');
      }
      // Log the full error object for debugging
      console.error('Full error object:', JSON.stringify(error, null, 2));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
        ) : (
          <div className="text-center text-red-600">
            Authentication is not configured. Please contact the administrator.
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Connected to Supabase' : 'Not connected to Supabase'}
        </div>
      </div>
    </div>
  );
} 