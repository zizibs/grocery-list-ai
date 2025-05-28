import { render, screen } from '@testing-library/react'
import Page from '../page'

describe('Home Page', () => {
  it('renders without crashing', () => {
    render(<Page />)
    // Add basic assertions based on your page content
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  // Add more specific tests based on your application's functionality
  it('displays the main heading', () => {
    render(<Page />)
    // Update this assertion based on your actual heading text
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })
}) 