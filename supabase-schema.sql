-- Fix permissions for grocery_items table

-- 1. Make sure RLS is disabled on grocery_items
ALTER TABLE grocery_items DISABLE ROW LEVEL SECURITY;

-- 2. Grant ALL permissions on grocery_items to authenticated users
GRANT ALL PRIVILEGES ON grocery_items TO authenticated;

-- 3. Add specific grants for the operations that are failing
GRANT UPDATE ON grocery_items TO authenticated;
GRANT DELETE ON grocery_items TO authenticated;

-- 4. Make sure grocery_items_id_seq can be used by authenticated users (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'grocery_items_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE grocery_items_id_seq TO authenticated;
  END IF;
END
$$;

-- 5. Grant usage on all sequences in the public schema
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Try to list all tables and sequences to make sure permissions are consistent
GRANT SELECT ON pg_catalog.pg_tables TO authenticated;
GRANT SELECT ON pg_catalog.pg_sequences TO authenticated;

-- 7. Make sure the service role (used by the Supabase client) has all permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 8. Ensure the anon role has necessary read permissions
GRANT SELECT ON grocery_items TO anon;
GRANT SELECT ON grocery_lists TO anon;
GRANT SELECT ON list_members TO anon;


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