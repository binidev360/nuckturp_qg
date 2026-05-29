
-- ==============================================
-- ÍNDICES CRÍTICOS PARA ELIMINAR TABLE SCANS
-- ==============================================

-- PROFILES: user_id é usado em TODA verificação RLS (is_admin, get_user_tenant_id, etc.)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles USING btree (user_id);

-- PROFILES: slug usado em get_public_profile
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles USING btree (slug) WHERE slug IS NOT NULL;

-- PROFILES: is_admin usado no is_admin() function e RLS policies
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles USING btree (user_id) WHERE is_admin = true;

-- CAMPAIGNS: tenant_id usado em TODAS as RLS policies de campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id ON public.campaigns USING btree (tenant_id);

-- CAMPAIGNS: status para filtro de campanhas ativas
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns USING btree (status);

-- SESSIONS: tenant_id para RLS
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON public.sessions USING btree (tenant_id);

-- SESSIONS: campaign_id para RLS de shared users e filtros
CREATE INDEX IF NOT EXISTS idx_sessions_campaign_id ON public.sessions USING btree (campaign_id);

-- NOTE_SHARES: shared_with_email usado na RLS e get_my_share_invites
CREATE INDEX IF NOT EXISTS idx_note_shares_email ON public.note_shares USING btree (shared_with_email);

-- NOTE_SHARES: note_id para joins
CREATE INDEX IF NOT EXISTS idx_note_shares_note_id ON public.note_shares USING btree (note_id);

-- NOTE_SHARES: shared_with_user_id para RLS
CREATE INDEX IF NOT EXISTS idx_note_shares_user_id ON public.note_shares USING btree (shared_with_user_id) WHERE shared_with_user_id IS NOT NULL;

-- FOLDERS: tenant_id para RLS
CREATE INDEX IF NOT EXISTS idx_folders_tenant_id ON public.folders USING btree (tenant_id);

-- WHITEBOARDS: tenant_id para RLS
CREATE INDEX IF NOT EXISTS idx_whiteboards_tenant_id ON public.whiteboards USING btree (tenant_id);

-- WHITEBOARD_ITEMS: tenant_id para RLS
CREATE INDEX IF NOT EXISTS idx_whiteboard_items_tenant_id ON public.whiteboard_items USING btree (tenant_id);

-- WHITEBOARD_ITEMS: whiteboard_id para filtro
CREATE INDEX IF NOT EXISTS idx_whiteboard_items_whiteboard_id ON public.whiteboard_items USING btree (whiteboard_id);

-- CAMPAIGN_SHARES: shared_with_user_id para RLS
CREATE INDEX IF NOT EXISTS idx_campaign_shares_user_id ON public.campaign_shares USING btree (shared_with_user_id) WHERE shared_with_user_id IS NOT NULL;

-- SHARE_EVENTS: recipient_user_id para RLS
CREATE INDEX IF NOT EXISTS idx_share_events_recipient ON public.share_events USING btree (recipient_user_id);

-- POSTS: blog_author_id para filtro por autor
CREATE INDEX IF NOT EXISTS idx_posts_blog_author_id ON public.posts USING btree (blog_author_id);

-- POSTS: status + visibility para queries públicas
CREATE INDEX IF NOT EXISTS idx_posts_published ON public.posts USING btree (status, visibility) WHERE status = 'published';

-- MEMBERSHIPS: user_id para get_user_tenant_id (chamada em TODA operação RLS)
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships USING btree (user_id);

-- POST_FEATURES: post_id
CREATE INDEX IF NOT EXISTS idx_post_features_post_id ON public.post_features USING btree (post_id);

-- FEATURED_LINKS: active para filtro público
CREATE INDEX IF NOT EXISTS idx_featured_links_active ON public.featured_links USING btree (active) WHERE active = true;

-- MENU_ITEMS: active para filtro público
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON public.menu_items USING btree (active) WHERE active = true;
