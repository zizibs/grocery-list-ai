import '@testing-library/jest-dom'
import { screen } from '@testing-library/react'
import { jest, describe, expect, it } from '@jest/globals'
import Page from '../page'
import { renderWithProviders } from './test-utils'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock the auth context
jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: null,
    loading: true
  })
}))

describe('Home Page', () => {
  it('renders without crashing', () => {
    renderWithProviders(<Page />)
    expect(document.body).toBeInTheDocument()
  })
}) 