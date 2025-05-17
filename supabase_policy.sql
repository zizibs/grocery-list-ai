-- First, drop all policies in the correct order (dependent policies first)
-- Drop grocery_item policies
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

-- Drop lists policies that depend on users_lists
DROP POLICY IF EXISTS "Users can view shared lists" ON lists;
DROP POLICY IF EXISTS "Users can view their own lists and shared lists" ON lists;
DROP POLICY IF EXISTS "Enable read access for users who created the list or are shared with" ON lists;

-- Drop remaining lists policies
DROP POLICY IF EXISTS "Users can create lists" ON lists;
DROP POLICY IF EXISTS "lists_access_policy" ON lists;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON lists;
DROP POLICY IF EXISTS "Enable update for list creators" ON lists;
DROP POLICY IF EXISTS "Users can view their own lists" ON lists;
DROP POLICY IF EXISTS "List owners can update their lists" ON lists;
DROP POLICY IF EXISTS "List owners can delete their lists" ON lists;

-- Drop users_lists policies
DROP POLICY IF EXISTS "Users can view their list memberships" ON users_lists;
DROP POLICY IF EXISTS "List owners can manage sharing" ON users_lists;
DROP POLICY IF EXISTS "users_lists_access_policy" ON users_lists;
DROP POLICY IF EXISTS "Enable read access for shared users" ON users_lists;
DROP POLICY IF EXISTS "Enable insert for list creators" ON users_lists;
DROP POLICY IF EXISTS "Users can view their list associations" ON users_lists;
DROP POLICY IF EXISTS "List owners can share their lists" ON users_lists;
DROP POLICY IF EXISTS "List owners can update sharing settings" ON users_lists;
DROP POLICY IF EXISTS "List owners can remove sharing" ON users_lists;

-- Drop and recreate tables in the correct order (due to foreign key dependencies)
DROP TABLE IF EXISTS grocery_item CASCADE;
DROP TABLE IF EXISTS users_lists CASCADE;
DROP TABLE IF EXISTS lists CASCADE;

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables with the correct structure
CREATE TABLE lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    share_code TEXT UNIQUE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE users_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    list_id UUID REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, list_id)
);

CREATE TABLE grocery_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'toBuy' CHECK (status IN ('toBuy', 'purchased')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_lists_updated_at ON lists;
CREATE TRIGGER update_lists_updated_at
    BEFORE UPDATE ON lists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grocery_item_updated_at ON grocery_item;
CREATE TRIGGER update_grocery_item_updated_at
    BEFORE UPDATE ON grocery_item
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_item ENABLE ROW LEVEL SECURITY;

-- Create new policies for lists
CREATE POLICY "Users can view their own lists"
ON lists FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can view shared lists"
ON lists FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users_lists
        WHERE list_id = id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create lists"
ON lists FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "List owners can update their lists"
ON lists FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "List owners can delete their lists"
ON lists FOR DELETE
USING (auth.uid() = created_by);

-- Create new policies for users_lists
CREATE POLICY "Users can view their list associations"
ON users_lists FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "List owners can share their lists"
ON users_lists FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM lists
        WHERE id = list_id
        AND created_by = auth.uid()
    )
);

CREATE POLICY "List owners can update sharing settings"
ON users_lists FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM lists
        WHERE id = list_id
        AND created_by = auth.uid()
    )
);

CREATE POLICY "List owners can remove sharing"
ON users_lists FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM lists
        WHERE id = list_id
        AND created_by = auth.uid()
    )
);

-- Create new policies for grocery_item
CREATE POLICY "Users can view items in their lists"
ON grocery_item FOR SELECT
USING (
    list_id IN (
        SELECT id FROM lists WHERE created_by = auth.uid()
        UNION
        SELECT list_id FROM users_lists WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create items in their lists"
ON grocery_item FOR INSERT
WITH CHECK (
    list_id IN (
        SELECT id FROM lists WHERE created_by = auth.uid()
        UNION
        SELECT list_id FROM users_lists WHERE user_id = auth.uid() AND role = 'editor'
    )
    AND auth.uid() = created_by
);

CREATE POLICY "Users can update items in their lists"
ON grocery_item FOR UPDATE
USING (
    list_id IN (
        SELECT id FROM lists WHERE created_by = auth.uid()
        UNION
        SELECT list_id FROM users_lists WHERE user_id = auth.uid() AND role = 'editor'
    )
);

CREATE POLICY "Users can delete items in their lists"
ON grocery_item FOR DELETE
USING (
    list_id IN (
        SELECT id FROM lists WHERE created_by = auth.uid()
        UNION
        SELECT list_id FROM users_lists WHERE user_id = auth.uid() AND role = 'editor'
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "grocery_item_list_id_idx" ON grocery_item(list_id);
CREATE INDEX IF NOT EXISTS "grocery_item_created_by_idx" ON grocery_item(created_by);
CREATE INDEX IF NOT EXISTS "lists_created_by_idx" ON lists(created_by);
CREATE INDEX IF NOT EXISTS "users_lists_user_id_idx" ON users_lists(user_id);
CREATE INDEX IF NOT EXISTS "users_lists_list_id_idx" ON users_lists(list_id);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Revoke permissions from anon users (they should only be able to sign up/in)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE USAGE ON SCHEMA public FROM anon; 