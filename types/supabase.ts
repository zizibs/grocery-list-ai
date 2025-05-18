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
      lists: {
        Row: {
          id: string
          name: string
          share_code: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          share_code: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          share_code?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      grocery_item: {
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
      users_lists: {
        Row: {
          user_id: string
          list_id: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          list_id: string
          role?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          list_id?: string
          role?: string
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