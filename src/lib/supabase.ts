import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client for browser/frontend operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Admin client for server-side operations with elevated privileges
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types (will be generated from Supabase CLI)
export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          email: string;
          name: string;
          password_hash: string;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          password_hash: string;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          password_hash?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          name: string;
          description: string;
          duration: string;
          price: number;
          category: 'python' | 'ai_ml' | 'data_science' | 'web_development';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          duration: string;
          price: number;
          category: 'python' | 'ai_ml' | 'data_science' | 'web_development';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          duration?: string;
          price?: number;
          category?: 'python' | 'ai_ml' | 'data_science' | 'web_development';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          name: string;
          email: string;
          mobile: string;
          course_interest: string;
          stage: 'new' | 'contacted' | 'interested' | 'converted';
          source: 'website' | 'referral' | 'social_media' | 'advertisement' | 'walk_in';
          notes: string | null;
          last_contacted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          mobile: string;
          course_interest: string;
          stage?: 'new' | 'contacted' | 'interested' | 'converted';
          source: 'website' | 'referral' | 'social_media' | 'advertisement' | 'walk_in';
          notes?: string | null;
          last_contacted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          mobile?: string;
          course_interest?: string;
          stage?: 'new' | 'contacted' | 'interested' | 'converted';
          source?: 'website' | 'referral' | 'social_media' | 'advertisement' | 'walk_in';
          notes?: string | null;
          last_contacted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      message_templates: {
        Row: {
          id: string;
          course_id: string;
          type: 'welcome' | 'follow_up_day_1' | 'follow_up_day_2' | 'follow_up_day_3' | 'custom';
          name: string;
          content: string;
          variables: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          type: 'welcome' | 'follow_up_day_1' | 'follow_up_day_2' | 'follow_up_day_3' | 'custom';
          name: string;
          content: string;
          variables?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          type?: 'welcome' | 'follow_up_day_1' | 'follow_up_day_2' | 'follow_up_day_3' | 'custom';
          name?: string;
          content?: string;
          variables?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      whatsapp_messages: {
        Row: {
          id: string;
          lead_id: string;
          template_id: string | null;
          content: string;
          status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
          sent_at: string | null;
          delivered_at: string | null;
          read_at: string | null;
          error_message: string | null;
          retry_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          template_id?: string | null;
          content: string;
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          template_id?: string | null;
          content?: string;
          status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          created_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          lead_id: string;
          type: 'lead_created' | 'stage_changed' | 'message_sent' | 'note_added' | 'lead_updated';
          description: string;
          metadata: Record<string, any> | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          type: 'lead_created' | 'stage_changed' | 'message_sent' | 'note_added' | 'lead_updated';
          description: string;
          metadata?: Record<string, any> | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          type?: 'lead_created' | 'stage_changed' | 'message_sent' | 'note_added' | 'lead_updated';
          description?: string;
          metadata?: Record<string, any> | null;
          created_by?: string;
          created_at?: string;
        };
      };
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];