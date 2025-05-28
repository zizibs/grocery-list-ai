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
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth')
    })
  })

  it('shows grocery list interface when authenticated', async () => {
    // Mock the auth context to return a user
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id' },
      loading: false
    })

    await act(async () => {
      renderWithProviders(<Page />)
    })
    
    await waitFor(() => {
      // Check for list creation form
      expect(screen.getByPlaceholderText(/new list name/i)).toBeInTheDocument()
      // Check for item addition form
      expect(screen.getByPlaceholderText(/add item/i)).toBeInTheDocument()
    })
  })
}) 