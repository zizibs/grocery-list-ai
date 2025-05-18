import { Database } from '@supabase/supabase-js';

export interface List {
  id: string;
  name: string;
  share_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type DatabaseList = Database['public']['Tables']['lists']['Row'];
export type DatabaseGroceryItem = Database['public']['Tables']['grocery_item']['Row'];
export type DatabaseUsersList = Database['public']['Tables']['users_lists']['Row'];

export interface GroceryItem {
  id: string;
  name: string;
  status: 'toBuy' | 'purchased';
  list_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UsersList {
  user_id: string;
  list_id: string;
  role: 'viewer' | 'editor';
  created_at: string;
}

export interface Recipe {
  title: string;
  ingredients: string[];
} 