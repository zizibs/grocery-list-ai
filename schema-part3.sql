-- SIMPLE POLICIES FOR list_members
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

