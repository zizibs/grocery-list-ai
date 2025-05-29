import { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { AuthProvider } from '@/lib/auth-context'

// Mock Supabase auth
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      }),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  }),
}))

export function renderWithProviders(ui: ReactNode) {
  return render(
    <AuthProvider>
      {ui}
    </AuthProvider>
  )
} 