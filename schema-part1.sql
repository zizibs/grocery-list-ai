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
); 