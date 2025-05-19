-- Add updated_at trigger
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
); 