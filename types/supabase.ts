export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      grocery_lists: {
        Row: {
          id: string
          name: string
          share_code: string
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          share_code: string
          owner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          share_code?: string
          owner_id?: string
          created_at?: string
        }
      }
      grocery_items: {
        Row: {
          id: string
          name: string
          status: string
          list_id: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: string
          list_id: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: string
          list_id?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      list_members: {
        Row: {
          id: string
          list_id: string
          user_id: string
          can_edit: boolean
          created_at: string
        }
        Insert: {
          id?: string
          list_id: string
          user_id: string
          can_edit?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          user_id?: string
          can_edit?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Types for application use
export interface List {
  id: string;
  name: string;
  share_code: string;
  owner_id: string;
  created_at: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  status: string;
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
  id: string;
  name: string;
  ingredients: string[];
  instructions: string;
} 