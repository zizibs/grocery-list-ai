import { Database } from './supabase';

export interface List {
  id: string;
  name: string;
  share_code: string;
  owner_id: string;
  created_at: string;
}

export type DatabaseList = Database['public']['Tables']['grocery_lists']['Row'];
export type DatabaseGroceryItem = Database['public']['Tables']['grocery_items']['Row'];
export type DatabaseListMember = Database['public']['Tables']['list_members']['Row'];

export interface GroceryItem {
  id: string;
  name: string;
  status: 'toBuy' | 'purchased';
  list_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ListMember {
  id: string;
  list_id: string;
  user_id: string;
  can_edit: boolean;
  created_at: string;
}

export interface Recipe {
  title: string;
  ingredients: string[];
} 