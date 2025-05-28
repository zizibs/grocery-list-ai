import '@testing-library/jest-dom'
import { screen, waitFor, act } from '@testing-library/react'
import { jest, describe, expect, it, beforeEach } from '@jest/globals'
import Page from '../page'
import { renderWithProviders } from './test-utils'

// Mock next/navigation
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock the auth context
const mockUseAuth = jest.fn()
jest.mock('@/lib/auth-context', () => ({
  useAuth: () => mockUseAuth()
}))

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } })
    }
  }
}))

describe('Home Page', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    // Default auth state
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true
    })
  })

  it('shows loading spinner initially', async () => {
    await act(async () => {
      renderWithProviders(<Page />)
    })
    
    // Check for the loading spinner by its class
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('redirects to auth page when not authenticated', async () => {
    // Mock the auth context to return no user
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false
    })
    
    await act(async () => {
      renderWithProviders(<Page />)
    })
    
    // Wait for the redirect to happen
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth')
    }, { timeout: 2000 })
  })

  it('shows grocery list interface when authenticated', async () => {
    // Mock the auth context to return a user
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id' },
      loading: false
    })

    // Mock successful list fetch
    const mockSupabase = require('@/lib/supabase').supabase
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null })
    }))

    await act(async () => {
      renderWithProviders(<Page />)
    })
    
    // Wait for the interface to load
    await waitFor(() => {
      // Check for list creation form
      expect(screen.getByPlaceholderText(/new list name/i)).toBeInTheDocument()
      // Check for item addition form
      expect(screen.getByPlaceholderText(/add item/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })
}) 