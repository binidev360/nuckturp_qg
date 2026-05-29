-- Onda 1: Remoção de índices nunca utilizados (0 scans)
-- Tabelas pequenas onde PostgreSQL prefere seq scan naturalmente
-- Libera espaço e acelera writes

-- Posts & Notes: tags GIN nunca consultados via índice
DROP INDEX IF EXISTS idx_posts_tags;
DROP INDEX IF EXISTS idx_notes_tags;

-- Engagement scores: ranking/total nunca usados como índice (admin_list_users usa ORDER BY inline)
DROP INDEX IF EXISTS idx_engagement_ranking;
DROP INDEX IF EXISTS idx_engagement_total;

-- Folders: tenant_id já tem FK index implícito
DROP INDEX IF EXISTS idx_folders_tenant_id;

-- Notes: folder_id nunca consultado via índice
DROP INDEX IF EXISTS idx_notes_folder_id;

-- Menu items & Featured links: tabelas pequenas, active filter não beneficia de índice
DROP INDEX IF EXISTS idx_menu_items_active;
DROP INDEX IF EXISTS idx_featured_links_active;

-- PWA events: tabela de analytics, nunca consultada via esses índices
DROP INDEX IF EXISTS idx_pwa_events_type_created;
DROP INDEX IF EXISTS idx_pwa_events_user_id;

-- Email send log: recipient nunca buscado via índice
DROP INDEX IF EXISTS idx_email_send_log_recipient;

-- Link analysis: link_type nunca filtrado via índice
DROP INDEX IF EXISTS idx_link_analysis_link_type;
DROP INDEX IF EXISTS idx_link_corrections_post_id;
DROP INDEX IF EXISTS idx_link_url_mappings_original;

-- Favorites: user_type combo nunca usado
DROP INDEX IF EXISTS idx_favorites_user_type;

-- Share events: recipient nunca buscado
DROP INDEX IF EXISTS idx_share_events_recipient;

-- Post admin actions: admin filter nunca usado
DROP INDEX IF EXISTS idx_post_admin_actions_admin;

-- Content templates: user/global filters nunca usados
DROP INDEX IF EXISTS idx_content_templates_user;
DROP INDEX IF EXISTS idx_content_templates_global;

-- Journey progress: user filter nunca usado (tabela pequena)
DROP INDEX IF EXISTS idx_journey_user;