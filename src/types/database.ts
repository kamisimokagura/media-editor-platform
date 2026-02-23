export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionTier = 'free' | 'pro' | 'business' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          subscription_tier: SubscriptionTier;
          subscription_status: SubscriptionStatus | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          usage_count_today: number;
          usage_reset_at: string;
          total_files_processed: number;
          storage_used_bytes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: SubscriptionTier;
          subscription_status?: SubscriptionStatus | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          usage_count_today?: number;
          usage_reset_at?: string;
          total_files_processed?: number;
          storage_used_bytes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: SubscriptionTier;
          subscription_status?: SubscriptionStatus | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          usage_count_today?: number;
          usage_reset_at?: string;
          total_files_processed?: number;
          storage_used_bytes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          type: 'video' | 'image' | 'audio';
          thumbnail_url: string | null;
          is_public: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          type: 'video' | 'image' | 'audio';
          thumbnail_url?: string | null;
          is_public?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          type?: 'video' | 'image' | 'audio';
          thumbnail_url?: string | null;
          is_public?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      media_files: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string;
          original_name: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          thumbnail_path: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          name: string;
          original_name: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          thumbnail_path?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          name?: string;
          original_name?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          thumbnail_path?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'media_files_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'media_files_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      processing_jobs: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          type: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          input_file_id: string | null;
          output_file_id: string | null;
          parameters: Json;
          error_message: string | null;
          progress: number;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          type: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          input_file_id?: string | null;
          output_file_id?: string | null;
          parameters?: Json;
          error_message?: string | null;
          progress?: number;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          type?: string;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          input_file_id?: string | null;
          output_file_id?: string | null;
          parameters?: Json;
          error_message?: string | null;
          progress?: number;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'processing_jobs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          event_name: string;
          event_category: string | null;
          event_params: Json;
          page_path: string | null;
          referrer: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          device_type: string | null;
          browser: string | null;
          country: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          event_name: string;
          event_category?: string | null;
          event_params?: Json;
          page_path?: string | null;
          referrer?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          device_type?: string | null;
          browser?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          event_name?: string;
          event_category?: string | null;
          event_params?: Json;
          page_path?: string | null;
          referrer?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          device_type?: string | null;
          browser?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'analytics_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          tier: SubscriptionTier;
          price_monthly: number;
          price_yearly: number;
          stripe_price_id_monthly: string | null;
          stripe_price_id_yearly: string | null;
          features: Json;
          limits: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tier: SubscriptionTier;
          price_monthly: number;
          price_yearly: number;
          stripe_price_id_monthly?: string | null;
          stripe_price_id_yearly?: string | null;
          features?: Json;
          limits?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tier?: SubscriptionTier;
          price_monthly?: number;
          price_yearly?: number;
          stripe_price_id_monthly?: string | null;
          stripe_price_id_yearly?: string | null;
          features?: Json;
          limits?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_tier: SubscriptionTier;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Convenience types
export type User = Tables<'users'>;
export type Project = Tables<'projects'>;
export type MediaFile = Tables<'media_files'>;
export type ProcessingJob = Tables<'processing_jobs'>;
export type AnalyticsEvent = Tables<'analytics_events'>;
export type SubscriptionPlan = Tables<'subscription_plans'>;
