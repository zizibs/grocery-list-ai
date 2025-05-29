import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/app/__tests__/test-utils';
import GroceryItemForm from '@/app/components/GroceryItemForm';

describe('GroceryItemForm Component', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form correctly', () => {
    renderWithProviders(<GroceryItemForm onSubmit={mockOnSubmit} />);

    expect(screen.getByPlaceholderText(/enter item name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    renderWithProviders(<GroceryItemForm onSubmit={mockOnSubmit} />);

    const input = screen.getByPlaceholderText(/enter item name/i);
    const submitButton = screen.getByRole('button', { name: /add item/i });

    await userEvent.type(input, 'New Item');
    await userEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith('New Item');
    expect(input).toHaveValue('');
  });

  it('prevents submission with empty input', async () => {
    renderWithProviders(<GroceryItemForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /add item/i });
    await userEvent.click(submitButton);

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
}); 