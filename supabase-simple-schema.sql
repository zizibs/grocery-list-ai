-- Drop existing tables to start fresh
DROP TABLE IF EXISTS grocery_items CASCADE;
DROP TABLE IF EXISTS list_members CASCADE; 
DROP TABLE IF EXISTS grocery_lists CASCADE;

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables with simpler structure
CREATE TABLE grocery_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    share_code TEXT UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE list_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(list_id, user_id)
);

CREATE TABLE grocery_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    list_id UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'toBuy' CHECK (status IN ('toBuy', 'purchased')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
); -- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_grocery_items_updated_at
BEFORE UPDATE ON grocery_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

-- SIMPLE POLICIES FOR grocery_lists
-- 1. List owners can do anything with their lists
CREATE POLICY "List owners can manage their lists"
ON grocery_lists
USING (owner_id = auth.uid());

-- 2. Users can view lists they're members of
CREATE POLICY "Users can view lists they are members of"
ON grocery_lists FOR SELECT
USING (
    id IN (
        SELECT list_id FROM list_members
        WHERE user_id = auth.uid()
    )
); -- SIMPLE POLICIES FOR list_members
-- 1. List owners can manage members
CREATE POLICY "List owners can manage members"
ON list_members
USING (
    list_id IN (
        SELECT id FROM grocery_lists
        WHERE owner_id = auth.uid()
    )
);

-- 2. Users can view their own memberships
CREATE POLICY "Users can view their memberships"
ON list_members FOR SELECT
USING (user_id = auth.uid());

-- SIMPLE POLICIES FOR grocery_items
-- 1. Any authenticated user can view items in lists they have access to
CREATE POLICY "Users can view items in accessible lists"
ON grocery_items FOR SELECT
USING (
    list_id IN (
        SELECT id FROM grocery_lists WHERE owner_id = auth.uid()
        UNION
        SELECT list_id FROM list_members WHERE user_id = auth.uid()
    )
);

-- 2. List owners can do anything with items in their lists
CREATE POLICY "List owners can manage items in their lists"
ON grocery_items
USING (
    list_id IN (
        SELECT id FROM grocery_lists
        WHERE owner_id = auth.uid()
    )
);

-- 3. Members with edit permission can manage items
CREATE POLICY "Members with edit permission can manage items"
ON grocery_items
USING (
    list_id IN (
        SELECT list_id FROM list_members
        WHERE user_id = auth.uid()
        AND can_edit = true
    )
);

-- 4. Authenticated users can create items (will be further restricted by above policies)
CREATE POLICY "Authenticated users can create items"
ON grocery_items FOR INSERT
WITH CHECK (auth.role() = 'authenticated'); 

-- Grant permissions to authenticated users
GRANT ALL ON grocery_lists TO authenticated;
GRANT ALL ON list_members TO authenticated;
GRANT ALL ON grocery_items TO authenticated;
