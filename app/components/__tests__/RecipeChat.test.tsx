import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeChat from '../RecipeChat';
import { GroceryItem } from '@/types/database';

// Mock data
const mockPurchasedItems: GroceryItem[] = [
  {
    id: '1',
    name: 'Chicken',
    status: 'purchased',
    list_id: 'list1',
    created_by: 'user1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Rice',
    status: 'purchased',
    list_id: 'list1',
    created_by: 'user1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('RecipeChat Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chat interface when open', () => {
    render(
      <RecipeChat
        purchasedItems={mockPurchasedItems}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Recipe Suggestions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/click 'get recipe suggestions'/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <RecipeChat
        purchasedItems={mockPurchasedItems}
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Recipe Suggestions')).not.toBeInTheDocument();
  });

  it('handles initial recipe request', async () => {
    render(
      <RecipeChat
        purchasedItems={mockPurchasedItems}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const sendButton = screen.getByRole('button', { name: /get recipe suggestions/i });
    await userEvent.click(sendButton);

    // Wait for the API call to complete
    await waitFor(() => {
      expect(screen.getByText(/successfully deployed/i)).toBeInTheDocument();
    });
  });

  it('handles follow-up questions', async () => {
    render(
      <RecipeChat
        purchasedItems={mockPurchasedItems}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // First, get initial recipe
    const sendButton = screen.getByRole('button', { name: /get recipe suggestions/i });
    await userEvent.click(sendButton);

    // Then, ask a follow-up question
    const input = screen.getByPlaceholderText(/ask a follow-up question/i);
    await userEvent.type(input, 'Can you make it vegetarian?');
    
    const followUpButton = screen.getByRole('button', { name: /send/i });
    await userEvent.click(followUpButton);

    await waitFor(() => {
      expect(screen.getByText('Can you make it vegetarian?')).toBeInTheDocument();
    });
  });

  it('handles close button click', async () => {
    render(
      <RecipeChat
        purchasedItems={mockPurchasedItems}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: /×/i });
    await userEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays loading state during API calls', async () => {
    render(
      <RecipeChat
        purchasedItems={mockPurchasedItems}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const sendButton = screen.getByRole('button', { name: /get recipe suggestions/i });
    await userEvent.click(sendButton);

    expect(screen.getByText(/generating recipe suggestions/i)).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    // Mock a failed API response
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('API Error'));

    render(
      <RecipeChat
        purchasedItems={mockPurchasedItems}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const sendButton = screen.getByRole('button', { name: /get recipe suggestions/i });
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/sorry, i had trouble/i)).toBeInTheDocument();
    });
  });
});