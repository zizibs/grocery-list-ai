-- This script specifically focuses on fixing the permissions issue with grocery_item table

-- First, drop existing policies on the grocery_item table
DROP POLICY IF EXISTS "Enable all access" ON grocery_item;
DROP POLICY IF EXISTS "Users can view items in their lists" ON grocery_item;
DROP POLICY IF EXISTS "Users can manage items in their lists" ON grocery_item;
DROP POLICY IF EXISTS "can_insert_grocery_items" ON grocery_item;
DROP POLICY IF EXISTS "can_view_grocery_items" ON grocery_item;
DROP POLICY IF EXISTS "can_update_grocery_items" ON grocery_item;
DROP POLICY IF EXISTS "can_delete_grocery_items" ON grocery_item;
DROP POLICY IF EXISTS "Users can create items in their lists" ON grocery_item;
DROP POLICY IF EXISTS "Users can update items in their lists" ON grocery_item;
DROP POLICY IF EXISTS "Users can delete items in their lists" ON grocery_item;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON grocery_item;

-- 1. First, make sure Supabase schema permissions are correct
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;

-- 2. Grant ALL permissions to the authenticated role for the grocery_item table specifically
GRANT ALL ON grocery_item TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 3. Make sure the service_role has all permissions as well
GRANT ALL ON grocery_item TO service_role;

-- 4. Temporarily disable RLS to test basic permissions
ALTER TABLE grocery_item DISABLE ROW LEVEL SECURITY;

-- 5. Add a policy that allows all actions for authenticated users (we can refine later)
CREATE POLICY "Enable all access for authenticated users"
ON grocery_item
USING (auth.role() = 'authenticated');

-- 6. Re-enable RLS
ALTER TABLE grocery_item ENABLE ROW LEVEL SECURITY;

-- 7. Create a specific INSERT policy
CREATE POLICY "Allow all inserts for authenticated users"
ON grocery_item
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 8. Create a specific UPDATE policy
CREATE POLICY "Allow all updates for authenticated users"
ON grocery_item
FOR UPDATE
USING (auth.role() = 'authenticated');

-- 9. Create a specific DELETE policy
CREATE POLICY "Allow all deletes for authenticated users"
ON grocery_item
FOR DELETE
USING (auth.role() = 'authenticated');

-- 10. Create a specific SELECT policy
CREATE POLICY "Allow all selects for authenticated users"
ON grocery_item
FOR SELECT
USING (auth.role() = 'authenticated'); 