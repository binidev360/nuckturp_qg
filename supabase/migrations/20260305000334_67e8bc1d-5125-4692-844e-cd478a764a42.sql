
-- ═══════════════════════════════════════════════
-- Performance indexes for 50k user scale
-- ═══════════════════════════════════════════════

-- Dashboard queries: sessions by date + status
CREATE INDEX IF NOT EXISTS idx_sessions_date_status ON public.sessions (session_date, status) WHERE session_date IS NOT NULL;

-- Notes: content search optimization (trigram would be better but ilike patterns)
CREATE INDEX IF NOT EXISTS idx_notes_tenant_updated ON public.notes (tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_campaign_id ON public.notes (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_session_id ON public.notes (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON public.notes (folder_id) WHERE folder_id IS NOT NULL;

-- Whiteboard items: by whiteboard_id (most common query)
CREATE INDEX IF NOT EXISTS idx_whiteboard_items_wb_id ON public.whiteboard_items (whiteboard_id, z_index) WHERE whiteboard_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whiteboard_items_tenant ON public.whiteboard_items (tenant_id) WHERE whiteboard_id IS NULL;

-- Posts: published listing (most common public query)
CREATE INDEX IF NOT EXISTS idx_posts_published ON public.posts (status, visibility, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_blog_author ON public.posts (blog_author_id, status) WHERE blog_author_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_featured ON public.posts (featured, status) WHERE featured = true AND status = 'published';

-- Post view events: daily analytics
CREATE INDEX IF NOT EXISTS idx_post_views_date ON public.post_view_events (post_id, viewed_at);

-- Favorites: user lookups
CREATE INDEX IF NOT EXISTS idx_favorites_user_type ON public.favorites (user_id, item_type);

-- Campaign shares: lookup by shared user
CREATE INDEX IF NOT EXISTS idx_campaign_shares_user ON public.campaign_shares (shared_with_user_id) WHERE shared_with_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_shares_campaign ON public.campaign_shares (campaign_id);

-- Note shares: lookup by shared user  
CREATE INDEX IF NOT EXISTS idx_note_shares_user ON public.note_shares (shared_with_user_id) WHERE shared_with_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_note_shares_email ON public.note_shares (shared_with_email);

-- Premium overrides: active check
CREATE INDEX IF NOT EXISTS idx_premium_overrides_user ON public.premium_overrides (user_id);

-- AI usage logs: analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage_logs (user_id, created_at DESC);

-- Profiles: slug lookups (public profiles)
CREATE INDEX IF NOT EXISTS idx_profiles_slug_notnull ON public.profiles (slug) WHERE slug IS NOT NULL;

-- Blog authors: profile link
CREATE INDEX IF NOT EXISTS idx_blog_authors_profile ON public.blog_authors (profile_id) WHERE profile_id IS NOT NULL;

-- Content templates: user templates
CREATE INDEX IF NOT EXISTS idx_content_templates_user ON public.content_templates (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_templates_global ON public.content_templates (is_global, active) WHERE is_global = true AND active = true;

-- Journey progress
CREATE INDEX IF NOT EXISTS idx_journey_user ON public.journey_progress (user_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications (user_id, created_at DESC);

-- Folders
CREATE INDEX IF NOT EXISTS idx_folders_tenant_type ON public.folders (tenant_id, type);
