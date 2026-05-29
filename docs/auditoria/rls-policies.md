# Auditoria de RLS — QG do Mestre (Nuckturp) · pré-port do schema

> **Escopo:** auditoria política-por-tabela do projeto antigo (Vite/Lovable) **antes** de portar o schema para o Supabase próprio (Next.js).
> **Fonte (somente leitura):** `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp` — `supabase/migrations/` (209 arquivos), `supabase/manual-scripts/`, `src/integrations/supabase/types.ts`.
> **Data da auditoria:** 2026-05-29.
> **Método:** extração de todos os `CREATE/DROP POLICY`, `ENABLE/FORCE/DISABLE ROW LEVEL SECURITY`, `CREATE FUNCTION` de helpers de auth, `GRANT/REVOKE`, ordenados cronologicamente (a definição mais recente vence, como no Postgres). Cruzamento contra a lista canônica de 85 tabelas-base do `types.ts`.

---

## 0. Sumário executivo

- **85 tabelas-base** no `types.ts` (bloco `Tables`, fora Views/Functions).
- **85/85 com RLS habilitada** via migrations versionadas. **Nenhuma tabela sem RLS** dentro do schema versionado.
- **0 tabelas com `FORCE ROW LEVEL SECURITY`** → o `service_role` (e o owner da tabela) **ignora RLS** em todas. É o comportamento padrão do Supabase e esperado, mas deve ser consciente: toda escrita server-side com `service_role` bypassa as policies.
- **1 tabela fora do schema versionado:** `consent_links` existe no `types.ts` mas **não é criada em nenhuma migration** — vive em `supabase/manual-scripts/wave1_consent_foundation.sql` (tem RLS + policy tenant lá, mas fora do pipeline de migração).
- **3 helpers de autorização** (`get_user_tenant_id`, `is_admin`, `has_role`) + auxiliares (`user_has_campaign_access`, `user_owns_campaign`, `get_user_blog_author_id`) — **todos `SECURITY DEFINER` com `SET search_path`** (sem brecha de search_path).
- **Modelo de tenant:** 1 usuário → 1 membership → 1 tenant (criado no signup por `handle_new_user`). Isolamento multi-tenant feito majoritariamente por `tenant_id = get_user_tenant_id(auth.uid())`.
- **Sistema de roles migrado** de `profiles.is_admin` (coluna legada) para tabela dedicada `user_roles` (enum `app_role`: `admin`/`moderator`/`user`). `is_admin()`/`has_role()` leem de `user_roles`. **`user_roles` está protegida contra auto-promoção** (só admin gerencia).

**Top riscos (detalhe na seção 3):**

1. 🔴 `consent_links` (dados LGPD/consentimento de jogadores) **fora das migrations versionadas** — risco de não ser portado / ser portado sem RLS.
2. 🟠 `post_reactions` tem `FOR DELETE USING (true)` — **qualquer um deleta qualquer reaction** (mitigado só por convenção via RPC `delete_own_reaction`).
3. 🟠 Coluna legada `profiles.is_admin` coexiste com `user_roles` — fonte de verdade dupla de autorização; risco de divergência.
4. 🟡 Várias tabelas de catálogo Academy usam `auth.role() = 'authenticated'` / `USING (true)` para SELECT — leitura liberada a qualquer logado (provavelmente intencional, mas sem gate de assinatura/premium no nível do banco).
5. 🟡 `service_role`-only em filas/logs de e-mail depende de `auth.role() = 'service_role'` no `USING` em vez de `FORCE RLS` + revoke — funciona, mas é frágil se algum client herdar o papel errado.

---

## 1. Matriz por tabela

Legenda de **escopo**: `tenant` = `tenant_id = get_user_tenant_id(auth.uid())`; `user` = `user_id = auth.uid()` (ou equivalente); `admin` = `is_admin()`/`has_role(...,'admin')`; `público` = legível por `anon`/`authenticated` sem dono; `service` = só `service_role`; `derivado` = via EXISTS em tabela-pai.
Todas as 85 tabelas têm **RLS habilitada = Sim** e **deny-by-default = Sim** (RLS ligada sem policy permissiva equivale a negar). Onde houver brecha, está anotado.

### 1.1 Núcleo multi-tenant (TTRPG / QG)

| Tabela                    | Policies (cmd)                     | USING / WITH CHECK (resumo)                                                                                                                                                                            | Escopo                          | Risco                                                                                                     |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `tenants`                 | SELECT, UPDATE                     | SELECT: `id = get_user_tenant_id(uid)` · UPDATE: `owner_id = uid`                                                                                                                                      | tenant/owner                    | OK. Sem INSERT/DELETE explícito → criação só via `handle_new_user` (SECURITY DEFINER).                    |
| `memberships`             | SELECT                             | `user_id = uid`                                                                                                                                                                                        | user                            | OK. Sem INSERT/UPDATE/DELETE → imutável pelo client; gerenciado por trigger.                              |
| `profiles`                | SELECT×3, INSERT, UPDATE           | own: `uid = user_id`; público: `slug IS NOT NULL` (anon+auth); admin: `is_admin(uid)`. UPDATE com WITH CHECK que **trava `is_admin`** ao valor atual                                                   | user + público(slug) + admin    | 🟠 ver 3.3 (coluna `is_admin` legada).                                                                    |
| `campaigns`               | SELECT, INSERT, UPDATE, DELETE     | SELECT: `user_has_campaign_access(uid,id)` (owner via share); ins/upd/del: `tenant_id = get_user_tenant_id(uid)`                                                                                       | tenant + share                  | OK.                                                                                                       |
| `campaign_shares`         | SELECT, UPDATE, ALL                | recipiente: `shared_with_user_id = uid` (ver/aceitar)                                                                                                                                                  | user(recipiente) + owner        | OK.                                                                                                       |
| `adventures`¹             | SELECT, INSERT, UPDATE, DELETE     | mesmo padrão de `campaigns` (`user_has_campaign_access` / `tenant_id`)                                                                                                                                 | tenant + share                  | ¹ **Não está no `types.ts`** — tabela referenciada nas migrations mas ausente do tipo canônico. Ver 3.7.  |
| `sessions`                | SELECT, INSERT, UPDATE, DELETE     | SELECT: `user_has_campaign_access(uid,campaign_id)`; resto: `tenant_id`                                                                                                                                | tenant + share                  | OK.                                                                                                       |
| `session_players`         | INSERT, UPDATE, DELETE             | EXISTS em `sessions s` com `s.tenant_id = get_user_tenant_id(uid)`                                                                                                                                     | derivado(tenant)                | ⚠️ sem SELECT explícito (só ins/upd/del) → leitura negada por default. Verificar se a UI lê via join/RPC. |
| `players`                 | SELECT, INSERT, UPDATE, DELETE     | `tenant_id = get_user_tenant_id(uid)`                                                                                                                                                                  | tenant                          | OK.                                                                                                       |
| `player_campaigns`        | SELECT, INSERT, UPDATE, DELETE     | EXISTS em `campaigns c`/`players p` com tenant do user (recriada em `cb67fc5e` para usar `campaigns`)                                                                                                  | derivado(tenant)                | OK (policy antiga via `players` foi DROPada e recriada via `campaigns`).                                  |
| `character_inventory`     | INSERT, UPDATE, DELETE             | EXISTS `player_campaigns→campaigns` com tenant                                                                                                                                                         | derivado(tenant)                | ⚠️ sem SELECT explícito → leitura negada por default.                                                     |
| `character_relationships` | INSERT, UPDATE, DELETE             | EXISTS `player_campaigns→campaigns` com tenant                                                                                                                                                         | derivado(tenant)                | ⚠️ sem SELECT explícito.                                                                                  |
| `character_session_notes` | INSERT, UPDATE, DELETE             | EXISTS `sessions` com tenant                                                                                                                                                                           | derivado(tenant)                | ⚠️ sem SELECT explícito.                                                                                  |
| `notes`                   | SELECT×4, INSERT, UPDATE×2, DELETE | owner: `tenant_id`; share campanha: `user_has_campaign_access`; share direto: EXISTS `note_shares` aceito; editor: idem + `permission='editor'`; **público: `is_public AND public_token IS NOT NULL`** | tenant + share + público(token) | OK. Leitura pública por token é intencional (notas compartilhadas).                                       |
| `note_shares`             | ALL, SELECT, UPDATE, DELETE        | owner: `shared_by = uid`; recipiente: `shared_with_user_id = uid` **ou** `shared_with_email = jwt.email`                                                                                               | user(2 lados)                   | OK. Modelo final usa `shared_by`/email; policy inicial via tenant foi DROPada.                            |
| `folders`                 | SELECT, INSERT, UPDATE, DELETE     | `tenant_id = get_user_tenant_id(uid)`                                                                                                                                                                  | tenant                          | OK.                                                                                                       |
| `whiteboards`             | SELECT×2, INSERT, UPDATE, DELETE   | owner: `tenant_id`; share: `campaign_id IS NOT NULL AND user_has_campaign_access`                                                                                                                      | tenant + share                  | OK.                                                                                                       |
| `whiteboard_items`        | SELECT, INSERT, UPDATE, DELETE     | `tenant_id = get_user_tenant_id(uid)`                                                                                                                                                                  | tenant                          | OK.                                                                                                       |
| `dictionary_entries`      | SELECT, INSERT, UPDATE, DELETE     | SELECT: **`USING (true)`** (público); escrita: `is_admin(uid)`                                                                                                                                         | público(read) + admin(write)    | 🟡 leitura pública global — provavelmente intencional (dicionário/glossário).                             |
| `favorites`               | SELECT, INSERT, DELETE             | `user_id = uid`                                                                                                                                                                                        | user                            | OK.                                                                                                       |
| `journey_progress`        | SELECT, INSERT, DELETE             | `uid = user_id`                                                                                                                                                                                        | user                            | OK (sem UPDATE → progresso só append/replace).                                                            |
| `share_events`            | SELECT, INSERT, UPDATE, DELETE     | recipiente: `recipient_user_id = uid`; INSERT: `auth.uid() IS NOT NULL`                                                                                                                                | user(recipiente)                | 🟡 INSERT por qualquer autenticado (sem amarrar emissor); aceitável p/ convite.                           |

### 1.2 Blog / conteúdo público

| Tabela               | Policies (cmd)                           | USING / WITH CHECK (resumo)                                                                                                                                 | Escopo                              | Risco                                                                  |
| -------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `posts`              | 14 (SELECT, INSERT, UPDATE, DELETE, ALL) | público: `status='published' AND visibility='public'`; autor: `blog_author_id = get_user_blog_author_id(uid)` (com guarda de status); admin: `is_admin` ALL | público(publicados) + autor + admin | OK. Leitura pública restrita a publicados+públicos (intencional, SEO). |
| `post_categories`    | SELECT, ALL                              | SELECT: **`USING (true)`**; ALL: `is_admin(uid)`                                                                                                            | público(read) + admin               | 🟡 leitura pública (taxonomia) — intencional.                          |
| `blog_authors`       | SELECT, INSERT, UPDATE, ALL              | SELECT: **`USING (true)`** (perfis de autor públicos); escrita amarrada ao próprio autor/admin                                                              | público(read) + autor + admin       | 🟡 intencional (página de autor).                                      |
| `post_features`      | SELECT, UPDATE, ALL                      | leitura/destaque; admin gerencia                                                                                                                            | público(read?) + admin              | Verificar SELECT exato no port.                                        |
| `post_reactions`     | SELECT, INSERT, DELETE, ALL              | SELECT: **`USING (true)`**; INSERT: `anon/auth` se post publicado+público; **DELETE: `USING (true)`**                                                       | público                             | 🟠 **DELETE liberado a todos** — ver 3.2.                              |
| `post_view_events`   | SELECT×2                                 | admin/owner-derivado                                                                                                                                        | admin                               | Telemetria; sem leitura pública.                                       |
| `post_admin_actions` | ALL                                      | `is_admin(uid)`                                                                                                                                             | admin                               | OK.                                                                    |
| `category_requests`  | SELECT, INSERT, ALL                      | user: `requested_by = uid`; admin: ALL                                                                                                                      | user + admin                        | OK.                                                                    |
| `featured_links`     | SELECT, ALL                              | leitura ativa; admin gerencia                                                                                                                               | público(ativos)? + admin            | Verificar SELECT no port.                                              |
| `menu_items`         | SELECT, ALL                              | SELECT: `active = true`; ALL: `is_admin`                                                                                                                    | público(ativos) + admin             | OK (navegação).                                                        |
| `author_follows`     | SELECT×2, INSERT, DELETE                 | SELECT: **`USING (true)`** e `TO authenticated USING(true)`; ins/del: `user_id = uid`                                                                       | público(read) + user                | 🟡 contagem/lista de follows pública — intencional.                    |

### 1.3 Academy (cursos / livros / cards)

| Tabela                             | Policies (cmd)                                | USING / WITH CHECK (resumo)                                                     | Escopo                    | Risco                                                                                               |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| `academy_courses`                  | 6                                             | SELECT: `published=true` (auth) **e** `USING(true)` (auth); admin ALL           | auth(publicados) + admin  | 🟡 dois SELECTs sobrepostos (`published` e `true`) → efetivamente **todo logado lê tudo**. Ver 3.4. |
| `academy_course_modules`           | 6                                             | idem `courses` (`published` join + `USING(true)`; admin)                        | auth + admin              | 🟡 idem.                                                                                            |
| `academy_lessons`                  | 8                                             | idem (`published` join + `USING(true)`; admin)                                  | auth + admin              | 🟡 idem (8 policies, várias gerações sobrepostas).                                                  |
| `academy_course_progress`          | SELECT, INSERT, UPDATE, ALL                   | `user_id = uid` (own)                                                           | user                      | OK.                                                                                                 |
| `academy_completion_events`        | 7 (SELECT, INSERT, UPDATE)                    | own: `uid = user_id`; admin vê todos (via `user_roles`)                         | user + admin              | OK (várias gerações sobrepostas — consolidar no port).                                              |
| `academy_content_nps`              | 6 (SELECT, INSERT, UPDATE)                    | own: `uid = user_id`; **`Authenticated can view NPS` USING(true)**; admin todos | user + auth(read) + admin | 🟡 NPS legível por qualquer logado via `USING(true)` — revisar.                                     |
| `academy_cards`                    | SELECT×2, ALL                                 | `published=true` (auth) / admin                                                 | auth(publicados) + admin  | OK.                                                                                                 |
| `academy_settings`                 | SELECT, UPDATE                                | SELECT: **`USING(true)`** (auth); UPDATE admin                                  | auth(read) + admin        | OK.                                                                                                 |
| `academy_books`                    | SELECT, ALL                                   | `published=true AND auth.role()='authenticated'`; admin ALL                     | auth(publicados) + admin  | OK.                                                                                                 |
| `academy_book_sessions`            | SELECT, ALL                                   | `published` + livro publicado; admin                                            | auth(publicados) + admin  | OK.                                                                                                 |
| `academy_book_pages`               | SELECT, ALL                                   | `auth.role()='authenticated'` + EXISTS sessão→livro publicado; admin            | auth(derivado) + admin    | OK.                                                                                                 |
| `academy_reading_progress`         | ALL                                           | `user_id = uid`                                                                 | user                      | OK.                                                                                                 |
| `academy_annotations`              | SELECT, INSERT, UPDATE, DELETE, +admin SELECT | `tenant_id = get_user_tenant_id(uid)`; admin lê todas                           | tenant + admin            | OK (DROP+recreate idempotente).                                                                     |
| `academy_annotations_consolidated` | ALL                                           | `is_admin(uid)`                                                                 | admin                     | OK.                                                                                                 |

### 1.4 Admin / infra / e-mail / telemetria

| Tabela                           | Policies (cmd)                      | USING / WITH CHECK (resumo)                                                              | Escopo                 | Risco                                                                                                       |
| -------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `user_roles`                     | ALL                                 | `is_admin(uid)` (gerencia)                                                               | admin                  | ✅ **protegida contra auto-promoção** (ver 3.6). Sem SELECT próprio (lido só por funções SECURITY DEFINER). |
| `site_settings`                  | SELECT, INSERT, UPDATE              | SELECT: **`USING(true)`**; escrita: `is_admin`                                           | público(read) + admin  | 🟡 settings legíveis publicamente — checar se há segredo nessa tabela.                                      |
| `admin_cost_settings`            | SELECT, ALL                         | `is_admin(uid)`                                                                          | admin                  | OK.                                                                                                         |
| `admin_master_notes`             | ALL                                 | `is_admin(uid)`                                                                          | admin                  | OK.                                                                                                         |
| `premium_overrides`              | SELECT, ALL                         | own: `user_id = uid` (lê o próprio); admin ALL                                           | user(read own) + admin | OK.                                                                                                         |
| `infra_snapshots`                | ALL                                 | `is_admin(uid)`                                                                          | admin                  | OK.                                                                                                         |
| `edge_function_metrics`          | SELECT                              | `is_admin` (+ função `get_edge_function_stats` grant authenticated, revoke public)       | admin                  | OK.                                                                                                         |
| `ai_usage_logs`                  | SELECT×2, INSERT                    | own: `uid = user_id`; admin lê todos                                                     | user + admin           | OK.                                                                                                         |
| `pwa_events`                     | SELECT, INSERT                      | INSERT own (`uid=user_id`); admin lê                                                     | user(insert) + admin   | OK.                                                                                                         |
| `pwa_events`/`reengagement_logs` | SELECT                              | `is_admin`                                                                               | admin                  | OK (sem leitura do próprio usuário).                                                                        |
| `user_engagement_scores`         | SELECT                              | `is_admin`                                                                               | admin                  | OK.                                                                                                         |
| `user_access_hours`              | SELECT, INSERT                      | `user_id = uid`                                                                          | user                   | OK (sem UPDATE/DELETE).                                                                                     |
| `seo_analysis_history`           | SELECT, INSERT                      | `user_id = uid`                                                                          | user                   | OK.                                                                                                         |
| `link_analysis_results`          | ALL                                 | `is_admin`                                                                               | admin                  | OK.                                                                                                         |
| `link_corrections_log`           | ALL                                 | `is_admin`                                                                               | admin                  | OK.                                                                                                         |
| `link_url_mappings`              | ALL                                 | `is_admin`                                                                               | admin                  | OK.                                                                                                         |
| `conditional_notifications`      | ALL                                 | `is_admin`                                                                               | admin                  | OK.                                                                                                         |
| `conditional_notification_logs`  | ALL                                 | `is_admin`                                                                               | admin                  | OK.                                                                                                         |
| `notifications`                  | SELECT, ALL                         | SELECT: EXISTS em `user_notifications` do uid; admin ALL                                 | derivado(user) + admin | OK.                                                                                                         |
| `user_notifications`             | SELECT, UPDATE, DELETE, ALL         | `user_id = uid`; admin ALL                                                               | user + admin           | OK.                                                                                                         |
| `pending_push_queue`             | ALL                                 | `is_admin`                                                                               | admin                  | OK (fila gerenciada server/admin).                                                                          |
| `push_subscriptions`             | SELECT, ALL                         | admin vê; own gerencia                                                                   | user + admin           | Verificar policy own no port.                                                                               |
| `banned_emails`                  | ALL                                 | `is_admin`                                                                               | admin                  | OK.                                                                                                         |
| `suppressed_emails`              | SELECT, INSERT                      | `auth.role() = 'service_role'`                                                           | service                | 🟡 confia no papel no `USING` (ver 3.5).                                                                    |
| `email_send_log`                 | SELECT, INSERT, UPDATE              | `auth.role() = 'service_role'`                                                           | service                | 🟡 idem.                                                                                                    |
| `email_send_state`               | ALL                                 | (fila de envio) service                                                                  | service                | 🟡 idem.                                                                                                    |
| `email_unsubscribe_tokens`       | SELECT, INSERT, UPDATE              | tokens de descadastro                                                                    | service/derivado       | Verificar no port (LGPD).                                                                                   |
| `email_pipeline_settings`        | ALL                                 | `is_admin`                                                                               | admin                  | OK.                                                                                                         |
| `content_templates`              | SELECT, INSERT, UPDATE, DELETE, ALL | globais: `is_global AND active` (auth lê); próprios: `user_id = uid AND is_global=false` | auth(globais) + user   | OK.                                                                                                         |

### 1.5 Feedback de sessão (NPS pós-mesa, fluxo anônimo intencional)

| Tabela                         | Policies (cmd)     | USING / WITH CHECK (resumo)                                                                                                            | Escopo                          | Risco                                                                                                                  |
| ------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `session_feedback_configs`     | SELECT, ALL        | SELECT: `active = true` (anon+auth, por token); ALL: tenant/owner                                                                      | público(ativos) + tenant        | OK (formulário público por token).                                                                                     |
| `session_feedback_responses`   | SELECT, INSERT     | INSERT: `anon/auth` com EXISTS config `active=true` (versão endurecida) — versão antiga era `WITH CHECK(true)`; SELECT: owner-derivado | público(insert) + owner         | 🟡 versão antiga `WITH CHECK(true)` foi substituída por gate de config ativa (bom). Confirmar que só a nova é portada. |
| `session_feedback_ai_analyses` | ALL                | EXISTS config com tenant do owner                                                                                                      | tenant(derivado)                | OK.                                                                                                                    |
| `feedback_view_events`         | SELECT×2, INSERT×2 | INSERT: anon/public (`true` antigo → endurecido p/ config ativa); SELECT: owner-derivado + admin                                       | público(insert) + owner + admin | 🟡 telemetria de view por anônimo — intencional.                                                                       |

### 1.6 LGPD / consentimento (fora das migrations versionadas)

| Tabela          | RLS                    | Policies                                                                                                                                                     | Escopo               | Risco                                                                                                 |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------- |
| `consent_links` | Sim (no manual-script) | `consent_links_tenant_manage` FOR ALL: `tenant_id = (SELECT tenant_id FROM memberships WHERE user_id = uid)`; acesso anônimo **só via RPC SECURITY DEFINER** | tenant + RPC pública | 🔴 **definida só em `manual-scripts/wave1_consent_foundation.sql`, ausente das migrations**. Ver 3.1. |

### 1.7 Storage (buckets) — `storage.objects`

26 policies em `storage.objects`. Padrões:

- `feedback-rewards`: upload/update/delete por `(storage.foldername(name))[1] = auth.uid()::text` (pasta = uid); SELECT **público** (`TO public`). Intencional (imagens de recompensa exibidas no formulário).
- `feedback-branding`: SELECT público.
- `blog-assets`: insert/update/delete só `is_admin`.
- `finance-receipts`: read/upload/update/delete por `auth.uid()::text = (storage.foldername(name))[1]` (privado por dono). OK.

---

## 2. Helpers de autorização

Todos no schema `public`, **`SECURITY DEFINER`**, **`STABLE`**, e **com `SET search_path`** fixado (`public`) — fecha a brecha clássica de search_path hijacking em SECURITY DEFINER.

| Função                                                                                                                 | Assinatura                      | Faz                                                                        | search_path                      | Observação                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `get_user_tenant_id(uuid)`                                                                                             | RETURNS uuid, `LANGUAGE sql`    | `SELECT tenant_id FROM memberships WHERE user_id = _user_id LIMIT 1`       | `SET search_path = public` ✅    | Base de todo isolamento multi-tenant. `LIMIT 1` assume 1 tenant/usuário (verdadeiro no modelo atual). Se um dia houver multi-tenant por usuário, isto vaza/limita. |
| `is_admin(uuid)`                                                                                                       | RETURNS boolean, `LANGUAGE sql` | `EXISTS(SELECT 1 FROM user_roles WHERE user_id=_user_id AND role='admin')` | `SET search_path TO 'public'` ✅ | Fonte de verdade atual de admin = `user_roles` (não mais `profiles.is_admin`).                                                                                     |
| `has_role(uuid, app_role)`                                                                                             | RETURNS boolean, `LANGUAGE sql` | `EXISTS(SELECT 1 FROM user_roles WHERE user_id=_user_id AND role=_role)`   | `SET search_path = public` ✅    | Genérico p/ `admin`/`moderator`/`user`.                                                                                                                            |
| `user_has_campaign_access(uuid,uuid)`                                                                                  | RETURNS boolean                 | `EXISTS` em `campaign_shares` com `accepted=true`                          | `SET search_path = 'public'` ✅  | Cobre só compartilhamento aceito — **não cobre o owner**. As policies combinam com `tenant_id` para o owner.                                                       |
| `user_owns_campaign(uuid,uuid)`                                                                                        | RETURNS boolean                 | `EXISTS` campaigns JOIN memberships                                        | `SET search_path = 'public'` ✅  | Pouco usada nas policies finais (preferem `tenant_id` direto).                                                                                                     |
| `get_user_blog_author_id(uuid)`                                                                                        | RETURNS uuid                    | profile→blog_author do user                                                | `SET search_path = 'public'` ✅  | Usada nas policies de `posts`.                                                                                                                                     |
| `get_public_profile(text)` / `get_public_profile_by_slug` / `get_profiles_public_data` / `search_profiles_for_linking` | RPCs RETURNS TABLE              | exposição **curada** de colunas públicas de `profiles` por slug            | `SET search_path = public` ✅    | Boa prática: expõe só colunas públicas, evita `SELECT *` em `profiles`.                                                                                            |
| `handle_new_user()`                                                                                                    | TRIGGER plpgsql                 | cria profile+tenant+membership no signup                                   | `SET search_path = public` ✅    | Trigger `AFTER INSERT ON auth.users`. **Crítico para o cutover** (preservar UUIDs).                                                                                |

> **Risco residual de search_path:** nenhum encontrado. Todas as funções auditadas fixam `search_path`. **Replicar verbatim** no port; não remover o `SET search_path`.

---

## 3. 🔴 Achados de risco priorizados

### 3.1 🔴 `consent_links` (dados de consentimento LGPD) está FORA das migrations versionadas

- A tabela existe no `types.ts` (logo, existe em produção), mas **nenhuma migration em `supabase/migrations/` a cria**. Ela só aparece em `supabase/manual-scripts/wave1_consent_foundation.sql` (+ `wave1_fix_submit_consent.sql`, `wave1_contact_fields.sql`).
- Lá ela **tem** RLS + policy tenant-scoped + acesso anônimo só por RPC `SECURITY DEFINER` — desenho correto. O problema é de **processo/migração**, não de policy.
- **Impacto no port:** se o port reconstruir o schema a partir de `migrations/`, `consent_links` (e suas RPCs de submit/consent) **não serão criadas**, ou serão criadas à mão sem RLS por engano. Dados de consentimento sem RLS = exposição cross-tenant de PII de jogadores.
- **Ação:** inventariar TODO o conteúdo de `manual-scripts/` e converter em migrations versionadas idempotentes antes do port. Tratar `consent_links` como tabela de PII sensível.

### 3.2 🟠 `post_reactions` — `FOR DELETE USING (true)`

- Policy `"Anyone can delete own reactions" ON post_reactions FOR DELETE USING (true)` permite que **qualquer usuário delete a reaction de qualquer outro**. O nome sugere "own", mas a expressão não filtra dono.
- A integridade depende inteiramente da RPC `delete_own_reaction` (camada de app), não do banco. Um client com a chave anon e o SDK pode deletar reactions alheias direto na tabela.
- **Ação no port:** endurecer para `USING (user_id = auth.uid())` (ou o identificador de dono real da reaction). Não replicar verbatim.

### 3.3 / 3.6 Sistema de roles — duas fontes de verdade

- **Histórico:** autorização começou com coluna `profiles.is_admin` (booleano). A migration `20260223105810` endureceu o UPDATE de `profiles` para **impedir auto-promoção** via `WITH CHECK (... is_admin = (SELECT is_admin FROM profiles WHERE user_id = uid))` — ou seja, o usuário não consegue mudar o próprio `is_admin`.
- Depois, `20260311005414` introduziu a tabela dedicada **`user_roles`** (enum `app_role`) e reescreveu `is_admin()`/`has_role()` para lerem de `user_roles`.
- **`user_roles` está protegida contra auto-promoção** ✅: única policy é `"Admins can manage roles" FOR ALL USING (is_admin(uid)) WITH CHECK (is_admin(uid))`. Um não-admin **não** consegue inserir/alterar a própria role (RLS nega, pois `is_admin(uid)` é falso). Não há SELECT próprio — `user_roles` é lida só pelas funções `SECURITY DEFINER`, o que é seguro.
- **Risco 🟠:** a coluna legada `profiles.is_admin` ainda existe no schema. Se algum código/policy antigo ainda a consultar, há **divergência possível** entre `profiles.is_admin` e `user_roles`. Confusão de "qual é a fonte de verdade".
- **Ação no port:** adotar **`user_roles` como única fonte**; remover/aposentar `profiles.is_admin` (ou mantê-la apenas como espelho read-only). Manter o padrão `user_roles` + enum `app_role` (é o padrão recomendado pelo Supabase justamente para evitar privilege-escalation via coluna na própria linha do usuário).

### 3.4 🟡 Catálogo Academy com SELECT efetivamente liberado a todo logado

- `academy_courses`, `academy_course_modules`, `academy_lessons` acumulam **policies SELECT sobrepostas**: uma versão restringe a `published=true`, mas a migration `2cafe617` adicionou `"Anyone authenticated can read ..." USING (true)`. Como policies RLS são **OR** entre si, o resultado líquido é: **qualquer usuário autenticado lê todo o catálogo, publicado ou não** (rascunhos inclusos).
- `academy_content_nps` tem `"Authenticated can view NPS" USING(true)` → respostas de NPS legíveis por qualquer logado.
- **Provavelmente parcialmente intencional** (catálogo é "grátis para logados"), mas **rascunhos não-publicados vazam** e não há gate de assinatura/premium no banco (o gate premium vive em `premium_overrides`/app, não nessas policies).
- **Ação no port:** decidir explicitamente o modelo (catálogo aberto a logados? só publicados? gate premium no banco?). Consolidar as policies SELECT sobrepostas em uma só, sem `USING(true)` acidental sobre rascunhos.

### 3.5 🟡 Filas/logs de e-mail confiam em `auth.role() = 'service_role'` no USING

- `email_send_log`, `email_send_state`, `suppressed_emails` usam `USING (auth.role() = 'service_role')` em vez de `FORCE ROW LEVEL SECURITY` + `REVOKE` de roles client.
- Funciona (o `service_role` JWT tem esse claim), mas é frágil: depende do claim do JWT, não de um deny-by-default forte. Tabelas contêm PII (e-mails, status de envio).
- **Ação no port:** preferir o padrão Supabase: RLS ligada **sem** policy para `anon`/`authenticated` (deny total) + `REVOKE ALL ... FROM anon, authenticated` + acesso só via `service_role` (que bypassa RLS) ou RPC `SECURITY DEFINER` específica. As funções de fila (`enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`) já fazem `REVOKE FROM PUBLIC` + `GRANT TO service_role` ✅ — replicar esse padrão também nas tabelas.

### 3.7 🟡 Tabelas-sem-SELECT e tabela-fantasma `adventures`

- **`adventures`**: tem policies completas nas migrations (`user_has_campaign_access`/`tenant_id`) mas **não consta no `types.ts`** atual. Pode ser tabela renomeada/depreciada (provável fusão em `campaigns`/`sessions`). Confirmar no port se deve ser portada ou descartada.
- **`session_players`, `character_inventory`, `character_relationships`, `character_session_notes`**: têm INSERT/UPDATE/DELETE mas **nenhuma policy SELECT** → leitura negada por default. Se a UI antiga lia essas linhas, era via join coberto por outra tabela ou via RPC. **Verificar no port** se falta uma policy SELECT (senão a feature "ler inventário/relações do personagem" quebra silenciosamente — ou já dependia de RPC).

### 3.8 🟡 Leituras públicas (`USING(true)` / `TO anon`) — inventário do que é público

Confirmar que cada uma é **intencional** antes de replicar:

- **Intencionais (SEO/feature pública):** `posts` (só publicados+públicos), `post_categories`, `blog_authors`, `profiles` (só `slug IS NOT NULL`, via policy + RPCs curadas), `menu_items` (ativos), `dictionary_entries`, `author_follows`, `notes` (só `is_public AND public_token`), `session_feedback_configs` (ativos, por token), storage `feedback-rewards`/`feedback-branding`.
- **Revisar:** `site_settings` (`USING(true)` — garantir que não há segredo/flag sensível nessa tabela exposto a anon), `academy_*` (3.4), `academy_content_nps` (3.4).

### 3.9 Observações estruturais

- **Nenhuma tabela com `FORCE RLS`** → owner/`service_role` sempre bypassam. Aceitável, mas todo acesso server-side com `service_role` deve ser tratado como "fora da RLS" e validado na camada de app/Route Handler.
- **Muitas policies foram DROPadas e recriadas** ao longo de 209 migrations. O estado **efetivo** (última geração) é o que esta auditoria reflete. No port, **não replicar as gerações intermediárias** — partir do estado final consolidado.

---

## 4. Recomendações para a reescrita (Fase 6.3)

### 4.1 Replicar verbatim (estão corretos)

- Os 3 helpers (`get_user_tenant_id`, `is_admin`, `has_role`) e auxiliares — **mantendo `SECURITY DEFINER` + `SET search_path = public`**.
- O padrão de isolamento `tenant_id = get_user_tenant_id(auth.uid())` em todas as tabelas do núcleo TTRPG.
- `user_roles` + enum `app_role` como **único** sistema de roles, com a policy admin-only (proteção anti-auto-promoção).
- `handle_new_user()` (trigger de signup) — **crítico para o cutover** (preservar UUIDs de `auth.users`/`auth.identities`/`email_confirmed_at`, conforme guardrail 3 do projeto). Portar a função e o trigger, mas validar que a migração de dados de usuários não dispara o trigger de forma duplicada.
- RPCs curadas de perfil público (`get_public_profile*`) — expõem só colunas públicas; manter para não vazar colunas privadas de `profiles`.
- Padrão `REVOKE FROM PUBLIC` + `GRANT TO service_role` nas funções de fila de e-mail.

### 4.2 Endurecer no port (NÃO replicar verbatim)

1. **`post_reactions` DELETE:** `USING (user_id = auth.uid())` no lugar de `USING (true)`. (3.2)
2. **Roles:** aposentar `profiles.is_admin`; `user_roles` como fonte única. (3.3)
3. **Academy SELECT:** remover os `USING(true)` acidentais sobre `academy_courses/modules/lessons` que expõem rascunhos; consolidar numa policy `published = true` (+ admin) e decidir gate premium explícito. (3.4)
4. **Tabelas de e-mail (`email_send_log`, `email_send_state`, `suppressed_emails`):** RLS deny-by-default + `REVOKE ALL FROM anon, authenticated`, acesso só via `service_role`/RPC. (3.5)
5. **`academy_content_nps`:** remover `USING(true)` de SELECT; restringir a owner+admin. (3.4)
6. **Adicionar policies SELECT** onde a leitura é necessária mas hoje só há ins/upd/del (`session_players`, `character_*`) — ou confirmar que o acesso é por RPC e documentar. (3.7)
7. **`site_settings`:** confirmar ausência de segredos antes de manter `USING(true)`; se houver, separar tabela pública vs. privada. (3.8)

### 4.3 Processo / migração

- **Converter `manual-scripts/` em migrations versionadas idempotentes** (especialmente `consent_links` e suas RPCs de consentimento — PII/LGPD). Não portar o schema só a partir de `migrations/`, pois `consent_links` ficaria de fora. (3.1)
- **Decidir o destino de `adventures`** (portar vs. descartar) — está nas migrations mas não no `types.ts`. (3.7)
- **Consolidar policies** a partir do estado final (não replicar as ~243 gerações intermediárias). Gerar o schema RLS novo a partir desta matriz, não do replay das migrations.
- **Considerar `FORCE RLS`** em tabelas de PII (`consent_links`, e-mails, `profiles`) se houver risco de algum fluxo usar o owner/`service_role` indevidamente — avaliar custo/benefício.
- **Teste de isolamento multi-tenant** na Fase 6.3: criar 2 tenants e provar (via testes) que tenant A nunca lê/escreve linhas de tenant B em cada tabela do núcleo. Cobrir explicitamente as tabelas "sem SELECT" (3.7).

---

### Anexo — números

- Tabelas-base (`types.ts`): **85** · com RLS habilitada: **85** · sem RLS no schema versionado: **0** (`consent_links` está fora das migrations).
- `CREATE POLICY` totais (todas as gerações): ~298 em 84 arquivos; statements relevantes consolidados: ~243.
- Policies em `storage.objects`: 26.
- Tabelas com leitura pública (`anon`/`USING(true)`): ~11 (maioria intencional).
- Helpers de auth `SECURITY DEFINER` com search_path fixo: **100%** dos auditados.
