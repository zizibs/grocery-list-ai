import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GroceryList from '../GroceryList';
import { GroceryItem } from '@/types/database';

// Mock data
const mockItems: GroceryItem[] = [
  {
    id: '1',
    name: 'Milk',
    status: 'toBuy',
    list_id: 'list1',
    created_by: 'user1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Bread',
    status: 'toBuy',
    list_id: 'list1',
    created_by: 'user1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('GroceryList Component', () => {
  const mockOnItemUpdate = jest.fn();
  const mockOnItemDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders grocery items correctly', () => {
    render(
      <GroceryList
        items={mockItems}
        onItemUpdate={mockOnItemUpdate}
        onItemDelete={mockOnItemDelete}
      />
    );

    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
  });

  it('handles item purchase toggle', async () => {
    render(
      <GroceryList
        items={mockItems}
        onItemUpdate={mockOnItemUpdate}
        onItemDelete={mockOnItemDelete}
      />
    );

    const purchaseButton = screen.getAllByRole('button', { name: /purchase/i })[0];
    await userEvent.click(purchaseButton);

    expect(mockOnItemUpdate).toHaveBeenCalledWith({
      ...mockItems[0],
      status: 'purchased',
    });
  });

  it('handles item deletion', async () => {
    render(
      <GroceryList
        items={mockItems}
        onItemUpdate={mockOnItemUpdate}
        onItemDelete={mockOnItemDelete}
      />
    );

    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
    await userEvent.click(deleteButton);

    expect(mockOnItemDelete).toHaveBeenCalledWith(mockItems[0].id);
  });

  it('displays empty state when no items', () => {
    render(
      <GroceryList
        items={[]}
        onItemUpdate={mockOnItemUpdate}
        onItemDelete={mockOnItemDelete}
      />
    );

    expect(screen.getByText(/no items/i)).toBeInTheDocument();
  });
});