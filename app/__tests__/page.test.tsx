import '@testing-library/jest-dom'
import { screen, waitFor } from '@testing-library/react'
import { jest, describe, expect, it } from '@jest/globals'
import Page from '../page'
import { renderWithProviders } from './test-utils'
import { useAuth } from '@/lib/auth-context'

// Mock the auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: jest.fn()
}))

describe('Home Page', () => {
  it('renders without crashing', async () => {
    renderWithProviders(<Page />)
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', () => {
    renderWithProviders(<Page />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('handles unauthenticated state', async () => {
    renderWithProviders(<Page />)
    await waitFor(() => {
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })
  })

  it('shows grocery list interface when authenticated', async () => {
    // Mock the auth context to return a user
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id' },
      loading: false
    })

    renderWithProviders(<Page />)
    
    await waitFor(() => {
      // Check for list creation form
      expect(screen.getByPlaceholderText(/new list name/i)).toBeInTheDocument()
      // Check for item addition form
      expect(screen.getByPlaceholderText(/add item/i)).toBeInTheDocument()
    })
  })
}) 