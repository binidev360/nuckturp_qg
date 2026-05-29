# Inventário do Schema — QG do Mestre (Nuckturp)

> Base para reconstruir o schema na **Fase 1** e tipar o Next.js. Extraído (somente leitura) de:
> - **Fonte consolidada:** `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp\src\integrations\supabase\types.ts` (PostgREST 14.1)
> - **Complemento SQL:** `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp\supabase\migrations\*.sql` (209 migrations incrementais — políticas RLS, triggers, functions, types, extensões, cron, storage)
>
> **Totais:** 56 tabelas em `public` + 3 views + 1 enum + ~60 functions/RPC. Schema multi-tenant com RLS em (praticamente) toda tabela.
>
> Notas de discrepância migrations × types:
> - A tabela `adventures` aparece em migration inicial (`20260222012754`) mas **não existe no types.ts** — foi descontinuada/renomeada. Ignorar na reconstrução.
> - Tabelas `_purge_backup_20260522` e `academy_annotations_consolidated` são artefatos operacionais (backup/consolidação), não core. Avaliar se vale portar.

---

## 1. Tabelas por domínio

Convenções: PK é sempre `id uuid default gen_random_uuid()` salvo indicação. `created_at`/`updated_at` são `timestamptz default now()`. FKs `ON DELETE CASCADE` por padrão (exceto onde anotado).

### 1.1 Identidade, tenancy e papéis (núcleo)
| Tabela | Colunas-chave | PK | FKs |
|---|---|---|---|
| `tenants` | `name`, `owner_id` | id | `owner_id` → `auth.users(id)` |
| `memberships` | `tenant_id`, `user_id`, `role` (default `owner`); UNIQUE(tenant_id,user_id) | id | `tenant_id` → `tenants` |
| `profiles` | `user_id` (UNIQUE), `display_name`, `slug`, `is_admin`, `locale` (`pt-BR`), `blog_enabled`, `onboarding_completed`, `push_enabled`, `subscription_start`, vários JSON (`favorite_systems`, `social_links`, `notification_preferences`, `worldcraft_links`, `youtube_videos`, `instagram_posts`, `preferred_days`) | id | `user_id` → `auth.users(id)` (1:1) |
| `user_roles` | `user_id`, `role` (enum `app_role`) | id | `user_id` → `auth.users` |
| `premium_overrides` | `user_id`, `granted_by`, `starts_at`, `ends_at` | id | — |
| `banned_emails` | `email`, `banned_by`, `reason` | id | — |

### 1.2 Campanhas, sessões, personagens (RPG core, tenant-scoped)
| Tabela | Colunas-chave | PK | FKs |
|---|---|---|---|
| `campaigns` | `tenant_id`, `name`, `status` (`active`/`paused`/`finished`), `system`, `players` (JSON), `is_one_shot`, `tags[]`, `arc_summary`, `cover_url`, `worldcraft_url`, `vtt_url` | id | `tenant_id` → `tenants` |
| `campaign_shares` | `campaign_id`, `shared_by`, `shared_with_email`, `shared_with_user_id`, `permission` (`viewer`/`editor`), `accepted`, flags `share_*`; UNIQUE(campaign_id,shared_with_email) | id | `campaign_id` → `campaigns` |
| `players` | `tenant_id`, `name`, `email`, `character_name`, `consent_settings` (JSON), `playstyle_tags[]`, `pvp_level`/`gore_level`/`mortality_level`, `sensitive_topics` | id | `tenant_id` → `tenants` |
| `player_campaigns` | `campaign_id`, `player_id`, `character_*`, `backstory`, `consent_settings`, `active` | id | `campaign_id` → `campaigns`; `player_id` → `players` |
| `character_inventory` | `player_campaign_id`, `name`, `type`, `quantity`, `sort_order` | id | `player_campaign_id` → `player_campaigns` |
| `character_relationships` | `player_campaign_id`, `linked_player_campaign_id`, `entity_type`, `relationship_type`, `name`, `npc_notes` | id | `player_campaign_id` + `linked_player_campaign_id` → `player_campaigns` |
| `character_session_notes` | `player_campaign_id`, `session_id`, `content` | id | → `player_campaigns`, `sessions` |
| `sessions` | `tenant_id`, `campaign_id`, `name`, `status`, `session_date`, `checklist_pre`/`checklist_post` (JSON), `ai_questions` (JSON), `summary`, `sort_order` | id | `tenant_id` → `tenants`; `campaign_id` → `campaigns` |
| `session_players` | `session_id`, `player_campaign_id`, `present`, `notes` | id | → `sessions`, `player_campaigns` |
| `consent_links` | `tenant_id`, `campaign_id`, `player_email`, `player_id`, `token`, `expires_at`, `submitted_at` | id | → `tenants`, `campaigns`, `players` |

### 1.3 Notas, pastas, whiteboard (workspace, tenant-scoped)
| Tabela | Colunas-chave | PK | FKs |
|---|---|---|---|
| `notes` | `tenant_id`, `campaign_id?`, `session_id?`, `folder_id?`, `title`, `content`, `type`, `status`, `is_public`, `public_token`, `pinned`, `tags[]`, `cover_url` | id | → `tenants`, `campaigns`, `sessions`, `folders` |
| `note_shares` | `note_id`, `shared_by`, `shared_with_email`, `shared_with_user_id`, `permission`, `accepted` | id | `note_id` → `notes` |
| `share_events` | `note_id`, `recipient_user_id`, `actor_*`, `event_type`, `read_at`, `dismissed_at` | id | `note_id` → `notes` |
| `folders` | `tenant_id`, `name`, `type`, `parent_id?` (self-ref), `sort_order` | id | `tenant_id` → `tenants`; `parent_id` → `folders` |
| `whiteboards` | `tenant_id`, `campaign_id?`, `session_id?`, `folder_id?`, `name`, `tags[]` | id | → `tenants`, `campaigns`, `sessions`, `folders` |
| `whiteboard_items` | `tenant_id`, `whiteboard_id?`, `campaign_id?`, `type`, `content`, `x`/`y`/`width`/`height`/`z_index`, `metadata` (JSON), `board_name` | id | → `tenants`, `whiteboards`, `campaigns` |

### 1.4 Blog / conteúdo público (posts)
| Tabela | Colunas-chave | PK | FKs |
|---|---|---|---|
| `posts` | `author_id`, `blog_author_id?`, `category_id?`, `category_ids[]`, `slug`, `title`, `content`, `status`, `visibility`, `featured`, `pinned`, `view_count`, `reading_time_min`, `seo_*`, `og_image_url`, `published_at`, `first_published_at` | id | `blog_author_id` → `blog_authors`; `category_id` → `post_categories` |
| `blog_authors` | `name`, `slug`, `profile_id?`, `bio`, `avatar_url`, customização de blog (`blog_title`, `blog_accent_color`, `blog_banner_url`, etc.) | id | `profile_id` → `profiles` |
| `author_follows` | `blog_author_id`, `user_id` | id | `blog_author_id` → `blog_authors` |
| `post_categories` | `name`, `slug`, `parent_id?` (self-ref), `sort_order` | id | `parent_id` → `post_categories` |
| `category_requests` | `name`, `slug`, `post_id?`, `requested_by`, `status`, `resolved_by` | id | `post_id` → `posts` |
| `post_features` | `post_id` (1:1), `status`, `override_category_ids[]`, `override_tags[]`, `requested_by` | id | `post_id` → `posts` (UNIQUE) |
| `post_admin_actions` | `post_id`, `admin_user_id`, `action_type`, `note` | id | `post_id` → `posts` |
| `post_reactions` | `post_id`, `session_id`, `emoji` | id | `post_id` → `posts` |
| `post_view_events` | `post_id`, `viewer_user_id?`, `viewed_at` | id | `post_id` → `posts` |
| `menu_items` | `label`, `type`, `url?`, `category_id?`, `parent_id?` (self-ref), `menu_location`, `sort_order`, `active` | id | `category_id` → `post_categories`; `parent_id` → `menu_items` |
| `featured_links` | `title`, `url`, `location`, `image_url`, `sort_order`, `active` | id | — |
| `dictionary_entries` | `term`, `slug`, `letter`, `definition` | id | — |

### 1.5 SEO / análise de links
| Tabela | Colunas-chave | PK | FKs |
|---|---|---|---|
| `seo_analysis_history` | `post_id`, `user_id`, `content_hash`, `mode`, `score_before`/`score_after`, `suggestions` (JSON) | id | `post_id` → `posts` |
| `link_analysis_results` | `post_id`, `original_url`, `suggested_url`, `status`, `http_status`, `link_type`, `analyzed_by` | id | `post_id` → `posts` |
| `link_corrections_log` | `post_id`, `applied_by`, `content_backup`, `corrections_applied` (JSON) | id | `post_id` → `posts` |
| `link_url_mappings` | `original_url`, `corrected_url`, `created_by` | id | — |

### 1.6 Academy (cursos, livros, lições)
| Tabela | Colunas-chave | PK | FKs |
|---|---|---|---|
| `academy_settings` | `launched`, `coming_soon_text` (singleton) | id | — |
| `academy_cards` | `title`, `destination_type`, `link_target`, `access_type`, `course_id?`, `book_id?`, `published`, `order_index`, `tags[]` | id | `course_id` → `academy_courses`; `book_id` → `academy_books` |
| `academy_courses` | `slug`, `title`, `access_type`, `instructor`, `published`, `order_index` | id | — |
| `academy_course_modules` | `course_id`, `title`, `order_index`, `published` | id | `course_id` → `academy_courses` |
| `academy_lessons` | `module_id`, `slug`, `title`, `content`, `video_url`, `duration_min`, `reflection_questions` (JSON), `published` | id | `module_id` → `academy_course_modules` |
| `academy_course_progress` | `course_id`, `user_id`, `completed`, `completed_lessons[]` | id | `course_id` → `academy_courses` |
| `academy_books` | `slug`, `title`, `author`, `access_type`, `published`, `order_index`, `external_url` | id | — |
| `academy_book_sessions` | `book_id`, `slug`, `title`, `parent_id?` (self-ref), `order_index`, `reflection_questions` (JSON), `published` | id | `book_id` → `academy_books`; `parent_id` → self |
| `academy_book_pages` | `session_id`, `content`, `order_index` | id | `session_id` → `academy_book_sessions` |
| `academy_reading_progress` | `book_id`, `user_id`, `completed`, `completed_session_ids[]`, `last_session_id?` | id | `book_id` → `academy_books`; `last_session_id` → `academy_book_sessions` |
| `academy_annotations` | `tenant_id`, `user_id`, `source_id`/`source_type`/`source_slug`, `anchor_type`, `selected_text`, `user_note`, `color`, `note_id?`, `paragraph_index`, `video_time_sec` | id | `note_id` → `notes`; `tenant_id` → `tenants` |
| `academy_annotations_consolidated` | snapshot anonimizado de anotações (`consolidated_at`) | id | — (artefato) |
| `academy_completion_events` | `user_id`, `content_id`, `content_type`, `nps_submitted`, `nps_skipped` | id | — |
| `academy_content_nps` | `user_id`, `content_id`, `content_type`, `nps_score`, `answer_why_worth` | id | — |
| `journey_progress` | `user_id`, `chapter_id` (int), `lesson_idx`, `completed_at` | id | — (jornada/onboarding) |

### 1.7 Sessão de feedback (NPS pós-mesa)
| Tabela | Colunas-chave | PK | FKs |
|---|---|---|---|
| `session_feedback_configs` | `tenant_id`, `session_id` (1:1), `token`, `active`, `custom_questions` (JSON), `intro_text`, `header_*`, `reward_*`, `expected_responses` | id | `session_id` → `sessions` (UNIQUE); `tenant_id` → `tenants` |
| `session_feedback_responses` | `config_id`, `email`, `nps_score`, `liked_chips[]`, `improve_chips[]`, `custom_answers` (JSON), `highlight` | id | `config_id` → `session_feedback_configs` |
| `session_feedback_ai_analyses` | `config_id`, `analysis_type`, `result` (JSON), `created_by` | id | `config_id` → `session_feedback_configs` |
| `feedback_view_events` | `config_id`, `user_agent`, `viewed_at` | id | `config_id` → `session_feedback_configs` |

### 1.8 Finanças (tenant-scoped + user_id)
| Tabela | Colunas-chave | PK | FKs |
|---|---|---|---|
| `finance_settings` | `tenant_id` (1:1), `user_id`, `currency`, `monthly_goal_cents`, `platform_fee_pct`, `reserve_pct`, `min_session_alert_cents` | id | `tenant_id` → `tenants` (UNIQUE) |
| `finance_pricing_models` | `tenant_id`, `user_id`, `campaign_id?`, `name`, `price_per_person_cents`, `num_players`, `num_sessions`, `table_type`, `platform_fee_*` | id | → `tenants`, `campaigns` |
| `finance_pricing_costs` | `pricing_model_id`, `tenant_id`, `user_id`, `category`, `label`, `amount_cents`, `recurrence` | id | → `finance_pricing_models`, `tenants` |
| `finance_transactions` | `tenant_id`, `user_id`, `kind`, `category`, `amount_cents`, `platform_fee_cents`, `occurred_on`, `player_id?`, `pricing_model_id?`, `receipt_id?`, `source` | id | → `tenants`, `players`, `finance_pricing_models`, `finance_receipts` |
| `finance_receipts` | `tenant_id`, `user_id`, `storage_path`, `mime`, `status`, `extracted` (JSON) | id | `tenant_id` → `tenants` |

### 1.9 Notificações & push
| Tabela | Colunas-chave | PK | FKs |
|---|---|---|---|
| `notifications` | `created_by`, `title`, `body`, `type`, `status`, `target_audience`, `target_tags[]`, `link_*`, `published_at`, `sent_count` | id | — |
| `user_notifications` | `notification_id`, `user_id`, `read_at`, `clicked_at`, `dismissed_at`, `push_delivered_at`, `push_clicked_at` | id | `notification_id` → `notifications` |
| `conditional_notifications` | `created_by`, `name`, `trigger_condition`, `delay_value`/`delay_unit`, `template`, `target_audience[]`, `active` | id | — |
| `conditional_notification_logs` | `conditional_notification_id`, `user_id`, `scheduled_for`, `sent_at`, `status` | id | → `conditional_notifications` |
| `pending_push_queue` | `user_id`, `notification_id?`, `title`, `body`, `scheduled_for`, `status` | id | `notification_id` → `notifications` |
| `push_subscriptions` | `user_id`, `endpoint`, `p256dh`, `auth`, `user_agent` (Web Push) | id | — |
| `reengagement_logs` | `user_id`, `email_type`, `sent_at` | id | — |

### 1.10 E-mail (infra de fila/envio)
| Tabela | Colunas-chave | PK | FKs |
|---|---|---|---|
| `email_send_log` | `recipient_email`, `template_name`, `status`, `message_id`, `metadata` (JSON), `error_message` | id | — |
| `email_send_state` | singleton (`id` int): `batch_size`, `send_delay_ms`, `retry_after_until`, `*_email_ttl_minutes` | id (int) | — |
| `email_pipeline_settings` | `id` (chave textual), `label`, `active` | id (text) | — |
| `email_unsubscribe_tokens` | `email`, `token`, `used_at` | id | — |
| `suppressed_emails` | `email`, `reason`, `metadata` (JSON) | id | — |

> A fila real de e-mails usa **pgmq** (filas `auth_emails`, `transactional_emails` + DLQs), não tabelas comuns. Ver §5 (functions de fila) e §6 (cron).

### 1.11 Admin / telemetria / config global
| Tabela | Colunas-chave | PK | FKs |
|---|---|---|---|
| `site_settings` | singleton: `google_config` (JSON), `social_links` (JSON) | id | — |
| `admin_cost_settings` | `key`, `label`, `value`, `updated_by` | id | — |
| `admin_master_notes` | `tenant_id`, `created_by`, `content` | id | `tenant_id` → `tenants` |
| `ai_usage_logs` | `user_id`, `feature`, `model` | id | — |
| `edge_function_metrics` | `function_name`, `duration_ms`, `status_code`, `request_id`, `user_id?`, `error_message` | id (bigint) | — |
| `infra_snapshots` | métricas de DB (`db_size_mb`, `cache_hit_ratio`, `dead_tuples`, conexões, `storage_bytes`, `total_rows`) | id | — |
| `pwa_events` | `user_id`, `event_type`, `user_agent` | id | — |
| `user_access_hours` | `user_id`, `access_hour` (int), `accessed_at` | id | — |
| `user_engagement_scores` | `user_id`, contadores (`campaign_count`, `note_count`, etc.), `ranking_score`, `total_usage`, `computed_at` | user_id | — |
| `content_templates` | `category`, `title`, `content`, `is_global`, `user_id?`, `tags[]`, `sort_order`, `active` | id | — |
| `favorites` | `user_id`, `item_id`, `item_type` (polimórfico) | id | — |
| `_purge_backup_20260522` | backup operacional de usuários purgados (JSON) | user_id | — (artefato) |

---

## 2. Enums / types customizados

| Type | Valores | Uso |
|---|---|---|
| `public.app_role` | `'admin'` \| `'moderator'` \| `'user'` | coluna `user_roles.role`; argumento de `has_role()` |

> Definido em `20260311005414_b0886f36...sql`. No types.ts: `Database["public"]["Enums"]["app_role"]` + `Constants.public.Enums.app_role`. **É o único enum customizado** — todos os demais campos "tipo/status" usam `TEXT` com `CHECK` constraints (ex.: `campaigns.status IN ('active','paused','finished')`, `campaign_shares.permission IN ('viewer','editor')`). Sem `CompositeTypes`.

---

## 3. Multi-tenancy — como `user_id` / tenant ligam conteúdo ao usuário

Dois eixos de propriedade coexistem:

**A) Eixo tenant (workspace "QG do Mestre")** — domínio RPG e finanças.
- Cadeia: `auth.users` → `memberships(user_id, tenant_id, role)` → `tenants(owner_id)`. Cada usuário tem **1 tenant próprio** criado no signup (trigger `handle_new_user`, role `owner`).
- Tabelas de conteúdo carregam `tenant_id NOT NULL` e descendem em cascata: `campaigns` → `sessions`/`notes`/`whiteboards` → `player_campaigns`/`session_players`/`character_*`.
- A ligação usuário↔tenant é resolvida pela função `get_user_tenant_id(auth.uid())` (SECURITY DEFINER, evita recursão de RLS). É o **predicado central** das policies tenant-scoped.
- Compartilhamento cross-tenant: `campaign_shares` / `note_shares` (`shared_with_user_id`, `accepted`) + helpers `user_has_campaign_access` / `user_has_note_access`.

**B) Eixo user direto (`user_id = auth.uid()`)** — progresso, preferências, telemetria.
- Tabelas como `academy_*_progress`, `favorites`, `user_notifications`, `push_subscriptions`, `ai_usage_logs`, `academy_annotations` ligam por `user_id` sem passar por tenant.
- `finance_*` é **híbrido**: tem `tenant_id` E `user_id` (RLS por tenant, auditoria por user).

> Implicação Fase 1: recriar **primeiro** `tenants` + `memberships` + `profiles` + o trigger `on_auth_user_created`/`handle_new_user`, pois todo o resto depende de `get_user_tenant_id`. Preservar UUIDs de `auth.users` no cutover (guardrail) garante que `memberships.user_id` e `*.tenant_id` continuem válidos.

---

## 4. RLS — resumo

**RLS está habilitado em essencialmente todas as 56 tabelas** (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` aparece em ~30 migrations; 298 ocorrências de `CREATE POLICY` em 84 migrations). Não foi encontrada tabela de domínio sem RLS.

Padrões de política (por categoria):

1. **User-owned (`profiles`, progress, preferências):**
   `USING (auth.uid() = user_id)` para SELECT/INSERT/UPDATE. Ex.: `profiles`, `academy_course_progress`, `favorites`, `push_subscriptions`.

2. **Tenant-scoped (RPG core, finanças):**
   `USING (tenant_id = public.get_user_tenant_id(auth.uid()))` para todas as ações do dono. Ex.: `campaigns`, `sessions`, `notes`, `whiteboards`, `players`, `finance_*`. Tabelas-filhas que não têm `tenant_id` direto usam helper de posse via join, ex.: `user_owns_campaign(auth.uid(), campaign_id)`.

3. **Compartilhamento cross-tenant:**
   policy adicional de SELECT/UPDATE com `user_has_campaign_access` / `user_has_note_access`; o convidado também vê/atualiza a própria linha de share (`shared_with_user_id = auth.uid()`).

4. **Conteúdo público (anônimo):**
   blog e dicionário expõem leitura pública filtrada — `USING (status = 'published' ...)` / `true` para `anon`, com escrita restrita ao autor ou admin.

5. **Admin override:**
   `USING (public.is_admin(auth.uid()))` ou `public.has_role('admin', auth.uid())` em tabelas administrativas (`notifications`, `post_admin_actions`, `banned_emails`, buckets de blog, etc.).

6. **Acesso por token (sem login):**
   formulários públicos (`consent_links`, `session_feedback_*`, nota pública via `public_token`) **não** liberam SELECT direto — vão por RPCs SECURITY DEFINER que recebem o token (ver §5).

7. **Storage (bucket policies em `storage.objects`):**
   - leitura pública por bucket (`bucket_id = 'profile-assets'`);
   - escrita restrita à pasta do próprio usuário: `auth.uid()::text = (storage.foldername(name))[1]`;
   - buckets de admin (`blog-assets`) exigem `is_admin(auth.uid())` na escrita.

> Detalhe de segurança relevante: trigger `protect_is_admin` impede usuário de auto-promover `profiles.is_admin` via UPDATE.

---

## 5. Triggers, Functions/RPC e Extensões

### 5.1 Extensões instaladas
| Extensão | Schema | Propósito |
|---|---|---|
| `pg_cron` | `pg_catalog` | Agendamento de jobs (ver §6) |
| `pg_net` | `extensions` | `net.http_post` — chama Edge Functions a partir do DB |
| `supabase_vault` | (vault) | Guarda `service_role` key como secret (`email_queue_service_role_key`) |
| `pgmq` | — | Filas de mensagem (`auth_emails`, `transactional_emails` + DLQs) |

### 5.2 Trigger functions (genéricas)
- `update_updated_at_column()` — seta `NEW.updated_at = now()`. Trigger `BEFORE UPDATE` replicado em ~25 tabelas (`profiles`, `campaigns`, `sessions`, `notes`, `whiteboards`, `posts`, `players`, `finance_*`, `academy_*`, etc.). Variantes `update_academy_settings_updated_at`/`update_academy_cards_updated_at` fazem o mesmo para essas tabelas.
- `handle_new_user()` — trigger `on_auth_user_created` (`AFTER INSERT ON auth.users`): cria `profiles` + `tenants` + `memberships` (role `owner`). **Pedra fundamental do onboarding.**

### 5.3 Trigger functions (regras de negócio)
| Trigger | Tabela / evento | Função |
|---|---|---|
| `trg_posts_reading_time` | posts BEFORE INS/UPD content | `calculate_reading_time()` |
| `trg_sync_og_image_with_cover` | posts BEFORE UPDATE | `sync_og_image_with_cover()` |
| `trg_limit_seo_history` | seo_analysis_history AFTER INSERT | `limit_seo_history()` (poda histórico) |
| `trg_ping_search_engines` | posts AFTER UPDATE (1ª publicação) | `net.http_post` p/ ping de search engines |
| `protect_is_admin_trigger` | profiles BEFORE UPDATE | `protect_is_admin()` (bloqueia auto-promoção) |
| `trg_check_self_follow` | author_follows BEFORE INSERT | `check_self_follow()` |
| `trg_notify_admins_blog_activated` | profiles AFTER UPD blog_enabled | `notify_admins_blog_activated()` |
| `trg_notify_admins_post_published` | posts AFTER INS/UPD status | `notify_admins_post_published()` |
| `trg_notify_author_followers` | posts AFTER INS/UPD | `notify_author_followers()` |
| `trg_feedback_threshold_notify` | session_feedback_responses AFTER INSERT | `notify_feedback_threshold()` |
| `trg_notify_feedback_individual` | session_feedback_responses AFTER INSERT | `notify_feedback_individual_response()` |

### 5.4 Functions / RPC (chamadas pelo cliente — ~60 no total)
Todas marcadas `SECURITY DEFINER` quando contornam RLS. Agrupadas:

**Auth/tenancy helpers (usados em RLS):** `get_user_tenant_id`, `user_owns_campaign`, `user_has_campaign_access`, `user_has_note_access`, `is_admin`, `has_role`, `get_user_blog_author_id`, `get_user_id_from_blog_author`.

**Acesso público por token (bypass de login):** `get_consent_form_info`, `submit_consent`, `get_feedback_config_by_token`, `submit_feedback_response`, `check_feedback_email`, `count_feedback_responses`, `count_feedback_views`, `record_feedback_view`, `get_feedback_responses`, `get_public_note`, `get_public_profile`, `get_public_profile_by_slug`, `get_profiles_public_data`, `get_author_by_blog_slug`, `search_profiles_for_linking`.

**Blog/posts:** `increment_post_view`, `get_trending_posts`, `get_reaction_counts`, `toggle_reaction`, `delete_own_reaction`, `get_author_daily_views`, `get_author_followers_count`, `generate_unique_slug_from_email`.

**Fila de e-mail (pgmq):** `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`.

**Academy/notif:** `get_annotation_kpis`, `consolidate_admin_annotations`, `update_preferred_push_hour`, `batch_reorder_course_lessons`, `batch_reorder_course_modules`, `get_my_share_invites`.

**Painel admin (retornam JSON agregado):** `admin_list_users`, `admin_count_users`, `admin_platform_stats`, `admin_notification_kpis`, `admin_feedback_summary`, `admin_feedback_ranking`, `admin_profile_insights`, `admin_user_activity_buckets`, `admin_recompute_engagement`, `admin_all_tags`, `admin_blog_author_stats`, `admin_cron_health`, `admin_db_size`, `admin_db_cache_hit`, `admin_long_queries`, `admin_infra_extended`, `admin_take_infra_snapshot`, `admin_storage_stats`, `admin_storage_ranking`, `admin_storage_usage_summary`, `admin_audit_storage_orphans`, `admin_scan_broken_media`, `admin_reconcile_media`, `admin_replace_content_url`, `get_edge_function_stats`, `get_user_storage_bytes`.

### 5.5 Storage buckets
| Bucket | Público? | Política de escrita |
|---|---|---|
| `profile-assets` | sim | pasta do próprio usuário (`(storage.foldername(name))[1] = auth.uid()`) |
| `blog-assets` | sim | apenas `is_admin(auth.uid())` |
| `email-assets` | sim | (admin) |
| `feedback-rewards` | sim | pasta do próprio usuário |
| `feedback-branding` | sim | pasta do próprio usuário |
| `finance-receipts` | (definido em `20260521000000_finance_management.sql`) | escopo de usuário/tenant |

### 5.6 Views
| View | Conteúdo |
|---|---|
| `public_profiles` | projeção pública de `profiles` (sem campos privados); FK lógica usada por `blog_authors.profile_id` |
| `finance_monthly_summary` | agregação mensal de `finance_transactions` por tenant (`gross_income_cents`, `net_income_cents`, `platform_fee_cents`, `withdrawal_cents`, `expense_cents`) |
| `academy_annotations_admin_view` | visão admin de `academy_annotations` |

---

## 6. Cron jobs (pg_cron)

Apenas **2 jobs registrados via SQL** nas migrations:

| Jobname | Schedule | Ação |
|---|---|---|
| `process-email-queue` | a cada ~5s | Verifica cooldown de rate-limit (`email_send_state.retry_after_until`) e se há mensagens nas filas pgmq `auth_emails`/`transactional_emails`; se sim, chama a Edge Function `process-email-queue` via `net.http_post` com a `service_role` key do Vault. (Registrado no `20260314195158_email_infra.sql`.) |
| `purge-edge-function-metrics` | `30 3 * * *` (03:30 diário) | `DELETE FROM public.edge_function_metrics WHERE created_at < now() - interval '30 days'`. Registrado defensivamente dentro de `IF EXISTS (pg_extension 'pg_cron')` em `20260522030052_...sql`. |

> Observação importante (`20260326000002_nps_retention_logic.sql`): há comentário explícito de que **o tier free do Supabase não permitia agendar cron nativo via SQL** à época — logo, jobs de NPS/reengajamento/push pendente eram disparados por agendador externo (Edge Functions + scheduler externo / GitHub Actions), não por `cron.schedule`. Na reconstrução, confirmar quais jobs precisam virar `pg_cron` reais na nova instância Supabase (que suporta pg_cron) — candidatos: processar `pending_push_queue`, `conditional_notification_logs`, reengajamento (`reengagement_logs`), recomputar `user_engagement_scores`, snapshot de `infra_snapshots`, consolidação de anotações.

---

## 7. Pendências / decisões para a Fase 1
- Confirmar se `adventures` (migration órfã), `_purge_backup_20260522` e `academy_annotations_consolidated` entram ou não no schema reconstruído.
- Mapear quais cron jobs "externos" do app antigo devem ser migrados para `pg_cron` nativo na nova instância.
- Levantar o conteúdo completo das ~60 functions/RPC (corpo SQL) na hora de portar — este doc cataloga assinaturas; os corpos vivem nas migrations e devem ser recriados verbatim ou idiomatizados.
- Validar a lista de storage buckets contra o painel real do Supabase antigo (pode haver bucket criado fora de migration).
