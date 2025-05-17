-- Add missing columns to grocery_item table
ALTER TABLE "grocery_item" 
ADD COLUMN IF NOT EXISTS "list_id" UUID NOT NULL,
ADD COLUMN IF NOT EXISTS "created_by" UUID NOT NULL;

-- Add foreign key constraints
ALTER TABLE "grocery_item"
ADD CONSTRAINT "grocery_item_list_id_fkey" 
FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE,
ADD CONSTRAINT "grocery_item_created_by_fkey" 
FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE "grocery_item" ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Policy for inserting items: User must be the list owner or have access through users_lists
CREATE POLICY "can_insert_grocery_items" ON "grocery_item"
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "lists" l
    LEFT JOIN "users_lists" ul ON l.id = ul.list_id
    WHERE 
      l.id = grocery_item.list_id
      AND (
        l.created_by = auth.uid() 
        OR (ul.user_id = auth.uid() AND ul.role IN ('editor', 'viewer'))
      )
  )
);

-- Policy for viewing items: User must be the list owner or have access through users_lists
CREATE POLICY "can_view_grocery_items" ON "grocery_item"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "lists" l
    LEFT JOIN "users_lists" ul ON l.id = ul.list_id
    WHERE 
      l.id = grocery_item.list_id
      AND (
        l.created_by = auth.uid() 
        OR (ul.user_id = auth.uid() AND ul.role IN ('editor', 'viewer'))
      )
  )
);

-- Policy for updating items: User must be the list owner or have editor access
CREATE POLICY "can_update_grocery_items" ON "grocery_item"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "lists" l
    LEFT JOIN "users_lists" ul ON l.id = ul.list_id
    WHERE 
      l.id = grocery_item.list_id
      AND (
        l.created_by = auth.uid() 
        OR (ul.user_id = auth.uid() AND ul.role = 'editor')
      )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM "lists" l
    LEFT JOIN "users_lists" ul ON l.id = ul.list_id
    WHERE 
      l.id = grocery_item.list_id
      AND (
        l.created_by = auth.uid() 
        OR (ul.user_id = auth.uid() AND ul.role = 'editor')
      )
  )
);

-- Policy for deleting items: User must be the list owner or have editor access
CREATE POLICY "can_delete_grocery_items" ON "grocery_item"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM "lists" l
    LEFT JOIN "users_lists" ul ON l.id = ul.list_id
    WHERE 
      l.id = grocery_item.list_id
      AND (
        l.created_by = auth.uid() 
        OR (ul.user_id = auth.uid() AND ul.role = 'editor')
      )
  )
); 