// Hand-written to match supabase/migrations/0001_init.sql.
// Once the Supabase project is live, prefer regenerating with:
//   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
// and re-apply any manual comments/exports below that the generator drops.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type BrandTone =
  | 'professional'
  | 'friendly'
  | 'casual'
  | 'funny'
  | 'luxury'
  | 'educational'
  | 'sales_focused';

export type ContentCategory =
  | 'promotional'
  | 'educational'
  | 'tips'
  | 'engagement'
  | 'product_spotlight'
  | 'service_spotlight'
  | 'customer_testimonial'
  | 'faq'
  | 'behind_the_scenes'
  | 'seasonal'
  | 'local_business'
  | 'special_offer'
  | 'holiday'
  | 'community';

export type ApprovalMode = 'manual' | 'auto_pilot';
export type PostStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'failed';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid';
export type UserRole = 'user' | 'admin';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          suspended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: UserRole;
          suspended_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          category: string | null;
          description: string | null;
          website: string | null;
          phone: string | null;
          contact_email: string | null;
          location: string | null;
          target_customers: string | null;
          products_services: string | null;
          main_offers: string | null;
          brand_tone: BrandTone;
          preferred_language: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          name: string;
          category?: string | null;
          description?: string | null;
          website?: string | null;
          phone?: string | null;
          contact_email?: string | null;
          location?: string | null;
          target_customers?: string | null;
          products_services?: string | null;
          main_offers?: string | null;
          brand_tone?: BrandTone;
          preferred_language?: string;
          timezone?: string;
        };
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>;
        Relationships: [];
      };
      facebook_connections: {
        Row: {
          id: string;
          business_id: string;
          meta_user_id: string;
          long_lived_user_token_encrypted: string;
          token_expires_at: string | null;
          scopes: string[];
          status: string;
          connected_at: string;
          disconnected_at: string | null;
        };
        Insert: {
          business_id: string;
          meta_user_id: string;
          long_lived_user_token_encrypted: string;
          token_expires_at?: string | null;
          scopes?: string[];
          status?: string;
        };
        Update: Partial<Database['public']['Tables']['facebook_connections']['Insert']>;
        Relationships: [];
      };
      facebook_pages: {
        Row: {
          id: string;
          connection_id: string;
          business_id: string;
          page_id: string;
          page_name: string;
          page_access_token_encrypted: string;
          is_selected: boolean;
          permissions: string[];
          last_token_check_at: string | null;
          token_status: string;
          created_at: string;
        };
        Insert: {
          connection_id: string;
          business_id: string;
          page_id: string;
          page_name: string;
          page_access_token_encrypted: string;
          is_selected?: boolean;
          permissions?: string[];
          token_status?: string;
        };
        Update: Partial<Database['public']['Tables']['facebook_pages']['Insert']>;
        Relationships: [];
      };
      brand_profiles: {
        Row: {
          id: string;
          business_id: string;
          logo_url: string | null;
          brand_colors: Json;
          preferred_cta: string | null;
          brand_voice: string | null;
          words_to_avoid: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          logo_url?: string | null;
          brand_colors?: Json;
          preferred_cta?: string | null;
          brand_voice?: string | null;
          words_to_avoid?: string[];
        };
        Update: Partial<Database['public']['Tables']['brand_profiles']['Insert']>;
        Relationships: [];
      };
      content_preferences: {
        Row: {
          id: string;
          business_id: string;
          enabled_categories: ContentCategory[];
          posts_per_day: number;
          posting_days: number[];
          posting_times: string[];
          approval_mode: ApprovalMode;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          enabled_categories?: ContentCategory[];
          posts_per_day?: number;
          posting_days?: number[];
          posting_times?: string[];
          approval_mode?: ApprovalMode;
        };
        Update: Partial<Database['public']['Tables']['content_preferences']['Insert']>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          business_id: string;
          facebook_page_id: string | null;
          category: ContentCategory;
          caption: string;
          cta: string | null;
          hashtags: string[];
          image_idea: string | null;
          image_prompt: string | null;
          image_url: string | null;
          status: PostStatus;
          scheduled_at: string | null;
          published_at: string | null;
          facebook_post_id: string | null;
          error_message: string | null;
          retry_count: number;
          publish_lock_token: string | null;
          next_attempt_at: string | null;
          ai_model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          facebook_page_id?: string | null;
          category: ContentCategory;
          caption: string;
          cta?: string | null;
          hashtags?: string[];
          image_idea?: string | null;
          image_prompt?: string | null;
          image_url?: string | null;
          status?: PostStatus;
          scheduled_at?: string | null;
          ai_model?: string | null;
        };
        // Wider than Insert: the publisher writes lifecycle columns that
        // nothing sets at creation time.
        Update: Partial<
          Database['public']['Tables']['posts']['Insert'] & {
            published_at: string | null;
            facebook_post_id: string | null;
            error_message: string | null;
            retry_count: number;
            publish_lock_token: string | null;
            next_attempt_at: string | null;
          }
        >;
        Relationships: [];
      };
      post_publish_attempts: {
        Row: {
          id: string;
          post_id: string;
          attempted_at: string;
          success: boolean;
          http_status: number | null;
          error_message: string | null;
          facebook_post_id: string | null;
        };
        Insert: {
          post_id: string;
          success: boolean;
          http_status?: number | null;
          error_message?: string | null;
          facebook_post_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['post_publish_attempts']['Insert']>;
        Relationships: [];
      };
      post_insights: {
        Row: {
          id: string;
          post_id: string;
          reach: number | null;
          reactions: number | null;
          comments: number | null;
          shares: number | null;
          clicks: number | null;
          fetched_at: string;
        };
        Insert: {
          post_id: string;
          reach?: number | null;
          reactions?: number | null;
          comments?: number | null;
          shares?: number | null;
          clicks?: number | null;
        };
        Update: Partial<Database['public']['Tables']['post_insights']['Insert']>;
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          key: string;
          name: string;
          price_aud: number;
          stripe_price_id: string | null;
          max_pages: number;
          max_posts_per_day: number;
          features: Json;
          is_active: boolean;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          key: string;
          name: string;
          price_aud: number;
          stripe_price_id?: string | null;
          max_pages: number;
          max_posts_per_day: number;
          features?: Json;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['plans']['Insert']>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          business_id: string;
          plan_id: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: SubscriptionStatus;
          trial_ends_at: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          plan_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: SubscriptionStatus;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
        Relationships: [];
      };
      usage: {
        Row: {
          id: string;
          business_id: string;
          period_start: string;
          period_end: string;
          posts_generated: number;
          posts_published: number;
          posts_failed: number;
        };
        Insert: {
          business_id: string;
          period_start: string;
          period_end: string;
          posts_generated?: number;
          posts_published?: number;
          posts_failed?: number;
        };
        Update: Partial<Database['public']['Tables']['usage']['Insert']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          type: string;
          message: string;
          read?: boolean;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
        Relationships: [];
      };
      api_logs: {
        Row: {
          id: string;
          business_id: string | null;
          service: string;
          endpoint: string;
          status_code: number | null;
          success: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          business_id?: string | null;
          service: string;
          endpoint: string;
          status_code?: number | null;
          success: boolean;
          error_message?: string | null;
        };
        Update: Partial<Database['public']['Tables']['api_logs']['Insert']>;
        Relationships: [];
      };
      admin_logs: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          admin_id: string;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database['public']['Tables']['admin_logs']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_usage: {
        Args: {
          p_business_id: string;
          p_generated?: number;
          p_published?: number;
          p_failed?: number;
        };
        Returns: undefined;
      };
      claim_due_posts: {
        Args: {
          p_lock_token: string;
          p_limit?: number;
        };
        Returns: Database['public']['Tables']['posts']['Row'][];
      };
    };
    Enums: {
      brand_tone: BrandTone;
      content_category: ContentCategory;
      approval_mode: ApprovalMode;
      post_status: PostStatus;
      subscription_status: SubscriptionStatus;
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
