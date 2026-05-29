export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _purge_backup_20260522: {
        Row: {
          bucket: string | null
          created_at: string | null
          drop_after: string | null
          email: string | null
          last_sign_in_at: string | null
          memberships: Json | null
          profile: Json | null
          purged_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          user_id: string
        }
        Insert: {
          bucket?: string | null
          created_at?: string | null
          drop_after?: string | null
          email?: string | null
          last_sign_in_at?: string | null
          memberships?: Json | null
          profile?: Json | null
          purged_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          user_id: string
        }
        Update: {
          bucket?: string | null
          created_at?: string | null
          drop_after?: string | null
          email?: string | null
          last_sign_in_at?: string | null
          memberships?: Json | null
          profile?: Json | null
          purged_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      academy_annotations: {
        Row: {
          anchor_type: string
          chapter_id: string | null
          chapter_slug: string | null
          chapter_title: string | null
          color: string
          created_at: string
          id: string
          note_id: string | null
          paragraph_index: number | null
          selected_text: string | null
          source_id: string
          source_slug: string
          source_title: string
          source_type: string
          tenant_id: string
          updated_at: string
          user_id: string
          user_note: string
          video_time_sec: number | null
        }
        Insert: {
          anchor_type?: string
          chapter_id?: string | null
          chapter_slug?: string | null
          chapter_title?: string | null
          color?: string
          created_at?: string
          id?: string
          note_id?: string | null
          paragraph_index?: number | null
          selected_text?: string | null
          source_id: string
          source_slug?: string
          source_title?: string
          source_type: string
          tenant_id: string
          updated_at?: string
          user_id: string
          user_note?: string
          video_time_sec?: number | null
        }
        Update: {
          anchor_type?: string
          chapter_id?: string | null
          chapter_slug?: string | null
          chapter_title?: string | null
          color?: string
          created_at?: string
          id?: string
          note_id?: string | null
          paragraph_index?: number | null
          selected_text?: string | null
          source_id?: string
          source_slug?: string
          source_title?: string
          source_type?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          user_note?: string
          video_time_sec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_annotations_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_annotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_annotations_consolidated: {
        Row: {
          anchor_type: string | null
          annotated_at: string | null
          chapter_title: string | null
          color: string | null
          consolidated_at: string
          id: string
          selected_text: string | null
          snapshot: Json | null
          source_title: string | null
          source_type: string | null
          total_annotations: number | null
          user_note: string | null
        }
        Insert: {
          anchor_type?: string | null
          annotated_at?: string | null
          chapter_title?: string | null
          color?: string | null
          consolidated_at?: string
          id?: string
          selected_text?: string | null
          snapshot?: Json | null
          source_title?: string | null
          source_type?: string | null
          total_annotations?: number | null
          user_note?: string | null
        }
        Update: {
          anchor_type?: string | null
          annotated_at?: string | null
          chapter_title?: string | null
          color?: string | null
          consolidated_at?: string
          id?: string
          selected_text?: string | null
          snapshot?: Json | null
          source_title?: string | null
          source_type?: string | null
          total_annotations?: number | null
          user_note?: string | null
        }
        Relationships: []
      }
      academy_book_pages: {
        Row: {
          content: string | null
          id: string
          order_index: number
          session_id: string
        }
        Insert: {
          content?: string | null
          id?: string
          order_index?: number
          session_id: string
        }
        Update: {
          content?: string | null
          id?: string
          order_index?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_book_pages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academy_book_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_book_sessions: {
        Row: {
          book_id: string
          id: string
          order_index: number
          parent_id: string | null
          published: boolean
          slug: string
          title: string
        }
        Insert: {
          book_id: string
          id?: string
          order_index?: number
          parent_id?: string | null
          published?: boolean
          slug: string
          title: string
        }
        Update: {
          book_id?: string
          id?: string
          order_index?: number
          parent_id?: string | null
          published?: boolean
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_book_sessions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "academy_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_book_sessions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "academy_book_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_books: {
        Row: {
          accent_color: string | null
          access_type: string
          author: string | null
          banner_url: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          external_url: string | null
          id: string
          order_index: number
          published: boolean
          slug: string
          subtitle: string | null
          theme_label: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          access_type?: string
          author?: string | null
          banner_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          order_index?: number
          published?: boolean
          slug: string
          subtitle?: string | null
          theme_label?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          access_type?: string
          author?: string | null
          banner_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          order_index?: number
          published?: boolean
          slug?: string
          subtitle?: string | null
          theme_label?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      academy_cards: {
        Row: {
          access_type: string
          book_id: string | null
          course_id: string | null
          created_at: string
          cta_label: string | null
          description: string | null
          destination_type: string
          external_url: string | null
          id: string
          image_url: string | null
          link_target: string
          order_index: number
          published: boolean
          status_badge: string | null
          subtitle: string | null
          tags: string[] | null
          title: string
          tool_path: string | null
          updated_at: string
        }
        Insert: {
          access_type?: string
          book_id?: string | null
          course_id?: string | null
          created_at?: string
          cta_label?: string | null
          description?: string | null
          destination_type?: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          link_target?: string
          order_index?: number
          published?: boolean
          status_badge?: string | null
          subtitle?: string | null
          tags?: string[] | null
          title: string
          tool_path?: string | null
          updated_at?: string
        }
        Update: {
          access_type?: string
          book_id?: string | null
          course_id?: string | null
          created_at?: string
          cta_label?: string | null
          description?: string | null
          destination_type?: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          link_target?: string
          order_index?: number
          published?: boolean
          status_badge?: string | null
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          tool_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_cards_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_academy_cards_book"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "academy_books"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_completion_events: {
        Row: {
          completed_at: string
          content_id: string
          content_type: string
          id: string
          nps_skipped: boolean
          nps_submitted: boolean
          user_id: string
        }
        Insert: {
          completed_at?: string
          content_id: string
          content_type: string
          id?: string
          nps_skipped?: boolean
          nps_submitted?: boolean
          user_id: string
        }
        Update: {
          completed_at?: string
          content_id?: string
          content_type?: string
          id?: string
          nps_skipped?: boolean
          nps_submitted?: boolean
          user_id?: string
        }
        Relationships: []
      }
      academy_content_nps: {
        Row: {
          answer_improve: string | null
          answer_learnings: string | null
          answer_why_worth: string | null
          content_id: string
          content_type: string
          created_at: string
          id: string
          nps_score: number
          testimonial_consent: boolean
          testimonial_visible: boolean
          user_id: string
        }
        Insert: {
          answer_improve?: string | null
          answer_learnings?: string | null
          answer_why_worth?: string | null
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          nps_score: number
          testimonial_consent?: boolean
          testimonial_visible?: boolean
          user_id: string
        }
        Update: {
          answer_improve?: string | null
          answer_learnings?: string | null
          answer_why_worth?: string | null
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          nps_score?: number
          testimonial_consent?: boolean
          testimonial_visible?: boolean
          user_id?: string
        }
        Relationships: []
      }
      academy_course_modules: {
        Row: {
          course_id: string
          id: string
          order_index: number
          published: boolean
          title: string
        }
        Insert: {
          course_id: string
          id?: string
          order_index?: number
          published?: boolean
          title: string
        }
        Update: {
          course_id?: string
          id?: string
          order_index?: number
          published?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_course_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_lessons: string[]
          course_id: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_lessons?: string[]
          course_id: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_lessons?: string[]
          course_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_courses: {
        Row: {
          accent_color: string | null
          access_type: string
          banner_url: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          external_url: string | null
          id: string
          instructor: string | null
          order_index: number
          published: boolean
          slug: string
          subtitle: string | null
          theme_label: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          access_type?: string
          banner_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          instructor?: string | null
          order_index?: number
          published?: boolean
          slug: string
          subtitle?: string | null
          theme_label?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          access_type?: string
          banner_url?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          id?: string
          instructor?: string | null
          order_index?: number
          published?: boolean
          slug?: string
          subtitle?: string | null
          theme_label?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      academy_lessons: {
        Row: {
          content: string | null
          duration_min: number | null
          id: string
          module_id: string
          order_index: number
          published: boolean
          slug: string
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          duration_min?: number | null
          id?: string
          module_id: string
          order_index?: number
          published?: boolean
          slug: string
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          duration_min?: number | null
          id?: string
          module_id?: string
          order_index?: number
          published?: boolean
          slug?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_reading_progress: {
        Row: {
          book_id: string
          completed: boolean
          completed_at: string | null
          id: string
          last_session_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          last_session_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          last_session_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "academy_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_reading_progress_last_session_id_fkey"
            columns: ["last_session_id"]
            isOneToOne: false
            referencedRelation: "academy_book_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_settings: {
        Row: {
          coming_soon_text: string
          id: string
          launched: boolean
          updated_at: string
        }
        Insert: {
          coming_soon_text?: string
          id?: string
          launched?: boolean
          updated_at?: string
        }
        Update: {
          coming_soon_text?: string
          id?: string
          launched?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      admin_cost_settings: {
        Row: {
          id: string
          key: string
          label: string
          updated_at: string
          updated_by: string | null
          value: number
        }
        Insert: {
          id?: string
          key: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Update: {
          id?: string
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: number
        }
        Relationships: []
      }
      admin_master_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_master_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string
          feature: string
          id: string
          model: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          feature?: string
          id?: string
          model?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          model?: string | null
          user_id?: string
        }
        Relationships: []
      }
      author_follows: {
        Row: {
          blog_author_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_author_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_author_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "author_follows_blog_author_id_fkey"
            columns: ["blog_author_id"]
            isOneToOne: false
            referencedRelation: "blog_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_emails: {
        Row: {
          banned_by: string
          created_at: string
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          banned_by: string
          created_at?: string
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          banned_by?: string
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      blog_authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          blog_accent_color: string | null
          blog_banner_position: number
          blog_banner_url: string | null
          blog_bg_image_url: string | null
          blog_title: string | null
          blog_title_font: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          profile_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          blog_accent_color?: string | null
          blog_banner_position?: number
          blog_banner_url?: string | null
          blog_bg_image_url?: string | null
          blog_title?: string | null
          blog_title_font?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          profile_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          blog_accent_color?: string | null
          blog_banner_position?: number
          blog_banner_url?: string | null
          blog_bg_image_url?: string | null
          blog_title?: string | null
          blog_title_font?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          profile_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_authors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_authors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_shares: {
        Row: {
          accepted: boolean
          campaign_id: string
          created_at: string
          id: string
          permission: string
          share_notes: boolean
          share_sessions: boolean
          share_whiteboard: boolean
          shared_by: string
          shared_with_email: string
          shared_with_user_id: string | null
          updated_at: string
        }
        Insert: {
          accepted?: boolean
          campaign_id: string
          created_at?: string
          id?: string
          permission?: string
          share_notes?: boolean
          share_sessions?: boolean
          share_whiteboard?: boolean
          shared_by: string
          shared_with_email: string
          shared_with_user_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted?: boolean
          campaign_id?: string
          created_at?: string
          id?: string
          permission?: string
          share_notes?: boolean
          share_sessions?: boolean
          share_whiteboard?: boolean
          shared_by?: string
          shared_with_email?: string
          shared_with_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_shares_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          arc_summary: string | null
          cover_position: number
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_one_shot: boolean
          name: string
          players: Json
          setting: string | null
          status: string
          system: string | null
          tags: string[]
          tenant_id: string
          updated_at: string
          vtt_url: string | null
          worldcraft_url: string | null
        }
        Insert: {
          arc_summary?: string | null
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_one_shot?: boolean
          name: string
          players?: Json
          setting?: string | null
          status?: string
          system?: string | null
          tags?: string[]
          tenant_id: string
          updated_at?: string
          vtt_url?: string | null
          worldcraft_url?: string | null
        }
        Update: {
          arc_summary?: string | null
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_one_shot?: boolean
          name?: string
          players?: Json
          setting?: string | null
          status?: string
          system?: string | null
          tags?: string[]
          tenant_id?: string
          updated_at?: string
          vtt_url?: string | null
          worldcraft_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      category_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          name: string
          post_id: string | null
          requested_by: string
          resolved_at: string | null
          resolved_by: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          name: string
          post_id?: string | null
          requested_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          name?: string
          post_id?: string | null
          requested_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_requests_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      character_inventory: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          player_campaign_id: string
          quantity: number
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          player_campaign_id: string
          quantity?: number
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          player_campaign_id?: string
          quantity?: number
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_inventory_player_campaign_id_fkey"
            columns: ["player_campaign_id"]
            isOneToOne: false
            referencedRelation: "player_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      character_relationships: {
        Row: {
          appearance: string | null
          avatar_url: string | null
          created_at: string
          current_goal: string | null
          entity_type: string
          id: string
          linked_player_campaign_id: string | null
          mannerisms: string | null
          motivation: string | null
          name: string
          npc_notes: string | null
          player_campaign_id: string
          relationship_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          appearance?: string | null
          avatar_url?: string | null
          created_at?: string
          current_goal?: string | null
          entity_type?: string
          id?: string
          linked_player_campaign_id?: string | null
          mannerisms?: string | null
          motivation?: string | null
          name: string
          npc_notes?: string | null
          player_campaign_id: string
          relationship_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          appearance?: string | null
          avatar_url?: string | null
          created_at?: string
          current_goal?: string | null
          entity_type?: string
          id?: string
          linked_player_campaign_id?: string | null
          mannerisms?: string | null
          motivation?: string | null
          name?: string
          npc_notes?: string | null
          player_campaign_id?: string
          relationship_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_relationships_linked_player_campaign_id_fkey"
            columns: ["linked_player_campaign_id"]
            isOneToOne: false
            referencedRelation: "player_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_relationships_player_campaign_id_fkey"
            columns: ["player_campaign_id"]
            isOneToOne: false
            referencedRelation: "player_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      character_session_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          player_campaign_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          player_campaign_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          player_campaign_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_session_notes_player_campaign_id_fkey"
            columns: ["player_campaign_id"]
            isOneToOne: false
            referencedRelation: "player_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conditional_notification_logs: {
        Row: {
          conditional_notification_id: string
          id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          conditional_notification_id: string
          id?: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          conditional_notification_id?: string
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conditional_notification_logs_conditional_notification_id_fkey"
            columns: ["conditional_notification_id"]
            isOneToOne: false
            referencedRelation: "conditional_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      conditional_notifications: {
        Row: {
          active: boolean
          body: string
          created_at: string
          created_by: string
          delay_unit: string
          delay_value: number
          id: string
          link_url: string | null
          name: string
          notification_category: string | null
          target_audience: string[]
          template: string
          trigger_condition: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          created_by: string
          delay_unit?: string
          delay_value?: number
          id?: string
          link_url?: string | null
          name: string
          notification_category?: string | null
          target_audience?: string[]
          template?: string
          trigger_condition: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          created_by?: string
          delay_unit?: string
          delay_value?: number
          id?: string
          link_url?: string | null
          name?: string
          notification_category?: string | null
          target_audience?: string[]
          template?: string
          trigger_condition?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_templates: {
        Row: {
          active: boolean
          category: string
          content: string
          created_at: string
          description: string | null
          id: string
          is_global: boolean
          sort_order: number
          tags: string[]
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          sort_order?: number
          tags?: string[]
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dictionary_entries: {
        Row: {
          created_at: string
          definition: string
          id: string
          letter: string
          slug: string
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          definition: string
          id?: string
          letter: string
          slug: string
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          definition?: string
          id?: string
          letter?: string
          slug?: string
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      edge_function_metrics: {
        Row: {
          created_at: string
          duration_ms: number
          error_message: string | null
          function_name: string
          id: number
          request_id: string | null
          status_code: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms: number
          error_message?: string | null
          function_name: string
          id?: number
          request_id?: string | null
          status_code: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          function_name?: string
          id?: number
          request_id?: string | null
          status_code?: number
          user_id?: string | null
        }
        Relationships: []
      }
      email_pipeline_settings: {
        Row: {
          active: boolean
          id: string
          label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          id: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          id?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      featured_links: {
        Row: {
          active: boolean
          created_at: string
          id: string
          image_url: string | null
          location: string
          sort_order: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string
          sort_order?: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string
          sort_order?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      feedback_view_events: {
        Row: {
          config_id: string
          id: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          config_id: string
          id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          config_id?: string
          id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_view_events_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "session_feedback_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_pricing_costs: {
        Row: {
          amount_cents: number
          category: string
          created_at: string
          id: string
          label: string
          pricing_model_id: string
          recurrence: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          category?: string
          created_at?: string
          id?: string
          label: string
          pricing_model_id: string
          recurrence?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          category?: string
          created_at?: string
          id?: string
          label?: string
          pricing_model_id?: string
          recurrence?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_pricing_costs_pricing_model_id_fkey"
            columns: ["pricing_model_id"]
            isOneToOne: false
            referencedRelation: "finance_pricing_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_pricing_costs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_pricing_models: {
        Row: {
          campaign_id: string | null
          created_at: string
          has_session_zero: boolean
          hours_per_session: number
          id: string
          name: string
          notes: string
          num_players: number
          num_sessions: number
          platform_fee_enabled: boolean
          platform_fee_pct: number
          price_per_person_cents: number
          table_type: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          has_session_zero?: boolean
          hours_per_session?: number
          id?: string
          name: string
          notes?: string
          num_players?: number
          num_sessions?: number
          platform_fee_enabled?: boolean
          platform_fee_pct?: number
          price_per_person_cents?: number
          table_type?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          has_session_zero?: boolean
          hours_per_session?: number
          id?: string
          name?: string
          notes?: string
          num_players?: number
          num_sessions?: number
          platform_fee_enabled?: boolean
          platform_fee_pct?: number
          price_per_person_cents?: number
          table_type?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_pricing_models_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_pricing_models_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_receipts: {
        Row: {
          created_at: string
          extracted: Json | null
          id: string
          mime: string | null
          status: string
          storage_path: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted?: Json | null
          id?: string
          mime?: string | null
          status?: string
          storage_path: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted?: Json | null
          id?: string
          mime?: string | null
          status?: string
          storage_path?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_settings: {
        Row: {
          created_at: string
          currency: string
          id: string
          min_session_alert_cents: number
          monthly_goal_cents: number
          platform_fee_enabled: boolean
          platform_fee_pct: number
          reserve_pct: number
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          min_session_alert_cents?: number
          monthly_goal_cents?: number
          platform_fee_enabled?: boolean
          platform_fee_pct?: number
          reserve_pct?: number
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          min_session_alert_cents?: number
          monthly_goal_cents?: number
          platform_fee_enabled?: boolean
          platform_fee_pct?: number
          reserve_pct?: number
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          amount_cents: number
          category: string
          created_at: string
          description: string
          id: string
          kind: string
          occurred_on: string
          platform_fee_cents: number
          player_id: string | null
          pricing_model_id: string | null
          receipt_id: string | null
          source: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          kind?: string
          occurred_on?: string
          platform_fee_cents?: number
          player_id?: string | null
          pricing_model_id?: string | null
          receipt_id?: string | null
          source?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          kind?: string
          occurred_on?: string
          platform_fee_cents?: number
          player_id?: string | null
          pricing_model_id?: string | null
          receipt_id?: string | null
          source?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_pricing_model_id_fkey"
            columns: ["pricing_model_id"]
            isOneToOne: false
            referencedRelation: "finance_pricing_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "finance_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      infra_snapshots: {
        Row: {
          active_connections: number
          cache_hit_ratio: number
          created_at: string
          db_size_mb: number
          dead_tuples: number
          id: string
          index_usage_ratio: number
          max_connections: number
          storage_bytes: number
          total_connections: number
          total_rows: number
        }
        Insert: {
          active_connections?: number
          cache_hit_ratio?: number
          created_at?: string
          db_size_mb?: number
          dead_tuples?: number
          id?: string
          index_usage_ratio?: number
          max_connections?: number
          storage_bytes?: number
          total_connections?: number
          total_rows?: number
        }
        Update: {
          active_connections?: number
          cache_hit_ratio?: number
          created_at?: string
          db_size_mb?: number
          dead_tuples?: number
          id?: string
          index_usage_ratio?: number
          max_connections?: number
          storage_bytes?: number
          total_connections?: number
          total_rows?: number
        }
        Relationships: []
      }
      journey_progress: {
        Row: {
          chapter_id: number
          completed_at: string
          id: string
          lesson_idx: number
          user_id: string
        }
        Insert: {
          chapter_id: number
          completed_at?: string
          id?: string
          lesson_idx: number
          user_id: string
        }
        Update: {
          chapter_id?: number
          completed_at?: string
          id?: string
          lesson_idx?: number
          user_id?: string
        }
        Relationships: []
      }
      link_analysis_results: {
        Row: {
          analyzed_at: string
          analyzed_by: string
          content_backup: string | null
          context_snippet: string | null
          created_at: string
          http_status: number | null
          id: string
          link_type: string
          manually_validated: boolean
          original_url: string
          post_id: string
          status: string
          suggested_url: string | null
        }
        Insert: {
          analyzed_at?: string
          analyzed_by: string
          content_backup?: string | null
          context_snippet?: string | null
          created_at?: string
          http_status?: number | null
          id?: string
          link_type?: string
          manually_validated?: boolean
          original_url: string
          post_id: string
          status?: string
          suggested_url?: string | null
        }
        Update: {
          analyzed_at?: string
          analyzed_by?: string
          content_backup?: string | null
          context_snippet?: string | null
          created_at?: string
          http_status?: number | null
          id?: string
          link_type?: string
          manually_validated?: boolean
          original_url?: string
          post_id?: string
          status?: string
          suggested_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_analysis_results_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      link_corrections_log: {
        Row: {
          applied_at: string
          applied_by: string
          content_backup: string
          corrections_applied: Json
          id: string
          post_id: string
        }
        Insert: {
          applied_at?: string
          applied_by: string
          content_backup: string
          corrections_applied?: Json
          id?: string
          post_id: string
        }
        Update: {
          applied_at?: string
          applied_by?: string
          content_backup?: string
          corrections_applied?: Json
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_corrections_log_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      link_url_mappings: {
        Row: {
          corrected_url: string
          created_at: string
          created_by: string
          id: string
          original_url: string
          updated_at: string
        }
        Insert: {
          corrected_url: string
          created_at?: string
          created_by: string
          id?: string
          original_url: string
          updated_at?: string
        }
        Update: {
          corrected_url?: string
          created_at?: string
          created_by?: string
          id?: string
          original_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          icon: string | null
          id: string
          label: string
          menu_location: string
          open_in_new_tab: boolean
          parent_id: string | null
          sort_order: number
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          menu_location?: string
          open_in_new_tab?: boolean
          parent_id?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          menu_location?: string
          open_in_new_tab?: boolean
          parent_id?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "post_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      note_shares: {
        Row: {
          accepted: boolean
          created_at: string
          id: string
          note_id: string
          permission: string
          shared_by: string
          shared_with_email: string
          shared_with_user_id: string | null
          updated_at: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          id?: string
          note_id: string
          permission?: string
          shared_by: string
          shared_with_email: string
          shared_with_user_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          id?: string
          note_id?: string
          permission?: string
          shared_by?: string
          shared_with_email?: string
          shared_with_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_shares_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          campaign_id: string | null
          content: string | null
          cover_position: number
          cover_url: string | null
          created_at: string
          folder_id: string | null
          id: string
          is_public: boolean
          pinned: boolean
          public_token: string | null
          session_id: string | null
          status: string
          tags: string[] | null
          tenant_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          content?: string | null
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_public?: boolean
          pinned?: boolean
          public_token?: string | null
          session_id?: string | null
          status?: string
          tags?: string[] | null
          tenant_id: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          content?: string | null
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_public?: boolean
          pinned?: boolean
          public_token?: string | null
          session_id?: string | null
          status?: string
          tags?: string[] | null
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          link_label: string | null
          link_url: string | null
          published_at: string | null
          sent_count: number | null
          status: string
          target_audience: string
          target_tags: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          link_label?: string | null
          link_url?: string | null
          published_at?: string | null
          sent_count?: number | null
          status?: string
          target_audience?: string
          target_tags?: string[] | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          link_label?: string | null
          link_url?: string | null
          published_at?: string | null
          sent_count?: number | null
          status?: string
          target_audience?: string
          target_tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_push_queue: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          notification_id: string | null
          scheduled_for: string
          status: string
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          notification_id?: string | null
          scheduled_for?: string
          status?: string
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          notification_id?: string | null
          scheduled_for?: string
          status?: string
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_push_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      player_campaigns: {
        Row: {
          active: boolean
          appearance: string | null
          avatar_url: string | null
          backstory: string | null
          campaign_id: string
          character_class: string | null
          character_name: string | null
          character_sheet_url: string | null
          character_species: string | null
          id: string
          joined_at: string
          mannerisms: string | null
          motivation_purpose: string | null
          notes: string | null
          personal_goal: string | null
          player_id: string | null
          tags: string[]
          worldcraft_url: string | null
        }
        Insert: {
          active?: boolean
          appearance?: string | null
          avatar_url?: string | null
          backstory?: string | null
          campaign_id: string
          character_class?: string | null
          character_name?: string | null
          character_sheet_url?: string | null
          character_species?: string | null
          id?: string
          joined_at?: string
          mannerisms?: string | null
          motivation_purpose?: string | null
          notes?: string | null
          personal_goal?: string | null
          player_id?: string | null
          tags?: string[]
          worldcraft_url?: string | null
        }
        Update: {
          active?: boolean
          appearance?: string | null
          avatar_url?: string | null
          backstory?: string | null
          campaign_id?: string
          character_class?: string | null
          character_name?: string | null
          character_sheet_url?: string | null
          character_species?: string | null
          id?: string
          joined_at?: string
          mannerisms?: string | null
          motivation_purpose?: string | null
          notes?: string | null
          personal_goal?: string | null
          player_id?: string | null
          tags?: string[]
          worldcraft_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_campaigns_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active: boolean
          avatar_url: string | null
          birth_date: string | null
          character_name: string | null
          class: string | null
          created_at: string
          email: string | null
          external_sheet_url: string | null
          gore_level: number | null
          id: string
          instagram: string | null
          mortality_level: number | null
          name: string
          nickname: string | null
          notes: string | null
          phone: string | null
          playstyle_tags: string[] | null
          pvp_level: number | null
          sensitive_topics: string | null
          species: string | null
          tags: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          character_name?: string | null
          class?: string | null
          created_at?: string
          email?: string | null
          external_sheet_url?: string | null
          gore_level?: number | null
          id?: string
          instagram?: string | null
          mortality_level?: number | null
          name: string
          nickname?: string | null
          notes?: string | null
          phone?: string | null
          playstyle_tags?: string[] | null
          pvp_level?: number | null
          sensitive_topics?: string | null
          species?: string | null
          tags?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          birth_date?: string | null
          character_name?: string | null
          class?: string | null
          created_at?: string
          email?: string | null
          external_sheet_url?: string | null
          gore_level?: number | null
          id?: string
          instagram?: string | null
          mortality_level?: number | null
          name?: string
          nickname?: string | null
          notes?: string | null
          phone?: string | null
          playstyle_tags?: string[] | null
          pvp_level?: number | null
          sensitive_topics?: string | null
          species?: string | null
          tags?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      post_admin_actions: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          note: string | null
          post_id: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          note?: string | null
          post_id: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          note?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_admin_actions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      post_features: {
        Row: {
          content_verified_at: string | null
          created_at: string
          id: string
          note: string | null
          override_category_ids: string[]
          override_tags: string[]
          post_id: string
          requested_at: string
          requested_by: string
          responded_at: string | null
          revoked_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          content_verified_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          override_category_ids?: string[]
          override_tags?: string[]
          post_id: string
          requested_at?: string
          requested_by: string
          responded_at?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          content_verified_at?: string | null
          created_at?: string
          id?: string
          note?: string | null
          override_category_ids?: string[]
          override_tags?: string[]
          post_id?: string
          requested_at?: string
          requested_by?: string
          responded_at?: string | null
          revoked_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_features_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          post_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_view_events: {
        Row: {
          id: string
          post_id: string
          viewed_at: string
          viewer_user_id: string | null
        }
        Insert: {
          id?: string
          post_id: string
          viewed_at?: string
          viewer_user_id?: string | null
        }
        Update: {
          id?: string
          post_id?: string
          viewed_at?: string
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_view_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          admin_reviewed_at: string | null
          author_id: string
          blog_author_id: string | null
          category_id: string | null
          category_ids: string[]
          content: string | null
          cover_url: string | null
          created_at: string
          excerpt: string | null
          featured: boolean
          first_published_at: string | null
          id: string
          og_image_url: string | null
          pinned: boolean
          published_at: string | null
          reading_time_min: number
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number
          visibility: string
        }
        Insert: {
          admin_reviewed_at?: string | null
          author_id: string
          blog_author_id?: string | null
          category_id?: string | null
          category_ids?: string[]
          content?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          first_published_at?: string | null
          id?: string
          og_image_url?: string | null
          pinned?: boolean
          published_at?: string | null
          reading_time_min?: number
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number
          visibility?: string
        }
        Update: {
          admin_reviewed_at?: string | null
          author_id?: string
          blog_author_id?: string | null
          category_id?: string | null
          category_ids?: string[]
          content?: string | null
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          first_published_at?: string | null
          id?: string
          og_image_url?: string | null
          pinned?: boolean
          published_at?: string | null
          reading_time_min?: number
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_blog_author_id_fkey"
            columns: ["blog_author_id"]
            isOneToOne: false
            referencedRelation: "blog_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "post_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_overrides: {
        Row: {
          created_at: string
          ends_at: string | null
          granted_by: string
          id: string
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          granted_by: string
          id?: string
          starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          granted_by?: string
          id?: string
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_position: number
          banner_url: string | null
          bio: string | null
          blog_enabled: boolean
          commissioned_master: string | null
          created_at: string
          display_name: string | null
          experience_level: string | null
          favorite_systems: Json
          favorite_vtts: Json
          id: string
          instagram_posts: Json
          is_admin: boolean
          locale: string
          master_title: string | null
          mesaquest_url: string | null
          nickname: string | null
          notification_preferences: Json | null
          onboarding_completed: boolean
          preferred_days: Json
          preferred_push_hour: number | null
          profile_accent_color: string | null
          pronoun: string | null
          push_enabled: boolean
          session_frequency: string | null
          slug: string | null
          social_links: Json | null
          subscription_start: string | null
          tagline: string | null
          tags: string[]
          updated_at: string
          user_id: string
          website: string | null
          worldcraft_links: Json | null
          youtube_videos: Json
        }
        Insert: {
          avatar_url?: string | null
          banner_position?: number
          banner_url?: string | null
          bio?: string | null
          blog_enabled?: boolean
          commissioned_master?: string | null
          created_at?: string
          display_name?: string | null
          experience_level?: string | null
          favorite_systems?: Json
          favorite_vtts?: Json
          id?: string
          instagram_posts?: Json
          is_admin?: boolean
          locale?: string
          master_title?: string | null
          mesaquest_url?: string | null
          nickname?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean
          preferred_days?: Json
          preferred_push_hour?: number | null
          profile_accent_color?: string | null
          pronoun?: string | null
          push_enabled?: boolean
          session_frequency?: string | null
          slug?: string | null
          social_links?: Json | null
          subscription_start?: string | null
          tagline?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
          website?: string | null
          worldcraft_links?: Json | null
          youtube_videos?: Json
        }
        Update: {
          avatar_url?: string | null
          banner_position?: number
          banner_url?: string | null
          bio?: string | null
          blog_enabled?: boolean
          commissioned_master?: string | null
          created_at?: string
          display_name?: string | null
          experience_level?: string | null
          favorite_systems?: Json
          favorite_vtts?: Json
          id?: string
          instagram_posts?: Json
          is_admin?: boolean
          locale?: string
          master_title?: string | null
          mesaquest_url?: string | null
          nickname?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean
          preferred_days?: Json
          preferred_push_hour?: number | null
          profile_accent_color?: string | null
          pronoun?: string | null
          push_enabled?: boolean
          session_frequency?: string | null
          slug?: string | null
          social_links?: Json | null
          subscription_start?: string | null
          tagline?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
          website?: string | null
          worldcraft_links?: Json | null
          youtube_videos?: Json
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pwa_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reengagement_logs: {
        Row: {
          email_type: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          email_type: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          email_type?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seo_analysis_history: {
        Row: {
          content_hash: string
          created_at: string
          id: string
          mode: string
          post_id: string
          score_after: number
          score_before: number
          suggestions: Json
          user_id: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          id?: string
          mode?: string
          post_id: string
          score_after?: number
          score_before?: number
          suggestions?: Json
          user_id: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          id?: string
          mode?: string
          post_id?: string
          score_after?: number
          score_before?: number
          suggestions?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_analysis_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      session_feedback_ai_analyses: {
        Row: {
          analysis_type: string
          config_id: string
          created_at: string
          created_by: string
          id: string
          result: Json
          updated_at: string
        }
        Insert: {
          analysis_type?: string
          config_id: string
          created_at?: string
          created_by: string
          id?: string
          result?: Json
          updated_at?: string
        }
        Update: {
          analysis_type?: string
          config_id?: string
          created_at?: string
          created_by?: string
          id?: string
          result?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_ai_analyses_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "session_feedback_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      session_feedback_configs: {
        Row: {
          active: boolean
          cover_position: number
          cover_url: string | null
          created_at: string
          custom_questions: Json
          expected_responses: number
          header_logo_url: string | null
          header_text: string | null
          header_type: string
          id: string
          intro_text: string
          reward_type: string | null
          reward_url: string | null
          self_evaluation: string | null
          session_id: string
          tenant_id: string
          thank_you_message: string | null
          token: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          custom_questions?: Json
          expected_responses?: number
          header_logo_url?: string | null
          header_text?: string | null
          header_type?: string
          id?: string
          intro_text?: string
          reward_type?: string | null
          reward_url?: string | null
          self_evaluation?: string | null
          session_id: string
          tenant_id: string
          thank_you_message?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          custom_questions?: Json
          expected_responses?: number
          header_logo_url?: string | null
          header_text?: string | null
          header_type?: string
          id?: string
          intro_text?: string
          reward_type?: string | null
          reward_url?: string | null
          self_evaluation?: string | null
          session_id?: string
          tenant_id?: string
          thank_you_message?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_configs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_feedback_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      session_feedback_responses: {
        Row: {
          config_id: string
          created_at: string
          custom_answers: Json
          email: string
          highlight: string | null
          id: string
          improve_chips: string[]
          improve_detail: string | null
          liked_chips: string[]
          liked_detail: string | null
          nps_score: number
        }
        Insert: {
          config_id: string
          created_at?: string
          custom_answers?: Json
          email: string
          highlight?: string | null
          id?: string
          improve_chips?: string[]
          improve_detail?: string | null
          liked_chips?: string[]
          liked_detail?: string | null
          nps_score: number
        }
        Update: {
          config_id?: string
          created_at?: string
          custom_answers?: Json
          email?: string
          highlight?: string | null
          id?: string
          improve_chips?: string[]
          improve_detail?: string | null
          liked_chips?: string[]
          liked_detail?: string | null
          nps_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_responses_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "session_feedback_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      session_players: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          player_campaign_id: string
          present: boolean
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          player_campaign_id: string
          present?: boolean
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          player_campaign_id?: string
          present?: boolean
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_players_player_campaign_id_fkey"
            columns: ["player_campaign_id"]
            isOneToOne: false
            referencedRelation: "player_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          actual_duration_min: number | null
          ai_questions: Json | null
          campaign_id: string
          checklist_post: Json | null
          checklist_pre: Json | null
          cover_position: number
          cover_url: string | null
          created_at: string
          estimated_duration_min: number | null
          id: string
          name: string
          session_date: string | null
          sort_order: number
          status: string
          summary: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_duration_min?: number | null
          ai_questions?: Json | null
          campaign_id: string
          checklist_post?: Json | null
          checklist_pre?: Json | null
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          estimated_duration_min?: number | null
          id?: string
          name: string
          session_date?: string | null
          sort_order?: number
          status?: string
          summary?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_duration_min?: number | null
          ai_questions?: Json | null
          campaign_id?: string
          checklist_post?: Json | null
          checklist_pre?: Json | null
          cover_position?: number
          cover_url?: string | null
          created_at?: string
          estimated_duration_min?: number | null
          id?: string
          name?: string
          session_date?: string | null
          sort_order?: number
          status?: string
          summary?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      share_events: {
        Row: {
          actor_avatar: string | null
          actor_email: string
          actor_name: string | null
          created_at: string
          dismissed_at: string | null
          event_type: string
          id: string
          note_id: string
          note_title: string
          read_at: string | null
          recipient_user_id: string
        }
        Insert: {
          actor_avatar?: string | null
          actor_email: string
          actor_name?: string | null
          created_at?: string
          dismissed_at?: string | null
          event_type: string
          id?: string
          note_id: string
          note_title: string
          read_at?: string | null
          recipient_user_id: string
        }
        Update: {
          actor_avatar?: string | null
          actor_email?: string
          actor_name?: string | null
          created_at?: string
          dismissed_at?: string | null
          event_type?: string
          id?: string
          note_id?: string
          note_title?: string
          read_at?: string | null
          recipient_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_events_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          google_config: Json
          id: string
          social_links: Json
          updated_at: string
        }
        Insert: {
          google_config?: Json
          id?: string
          social_links?: Json
          updated_at?: string
        }
        Update: {
          google_config?: Json
          id?: string
          social_links?: Json
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      user_access_hours: {
        Row: {
          access_hour: number
          accessed_at: string
          id: string
          user_id: string
        }
        Insert: {
          access_hour: number
          accessed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          access_hour?: number
          accessed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_engagement_scores: {
        Row: {
          campaign_count: number
          character_count: number
          computed_at: string
          note_count: number
          npc_count: number
          player_count: number
          post_count: number
          ranking_score: number
          session_count: number
          total_usage: number
          user_id: string
          whiteboard_count: number
        }
        Insert: {
          campaign_count?: number
          character_count?: number
          computed_at?: string
          note_count?: number
          npc_count?: number
          player_count?: number
          post_count?: number
          ranking_score?: number
          session_count?: number
          total_usage?: number
          user_id: string
          whiteboard_count?: number
        }
        Update: {
          campaign_count?: number
          character_count?: number
          computed_at?: string
          note_count?: number
          npc_count?: number
          player_count?: number
          post_count?: number
          ranking_score?: number
          session_count?: number
          total_usage?: number
          user_id?: string
          whiteboard_count?: number
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          clicked_at: string | null
          created_at: string
          dismissed_at: string | null
          id: string
          notification_id: string
          push_clicked_at: string | null
          push_delivered_at: string | null
          read_at: string | null
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          notification_id: string
          push_clicked_at?: string | null
          push_delivered_at?: string | null
          read_at?: string | null
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          notification_id?: string
          push_clicked_at?: string | null
          push_delivered_at?: string | null
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whiteboard_items: {
        Row: {
          board_name: string
          campaign_id: string | null
          color: string | null
          content: string | null
          created_at: string
          height: number
          id: string
          metadata: Json | null
          tenant_id: string
          type: string
          updated_at: string
          whiteboard_id: string | null
          width: number
          x: number
          y: number
          z_index: number
        }
        Insert: {
          board_name?: string
          campaign_id?: string | null
          color?: string | null
          content?: string | null
          created_at?: string
          height?: number
          id?: string
          metadata?: Json | null
          tenant_id: string
          type?: string
          updated_at?: string
          whiteboard_id?: string | null
          width?: number
          x?: number
          y?: number
          z_index?: number
        }
        Update: {
          board_name?: string
          campaign_id?: string | null
          color?: string | null
          content?: string | null
          created_at?: string
          height?: number
          id?: string
          metadata?: Json | null
          tenant_id?: string
          type?: string
          updated_at?: string
          whiteboard_id?: string | null
          width?: number
          x?: number
          y?: number
          z_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "whiteboard_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboard_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboard_items_whiteboard_id_fkey"
            columns: ["whiteboard_id"]
            isOneToOne: false
            referencedRelation: "whiteboards"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboards: {
        Row: {
          campaign_id: string | null
          created_at: string
          folder_id: string | null
          id: string
          name: string
          session_id: string | null
          tags: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          name?: string
          session_id?: string | null
          tags?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          name?: string
          session_id?: string | null
          tags?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboards_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboards_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whiteboards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      academy_annotations_admin_view: {
        Row: {
          anchor_type: string | null
          chapter_id: string | null
          chapter_slug: string | null
          chapter_title: string | null
          color: string | null
          created_at: string | null
          id: string | null
          note_id: string | null
          paragraph_index: number | null
          selected_text: string | null
          source_id: string | null
          source_slug: string | null
          source_title: string | null
          source_type: string | null
          tenant_id: string | null
          updated_at: string | null
          user_note: string | null
          video_time_sec: number | null
        }
        Insert: {
          anchor_type?: string | null
          chapter_id?: string | null
          chapter_slug?: string | null
          chapter_title?: string | null
          color?: string | null
          created_at?: string | null
          id?: string | null
          note_id?: string | null
          paragraph_index?: number | null
          selected_text?: string | null
          source_id?: string | null
          source_slug?: string | null
          source_title?: string | null
          source_type?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_note?: string | null
          video_time_sec?: number | null
        }
        Update: {
          anchor_type?: string | null
          chapter_id?: string | null
          chapter_slug?: string | null
          chapter_title?: string | null
          color?: string | null
          created_at?: string | null
          id?: string | null
          note_id?: string | null
          paragraph_index?: number | null
          selected_text?: string | null
          source_id?: string | null
          source_slug?: string | null
          source_title?: string | null
          source_type?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_note?: string | null
          video_time_sec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_annotations_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_annotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_monthly_summary: {
        Row: {
          expense_cents: number | null
          gross_income_cents: number | null
          income_count: number | null
          month: string | null
          net_income_cents: number | null
          platform_fee_cents: number | null
          tenant_id: string | null
          withdrawal_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          banner_position: number | null
          banner_url: string | null
          bio: string | null
          blog_enabled: boolean | null
          commissioned_master: string | null
          display_name: string | null
          favorite_systems: Json | null
          favorite_vtts: Json | null
          id: string | null
          instagram_posts: Json | null
          master_title: string | null
          mesaquest_url: string | null
          nickname: string | null
          preferred_days: Json | null
          pronoun: string | null
          slug: string | null
          social_links: Json | null
          subscription_start: string | null
          tagline: string | null
          website: string | null
          worldcraft_links: Json | null
          youtube_videos: Json | null
        }
        Insert: {
          avatar_url?: string | null
          banner_position?: number | null
          banner_url?: string | null
          bio?: string | null
          blog_enabled?: boolean | null
          commissioned_master?: string | null
          display_name?: string | null
          favorite_systems?: Json | null
          favorite_vtts?: Json | null
          id?: string | null
          instagram_posts?: Json | null
          master_title?: string | null
          mesaquest_url?: string | null
          nickname?: string | null
          preferred_days?: Json | null
          pronoun?: string | null
          slug?: string | null
          social_links?: Json | null
          subscription_start?: string | null
          tagline?: string | null
          website?: string | null
          worldcraft_links?: Json | null
          youtube_videos?: Json | null
        }
        Update: {
          avatar_url?: string | null
          banner_position?: number | null
          banner_url?: string | null
          bio?: string | null
          blog_enabled?: boolean | null
          commissioned_master?: string | null
          display_name?: string | null
          favorite_systems?: Json | null
          favorite_vtts?: Json | null
          id?: string | null
          instagram_posts?: Json | null
          master_title?: string | null
          mesaquest_url?: string | null
          nickname?: string | null
          preferred_days?: Json | null
          pronoun?: string | null
          slug?: string | null
          social_links?: Json | null
          subscription_start?: string | null
          tagline?: string | null
          website?: string | null
          worldcraft_links?: Json | null
          youtube_videos?: Json | null
        }
        Relationships: []
      }
      view_academy_retention_risk: {
        Row: {
          content_id: string | null
          content_title: string | null
          days_inactive: number | null
          last_activity: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_reading_progress_book_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "academy_books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_all_tags: { Args: never; Returns: Json }
      admin_audit_storage_orphans: {
        Args: { _bucket?: string; _limit?: number }
        Returns: Json
      }
      admin_blog_author_stats: { Args: never; Returns: Json }
      admin_count_users: {
        Args: { _is_admin?: boolean; _search?: string; _tag?: string }
        Returns: number
      }
      admin_cron_health: { Args: never; Returns: Json }
      admin_db_cache_hit: { Args: never; Returns: Json }
      admin_db_size: { Args: never; Returns: Json }
      admin_feedback_ranking: { Args: never; Returns: Json }
      admin_feedback_summary: { Args: never; Returns: Json }
      admin_infra_extended: { Args: never; Returns: Json }
      admin_list_users: {
        Args: {
          _is_admin?: boolean
          _limit?: number
          _offset?: number
          _search?: string
          _sort_direction?: string
          _sort_field?: string
          _tag?: string
        }
        Returns: Json
      }
      admin_long_queries: { Args: never; Returns: Json }
      admin_notification_kpis: { Args: never; Returns: Json }
      admin_platform_stats: { Args: never; Returns: Json }
      admin_profile_insights: { Args: never; Returns: Json }
      admin_recompute_engagement: { Args: never; Returns: Json }
      admin_reconcile_media: {
        Args: {
          _broken_url: string
          _bucket?: string
          _field_type: string
          _new_file_path: string
          _post_id: string
        }
        Returns: Json
      }
      admin_replace_content_url: {
        Args: { _new_url: string; _old_url: string }
        Returns: number
      }
      admin_scan_broken_media: {
        Args: { _bucket?: string; _dead_domains?: string[] }
        Returns: Json
      }
      admin_storage_ranking: { Args: { _limit?: number }; Returns: Json }
      admin_storage_stats: { Args: never; Returns: Json }
      admin_storage_usage_summary: { Args: never; Returns: Json }
      admin_take_infra_snapshot: { Args: never; Returns: Json }
      admin_user_activity_buckets: { Args: never; Returns: Json }
      batch_reorder_course_lessons: {
        Args: { p_ids: string[]; p_order_indexes: number[] }
        Returns: undefined
      }
      batch_reorder_course_modules: {
        Args: { p_ids: string[]; p_order_indexes: number[] }
        Returns: undefined
      }
      check_academy_inactivity: { Args: never; Returns: undefined }
      check_feedback_email: {
        Args: { _config_id: string; _email: string }
        Returns: boolean
      }
      consolidate_admin_annotations: { Args: never; Returns: Json }
      count_feedback_responses: {
        Args: { _config_id: string }
        Returns: number
      }
      count_feedback_views: { Args: { _config_id: string }; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_own_reaction: {
        Args: { _emoji: string; _post_id: string; _session_id: string }
        Returns: undefined
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_unique_slug_from_email: {
        Args: { _email: string }
        Returns: string
      }
      get_annotation_kpis: { Args: never; Returns: Json }
      get_author_by_blog_slug: {
        Args: { _slug: string }
        Returns: {
          author_avatar_url: string
          author_bio: string
          author_id: string
          author_name: string
          author_slug: string
          blog_accent_color: string
          blog_banner_position: number
          blog_banner_url: string
          blog_bg_image_url: string
          blog_title: string
          blog_title_font: string
          profile_avatar_url: string
          profile_banner_position: number
          profile_banner_url: string
          profile_bio: string
          profile_blog_enabled: boolean
          profile_display_name: string
          profile_id: string
          profile_mesaquest_url: string
          profile_nickname: string
          profile_slug: string
          profile_social_links: Json
          profile_website: string
          profile_worldcraft_links: Json
        }[]
      }
      get_author_daily_views: {
        Args: { _blog_author_id: string; _days?: number }
        Returns: {
          day: string
          views: number
        }[]
      }
      get_author_followers_count: {
        Args: { _blog_author_id: string }
        Returns: number
      }
      get_edge_function_stats: {
        Args: { window_minutes?: number }
        Returns: {
          avg_ms: number
          error_rate: number
          errors: number
          function_name: string
          invocations: number
          last_invocation: string
          p50_ms: number
          p95_ms: number
          p99_ms: number
        }[]
      }
      get_feedback_config_by_token: {
        Args: { _token: string }
        Returns: {
          campaign_cover_url: string
          campaign_name: string
          cover_position: number
          cover_url: string
          custom_questions: Json
          expected_responses: number
          header_logo_url: string
          header_text: string
          header_type: string
          id: string
          intro_text: string
          master_avatar: string
          master_name: string
          master_nickname: string
          master_slug: string
          reward_url: string
          session_id: string
          session_name: string
          thank_you_message: string
        }[]
      }
      get_feedback_responses: {
        Args: { _config_id: string }
        Returns: {
          config_id: string
          created_at: string
          custom_answers: Json
          highlight: string
          id: string
          improve_chips: string[]
          improve_detail: string
          liked_chips: string[]
          liked_detail: string
          nps_score: number
        }[]
      }
      get_my_share_invites: {
        Args: never
        Returns: {
          accepted: boolean
          created_at: string
          id: string
          note_id: string
          note_title: string
          permission: string
          shared_by: string
          sharer_avatar: string
          sharer_name: string
        }[]
      }
      get_profiles_public_data: {
        Args: { p_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          nickname: string
          slug: string
        }[]
      }
      get_public_note: {
        Args: { _token: string }
        Returns: {
          content: string
          cover_position: number
          cover_url: string
          created_at: string
          id: string
          owner_avatar_url: string
          owner_display_name: string
          owner_mesaquest_url: string
          owner_nickname: string
          owner_slug: string
          owner_social_links: Json
          owner_website: string
          owner_worldcraft_links: Json
          tags: string[]
          title: string
          type: string
          updated_at: string
        }[]
      }
      get_public_profile: {
        Args: { _slug: string }
        Returns: {
          avatar_url: string
          banner_position: number
          banner_url: string
          bio: string
          blog_enabled: boolean
          commissioned_master: string
          display_name: string
          favorite_systems: Json
          favorite_vtts: Json
          id: string
          instagram_posts: Json
          master_title: string
          mesaquest_url: string
          nickname: string
          preferred_days: Json
          profile_accent_color: string
          pronoun: string
          slug: string
          social_links: Json
          subscription_start: string
          tagline: string
          website: string
          worldcraft_links: Json
          youtube_videos: Json
        }[]
      }
      get_public_profile_by_slug: {
        Args: { _slug: string }
        Returns: {
          avatar_url: string
          banner_position: number
          banner_url: string
          bio: string
          blog_enabled: boolean
          display_name: string
          id: string
          mesaquest_url: string
          nickname: string
          slug: string
          social_links: Json
          website: string
          worldcraft_links: Json
        }[]
      }
      get_reaction_counts: { Args: { _post_id: string }; Returns: Json }
      get_trending_posts: {
        Args: { days_back?: number; limit_count?: number }
        Returns: {
          post_id: string
          view_count: number
        }[]
      }
      get_user_blog_author_id: { Args: { _user_id: string }; Returns: string }
      get_user_id_from_blog_author: {
        Args: { _blog_author_id: string }
        Returns: string
      }
      get_user_storage_bytes: { Args: { _user_id: string }; Returns: number }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_view: { Args: { p_post_id: string }; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_feedback_view: {
        Args: { _config_id: string; _user_agent?: string }
        Returns: undefined
      }
      search_profiles_for_linking: {
        Args: { _limit?: number; _search: string }
        Returns: Json
      }
      submit_feedback_response: {
        Args: {
          _config_id: string
          _custom_answers?: Json
          _email: string
          _highlight?: string
          _improve_chips?: string[]
          _improve_detail?: string
          _liked_chips?: string[]
          _liked_detail?: string
          _nps_score: number
        }
        Returns: string
      }
      toggle_reaction: {
        Args: { _emoji: string; _post_id: string; _session_id: string }
        Returns: undefined
      }
      update_preferred_push_hour: {
        Args: { _user_id: string }
        Returns: undefined
      }
      user_has_campaign_access: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_note_access: {
        Args: { _note_id: string; _user_id: string }
        Returns: boolean
      }
      user_owns_campaign: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
