import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/app/__tests__/test-utils';
import GroceryItem from '@/app/components/GroceryItem';
import { GroceryItem as GroceryItemType } from '@/types/database';

describe('GroceryItem Component', () => {
  const mockItem: GroceryItemType = {
    id: '1',
    name: 'Test Item',
    status: 'toBuy',
    list_id: 'list1',
    created_by: 'user1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders item correctly', () => {
    renderWithProviders(
      <GroceryItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /purchase/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('handles purchase toggle', async () => {
    renderWithProviders(
      <GroceryItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    const purchaseButton = screen.getByRole('button', { name: /purchase/i });
    await userEvent.click(purchaseButton);

    expect(mockOnUpdate).toHaveBeenCalledWith({
      ...mockItem,
      status: 'purchased',
    });
  });

  it('handles item deletion', async () => {
    renderWithProviders(
      <GroceryItem
        item={mockItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await userEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockItem.id);
  });

  it('displays purchased state correctly', () => {
    const purchasedItem = { ...mockItem, status: 'purchased' };
    
    renderWithProviders(
      <GroceryItem
        item={purchasedItem}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Item')).toHaveClass('line-through');
    expect(screen.getByRole('button', { name: /purchase/i })).toHaveClass('bg-green-500');
  });
}); 