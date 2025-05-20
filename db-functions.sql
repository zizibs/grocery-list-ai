-- Create Supabase functions for updating and deleting grocery items
-- These functions will be called by the API and will bypass RLS

-- Function to update grocery item status
CREATE OR REPLACE FUNCTION update_grocery_item(item_id UUID, new_status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This means the function runs with the privileges of the creator
SET search_path = public
AS $$
BEGIN
  UPDATE grocery_items
  SET status = new_status
  WHERE id = item_id;
  
  RETURN FOUND;
END;
$$;

-- Function to delete a grocery item
CREATE OR REPLACE FUNCTION delete_grocery_item(item_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This means the function runs with the privileges of the creator
SET search_path = public
AS $$
BEGIN
  DELETE FROM grocery_items
  WHERE id = item_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execution privileges to authenticated users
GRANT EXECUTE ON FUNCTION update_grocery_item(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_grocery_item(UUID) TO authenticated; 