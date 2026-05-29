# Inventário — Edge Functions (Deno / Supabase)

> Catálogo das 26 Edge Functions do projeto antigo (`D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp\supabase\functions`).
> Fonte: SOMENTE LEITURA. Este doc serve de referência de paridade para a reescrita Next.js.
>
> **Observações transversais:**
> - **TODAS** as 26 functions respondem CORS com `Access-Control-Allow-Origin: *` (wildcard) — nenhuma restringe origem. A maioria usa o mesmo bloco `corsHeaders` com `Access-Control-Allow-Headers` longo (inclui headers `x-supabase-client-*` e, no `auth-email-hook`, `x-lovable-*`). Ao reescrever, considerar restringir origem a `nuckturp.com.br`.
> - **Provedor de IA = Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`, env `LOVABLE_API_KEY`), expondo modelos **Google Gemini** (`gemini-3-flash-preview`, `gemini-2.5-flash`). NÃO usa OpenAI/Anthropic direto. **Este é um ponto de lock-in Lovable a ser substituído** (provavelmente por Gemini API direto ou outro provedor) na migração.
> - **Provedor de e-mail = Lovable Email** (`@lovable.dev/email-js`, env `LOVABLE_API_KEY` + `LOVABLE_SEND_URL`). NÃO usa Resend/SendGrid. Outro lock-in Lovable.
> - `SUPABASE_SERVICE_ROLE_KEY` = bypassa RLS. A grande maioria das functions cria client com service_role (admin) e faz a autorização manualmente (valida JWT do usuário + checa `user_roles.role = 'admin'` ou `memberships.tenant_id`). Cuidado na reescrita: o service_role só pode existir no server.
> - `config.toml` define `verify_jwt` por função. Funções com `verify_jwt = false` (públicas): `auth-email-hook`, `billing`, `fetch-og-image`, `scraper`, `send-push`, `rss`, `sitemap`. As demais exigem JWT no gateway. Functions `og-proxy`, `og-profile-image`, `redirect-legacy`, `instagram-thumbnail`, `ping-search-engines`, `process-*` não aparecem no `config.toml` (default = `verify_jwt = true`, mas várias são chamadas internamente com service_role ou são públicas via Cloudflare Worker).

---

## Tabela-resumo

| Function | Propósito | Secrets / env | Deps externas | CORS |
|---|---|---|---|---|
| **admin-users** | Router gigante (~2.5k linhas) do painel admin: usuários, métricas, Stripe stats, infra health, notificações, billing admin | SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY, PUBLISHABLE_KEY, STRIPE_SECRET_KEY | Stripe (v14), invoca `send-push` | `*` |
| **analyze-feedback** | IA: analisa feedback de sessões de RPG (sessão única + overview admin do mestre) | SUPABASE_URL, SERVICE_ROLE_KEY, LOVABLE_API_KEY | Lovable AI Gateway (gemini-2.5-flash); invoca `check-subscription` | `*` |
| **analyze-post-links** | Admin: varre links de posts/dicionário, detecta quebrados, sugere correções | SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY | fetch HEAD/GET de URLs externas | `*` |
| **apply-link-corrections** | Admin: aplica correções de href em posts (com backup/log) | SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY | — | `*` |
| **auth-email-hook** | Webhook de auth do Supabase → renderiza React Email e enfileira (não envia direto) | LOVABLE_API_KEY, SUPABASE_URL, SERVICE_ROLE_KEY | Lovable Webhooks/Email-js, React Email; RPC `enqueue_email` | `*` (+ headers x-lovable-*) |
| **billing** | Router Stripe: `check` / `checkout` / `portal` / `invoices` | SUPABASE_URL, SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, PREMIUM_OVERRIDE_EMAILS | Stripe (v18) | `*` |
| **fetch-og-image** | Busca og:image/twitter:image/title de uma URL (usuário autenticado) | SUPABASE_URL, ANON_KEY | fetch HTML externo | `*` |
| **finance-extract-receipt** | IA-visão: extrai dados de recibo/NF (bucket privado), só sugere | SUPABASE_URL, SERVICE_ROLE_KEY, LOVABLE_API_KEY | Lovable AI Gateway (gemini-3-flash, multimodal); **Storage** (`finance-receipts`) | `*` |
| **generate-adventure** | IA: gera sinopse de aventura (stream SSE) + `check-system` | SUPABASE_URL, SERVICE_ROLE_KEY, LOVABLE_API_KEY | Lovable AI Gateway (gemini-3-flash); `withMetrics` | `*` |
| **import-wordpress** | Admin: importa XML WXR do WordPress (preview/import/sync categorias) | SUPABASE_URL, SERVICE_ROLE_KEY | Gravatar (MD5); parsing XML | `*` |
| **instagram-thumbnail** | Proxy de thumbnail de post do Instagram (retorna binário) | — (nenhum) | Instagram media/oEmbed/og:image | `*` |
| **og-profile-image** | Gera OG image 1200×630 (SVG) dinâmica de perfil de mestre | SUPABASE_URL, SERVICE_ROLE_KEY | fetch de avatar → base64 | `*` |
| **og-proxy** | Serve meta tags OG para crawlers (SPA não executa JS); redirect p/ humanos | SUPABASE_URL, SERVICE_ROLE_KEY | RPCs `get_public_note`, `get_feedback_config_by_token` | `*` |
| **optimize-images** | Admin: PNG/JPEG → WebP em lote no bucket blog-assets | SUPABASE_URL, SERVICE_ROLE_KEY | Supabase Image Transform + weserv.nl; **Storage** (`blog-assets`); RPCs | `*` |
| **ping-search-engines** | Notifica Google/Bing (sitemap ping) + IndexNow (Bing/Yandex) | — (chave IndexNow hardcoded) | Google/Bing ping, IndexNow | `*` |
| **process-conditional-notifications** | Avalia regras de notificação condicional por perfil de usuário | SUPABASE_URL, SERVICE_ROLE_KEY | — (provável cron) | `*` |
| **process-email-queue** | Dispatcher de fila de e-mail (PGMQ); só `service_role` | LOVABLE_API_KEY, LOVABLE_SEND_URL, SUPABASE_URL, SERVICE_ROLE_KEY | Lovable Email-js; RPC `read_email_batch`; **cron** | (sem CORS — só service_role) |
| **process-push-queue** | Cron 5min: agrupa/envia fila de push; invoca `send-push` | SUPABASE_URL, SERVICE_ROLE_KEY | invoca `send-push`; `withMetrics`; **cron** | `*` |
| **process-scheduled-posts** | Cron 2x/dia (pg_cron 07h/19h BRT): publica posts agendados + notifica | SUPABASE_URL, SERVICE_ROLE_KEY | invoca push/notif; **cron** | `*` |
| **redirect-legacy** | 301/410 de URLs antigas do WordPress → novas rotas | SUPABASE_URL, SERVICE_ROLE_KEY | — | `*` |
| **rss** | Feed RSS 2.0 do blog (Media RSS, content:encoded) | SUPABASE_URL, SERVICE_ROLE_KEY | — | (sem CORS; Content-Type RSS) |
| **scraper** | Router de scraping: `mesaquest` (HTML) / `worldcraft` (Firecrawl) | FIRECRAWL_API_KEY | Firecrawl (worldcraft); fetch HTML (mesaquest) | `*` |
| **send-push** | Web Push (VAPID/RFC 8291) — cripto manual; só admin | SUPABASE_URL, SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT | push services (FCM/Mozilla via endpoint) | `*` |
| **seo-specialist** | IA: sugere/revisa metadados SEO de post (tool calling) | SUPABASE_URL, ANON_KEY, LOVABLE_API_KEY | Lovable AI Gateway (gemini-3-flash) | `*` |
| **session-prep-check** | IA: checklist/análise de preparo de sessão | SUPABASE_URL, SERVICE_ROLE_KEY, LOVABLE_API_KEY | Lovable AI Gateway (gemini-3-flash); RPC `get_user_tenant_id` | `*` |
| **sitemap** | Sitemap index + sub-sitemaps paginados (posts/profiles/dicionário/etc.) | SUPABASE_URL, SERVICE_ROLE_KEY | — | (sem CORS; Content-Type XML) |

---

## `_shared/` (utilitários comuns)

- **`withMetrics.ts`** — Wrapper portátil de instrumentação. Envolve um handler `Deno.serve` e registra cada invocação em `public.edge_function_metrics` (status, duração ms, mensagem de erro, request_id, user_id extraído do JWT) de forma **fire-and-forget** (não bloqueia resposta; nunca quebra a função). Reaproveita um client Supabase service_role único entre warm starts. Pula preflight `OPTIONS`. Usado por: `generate-adventure`, `finance-extract-receipt`, `process-push-queue`. **Independe do painel do provedor** — observação útil para a migração (mantém métricas próprias no Postgres).
- **`email-templates/`** — Templates React Email (`.tsx`): `signup`, `invite`, `magic-link`, `recovery`, `email-change`, `reauthentication`. Consumidos por `auth-email-hook` (renderiza via `@react-email/components`).

---

## Detalhe por function

### admin-users
- **Propósito:** Router monolítico (~2554 linhas) que centraliza todo o backend do painel administrativo.
- **HTTP/payload:** `GET` (action via querystring) e `POST` (action via querystring). Dezenas de actions. GET: `list-all-tags`, `list-users` (paginação/sort/filtros), `recompute-engagement`, `stats`, `retention-cohorts`, `activation-funnel`, `stripe-stats`, `cost-settings`, `ai-details`, `db-row-counts`, `blog-author-stats`, `blog-post-ranking`, `storage-usage`, `daily-signups`, `infra-health/-extended/-history/-snapshot`, `admin-actions`, `email-pipeline-settings`, `email-logs-enriched`, `usability-dashboard`, `pwa-stats`. POST: `toggle-email-pipeline`, `save-cost-settings`, `create-user`, `update-user`, `reset-password`, `set-premium`, `remove-premium`, `ban-user`, `unban-email`, `list-banned`, `preview-notification`, `notification-metrics`, `send-notification`. **Resposta:** JSON variável por action.
- **Auth:** valida JWT → exige `user_roles.role = 'admin'` (403 se não). Usa service_role (bypassa RLS).
- **Secrets:** SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY/PUBLISHABLE_KEY, STRIPE_SECRET_KEY.
- **Deps:** Stripe (`stripe@14.21.0`, apiVersion 2023-10-16 e uma chamada 2025-08-27.basil); invoca `send-push`; chama RPCs admin (`admin_list_users`, `admin_count_users`, `admin_db_cache_hit`, `admin_long_queries`, `admin_db_size`, `admin_infra_extended`, `admin_take_infra_snapshot`, etc.) e endpoints REST internos.
- **Storage/Realtime/cron:** lê auth.users (service_role); sem cron.

### analyze-feedback
- **Propósito:** Gera análise construtiva de feedback de sessão de RPG via IA. Dois modos.
- **HTTP/payload:** `POST` JSON. Modo sessão: `{ config_id }`. Modo admin overview: `{ master_overview: true, master_user_id }`. **Resposta:** `{ success, analysis }` (tool calling estruturado: `compliments[]`, `improvement`, `study_suggestion`, `summary`) ou `{ success, content }` (overview, texto livre).
- **Auth:** JWT obrigatório; modo overview exige admin; modo sessão valida `memberships.tenant_id`. Limite de 2 análises/mês para free (checa `ai_usage_logs`); exige ≥80% das respostas esperadas.
- **Deps:** Lovable AI Gateway (`google/gemini-2.5-flash`, temperature 0.7, tool calling); invoca `check-subscription`. Loga em `ai_usage_logs`.

### analyze-post-links
- **Propósito:** Varre links em posts e entradas do dicionário, detecta quebrados/redirects, sugere correção (memória de/para em `link_url_mappings`).
- **HTTP/payload:** `POST` JSON `{ post_ids[], dictionary_entry_ids[], check_external=false, max_posts=5 }`. **Resposta:** `{ analyzed, results: LinkResult[] }` (com `http_status`, `link_type`, `status: ok|broken|redirect|mapped|unknown`, `context_snippet`).
- **Auth:** dois clients (admin service_role + auth via ANON_KEY com `getClaims`); exige `user_roles.role = 'admin'`.
- **Deps:** `fetch` HEAD/GET de URLs externas (com timeout). Sem IA.

### apply-link-corrections
- **Propósito:** Aplica correções de `href` em posts (substitui só o atributo href, preserva texto), grava backup + log.
- **HTTP/payload:** `POST` JSON `{ post_ids[], max_posts=5, dry_run=false }`. **Resposta:** `{ dry_run, corrected, total_corrections, results: CorrectionResult[] }`.
- **Auth:** admin service_role + auth ANON_KEY `getClaims`; exige admin.
- **Deps:** tabelas `link_analysis_results` (status `mapped`), `link_corrections_log`, `posts`. Sem deps externas.

### auth-email-hook
- **Propósito:** Webhook de e-mail de auth do Supabase. Renderiza o template React Email e **enfileira** (via RPC `enqueue_email` na fila `auth_emails`) — o envio efetivo é do `process-email-queue`. Tem também rota `/preview` (HTML sem enviar).
- **HTTP/payload:** `POST` webhook assinado (verifica `x-lovable-signature`/timestamp via `@lovable.dev/webhooks-js`). Payload `payload.data.{action_type, email, url, token, new_email}`. **Resposta:** `{ success: true, queued: true }`.
- **Auth:** verificação de assinatura HMAC (LOVABLE_API_KEY); `verify_jwt=false`.
- **Deps:** `@lovable.dev/email-js`, `@lovable.dev/webhooks-js`, React Email; templates em `_shared/email-templates/`. Loga em `email_send_log`.

### billing
- **Propósito:** Router unificado de billing Stripe (consolida 4 funções p/ evitar cold start). Inclui override de premium via DB (`premium_overrides`) e via env legado.
- **HTTP/payload:** `POST` JSON `{ action }`. Actions: `check` → `{ subscribed, product_id, subscription_end/start, override? }`; `checkout` → `{ url }` (precisa `priceId` formato `price_`); `portal` → `{ url }`; `invoices` → `{ invoices[] }`.
- **Auth:** valida JWT (`getUser`) — exige usuário com email. `verify_jwt=false` no config (auth manual).
- **Deps:** Stripe (`stripe@18.5.0`, apiVersion 2025-08-27.basil). Env `PREMIUM_OVERRIDE_EMAILS` (lista CSV legada).

### fetch-og-image
- **Propósito:** Extrai `og:image` (fallback `twitter:image`) e título de uma URL fornecida.
- **HTTP/payload:** `POST` JSON `{ url }`. **Resposta:** `{ ogImage, title }` (ou `{ error, ogImage: null }`).
- **Auth:** exige usuário autenticado (`getUser` via ANON_KEY). Valida protocolo http/https.
- **Deps:** `fetch` de HTML externo (User-Agent `NuckturpBot/1.0`).

### finance-extract-receipt
- **Propósito:** Lê foto/PDF de recibo já no bucket privado `finance-receipts` e extrai dados financeiros estruturados via IA-visão. **Apenas sugere, nunca grava lançamento.**
- **HTTP/payload:** `POST` JSON `{ storage_path }` (deve começar com `{user.id}/`). **Resposta:** `{ extracted: { vendor, doc_type, total_cents, doc_date, suggested_category, line_items[] } }`. Max 10 MB.
- **Auth:** JWT obrigatório; defesa em profundidade pelo prefixo do path.
- **Deps:** Lovable AI Gateway (`google/gemini-3-flash-preview` multimodal, tool calling); **Storage** (download de `finance-receipts`); `withMetrics`. Loga em `ai_usage_logs`.

### generate-adventure
- **Propósito:** Gera sinopse de aventura de RPG (saída em **stream SSE**) a partir de resultados de dados; modo extra `check-system` (verifica se a IA conhece o sistema).
- **HTTP/payload:** `POST` JSON. Default: `{ diceResults, gameSystem, pillars[], additionalInfo, systemDescription }` → `text/event-stream`. Modo `{ mode: "check-system", gameSystem }` → `{ known: boolean }`.
- **Auth:** JWT obrigatório (`getUser`); `verify_jwt=true`.
- **Deps:** Lovable AI Gateway (`google/gemini-3-flash-preview`, stream); `withMetrics`. Loga em `ai_usage_logs`. Trata 429/402 do gateway.

### import-wordpress
- **Propósito:** Importa export XML (WXR) do WordPress. Modos: `preview`, `import`, `sync_categories`, `sync_categories_preview`. Mapeia autores, reescreve URLs, gera slugs/excerpts, decodifica entidades HTML.
- **HTTP/payload:** `POST` `multipart/form-data` (arquivo XML) **ou** JSON. Campos: `mode`, `createSlugs`, `selectedSlugs`, `updateExisting`, `urlRewrites`, `urlOverrides`, `authorMapping`. **Resposta:** JSON com preview/resultado da importação.
- **Auth:** JWT + `user_roles.role = 'admin'`; service_role.
- **Deps:** Gravatar (hash MD5 de e-mail). Parsing XML manual (regex/CDATA).

### instagram-thumbnail
- **Propósito:** Proxy para obter a imagem de um post do Instagram (retorna **binário de imagem**, não JSON). 3 tentativas: endpoint `/media/?size=l`, oEmbed, og:image.
- **HTTP/payload:** `GET` querystring `?url=<post>`. **Resposta:** corpo de imagem (`Content-Type: image/*`, cache 24h) ou erro texto.
- **Auth:** nenhuma (usa `deno.land/std` `serve`).
- **Deps:** Instagram (media/oEmbed/og), User-Agent de Googlebot. **Único arquivo sem nenhum env var.**

### og-profile-image
- **Propósito:** Gera imagem OG 1200×630 (SVG) para perfil público de mestre (avatar circular embutido em base64, nome, título, sistemas favoritos, branding Noir Void + Cyber Lime).
- **HTTP/payload:** `GET` querystring `?slug=`. **Resposta:** `image/svg+xml` (cache CDN 24h / browser 1h); 302 para fallback se slug ausente/perfil inexistente.
- **Auth:** nenhuma (pública). Service_role só para ler `public_profiles`.
- **Deps:** `fetch` de avatar → base64.

### og-proxy
- **Propósito:** Entrega HTML mínimo com meta tags OG corretas a crawlers de redes sociais e buscadores (a SPA não seta OG via JS); redireciona humanos (302) para a página real. Cobre dezenas de rotas (posts, dicionário, perfis, blog de autor, notas públicas, feedback, landing pages).
- **HTTP/payload:** `GET` querystring `?path=/...`. Detecta crawler por User-Agent (regex extensa: WhatsApp, Googlebot, GPTBot, Claude-Web, etc.). **Resposta:** HTML com OG/Twitter tags + `<meta refresh>` (com `Last-Modified`/`ETag`).
- **Auth:** nenhuma; service_role para ler dados públicos. RPCs `get_public_note`, `get_feedback_config_by_token`.
- **Obs:** lógica de CDN (`cdn.nuckturp.com.br`) replica `src/lib/cdnUrl.ts`. Chamada por Cloudflare Worker (roteia crawlers).

### optimize-images
- **Propósito:** Converte em lote PNG/JPEG → WebP (q92) no bucket `blog-assets`, redimensiona por contexto (covers/content/blog-custom), verifica upload antes de deletar original, atualiza referências no DB.
- **HTTP/payload:** `POST` JSON `{ action }`. `list` → arquivos convertíveis; `process` (`{ path }`) → converte 1 imagem; `stats` → RPC `admin_storage_stats`. **Resposta:** JSON detalhado (savings, db_updates, verified).
- **Auth:** JWT + admin; service_role.
- **Deps:** Supabase Image Transform (render API) com fallback **weserv.nl**; **Storage** (download/upload/remove em `blog-assets`); RPCs `admin_storage_stats`, `admin_replace_content_url`. Timeouts 15s/40s; pula >25 MB.

### ping-search-engines
- **Propósito:** Notifica motores de busca de URLs novas/atualizadas. Sitemap ping (Google legado/Bing) + **IndexNow** (Bing/Yandex). Chamada pelo `process-scheduled-posts` ou manualmente.
- **HTTP/payload:** `POST` JSON `{ urls?: string[], sitemap?: boolean }` (sem body = só sitemap). **Resposta:** `{ sitemap_ping?, indexnow?, urls_submitted? }`.
- **Auth:** nenhuma. **Chave IndexNow hardcoded no código** (`nuckturp2026indexnow`) — não é env var.
- **Deps:** Google/Bing ping endpoints, IndexNow (bing.com, yandex.com).

### process-conditional-notifications
- **Propósito:** Avalia regras ativas em `conditional_notifications` contra todos os perfis e dispara notificações condicionais (com interpolação de placeholders por perfil). Provável execução por cron.
- **HTTP/payload:** `POST` (sem body relevante). **Resposta:** `{ processed, message }`.
- **Auth:** `verify_jwt=true` no config; usa service_role. Lê `profiles`, `user_roles`, `blog_authors`.
- **Deps:** sem deps externas.

### process-email-queue
- **Propósito:** Dispatcher da fila de e-mail (PGMQ). Processa `auth_emails` (prioridade) depois `transactional_emails`, com retry (até 5), backoff por rate-limit 429, DLQ e TTL configurável.
- **HTTP/payload:** `POST`. **Resposta:** JSON `{ skipped? | processed }`. **Provável cron.**
- **Auth:** exige JWT cujo claim `role === 'service_role'` (defesa em profundidade) — só backend chama.
- **Deps:** `@lovable.dev/email-js` (`sendLovableEmail`), env `LOVABLE_SEND_URL`; RPC `read_email_batch`; tabelas `email_send_state`, `email_send_log`. **Não emite headers CORS** (não é chamada por browser).

### process-push-queue
- **Propósito:** Cron a cada 5 min. Processa `pending_push_queue`: agrupa por usuário (3+ pendentes → 1 push resumo; 1-2 → individual), marca `sent`/`grouped`, limpa >7 dias.
- **HTTP/payload:** `POST`. **Resposta:** `{ processed, sent_individually, sent_grouped, users_affected }`.
- **Auth:** service_role; `withMetrics`. **Cron.**
- **Deps:** invoca `send-push` (Bearer service_role).

### process-scheduled-posts
- **Propósito:** Cron **pg_cron 2x/dia (07h e 19h BRT)**. Publica posts agendados (`published`, `published_at <= now()`, `first_published_at IS NULL`), trava unicidade, notifica admins/seguidores e dispara push.
- **HTTP/payload:** `POST`. **Resposta:** `{ processed, message }`.
- **Auth:** service_role. **Cron.**
- **Deps:** notificações/push internos; tabela `posts`. (Doc do header sugere também acionar `ping-search-engines`.)

### redirect-legacy
- **Propósito:** Resolve 301/410 para URLs antigas do WordPress → novas rotas (permalinks por data, `/tag/*`, `/author/*`, `/dicionario/*`, `/cursos/*`, sufixo de concatenação Pinterest, `/wp-content` → 410 Gone, `/rss.xml` → função RSS).
- **HTTP/payload:** `GET` querystring `?path=/...`. **Resposta:** 301 (Location), 410 (Gone com noindex) ou 404.
- **Auth:** nenhuma; service_role para checar slugs/autores no DB.
- **Deps:** consulta `posts`, `blog_authors`. Chamada pelo Cloudflare Worker.

### rss
- **Propósito:** Feed RSS 2.0 enriquecido do blog (Media RSS para covers, `content:encoded`, reading time, taxonomia, atom self-link). Top 100 posts públicos.
- **HTTP/payload:** `GET` (sem params). **Resposta:** `application/rss+xml` (cache 1h).
- **Auth:** nenhuma (`verify_jwt=false`); service_role para ler posts publicados.
- **Deps:** nenhuma. **Não emite CORS** (Content-Type RSS).

### scraper
- **Propósito:** Router de scraping de sites externos (consolida 2 funções). `mesaquest` (parse de perfis/mesas via HTML + `__NEXT_DATA__`); `worldcraft` (via **Firecrawl**). Rate limit 10 req/min por IP.
- **HTTP/payload:** `POST` JSON `{ source: "mesaquest"|"worldcraft", ... }`. mesaquest: `{ mesaquestUrl }` → `{ success, tables[], stats }`. worldcraft: `{ worldcraftUrls[] }` (máx 5) → `{ success, worlds[] }`.
- **Auth:** nenhuma (`verify_jwt=false`); endpoints públicos com rate limit por IP.
- **Deps:** Firecrawl (`api.firecrawl.dev`, env `FIRECRAWL_API_KEY`) para worldcraft; `fetch` HTML para mesaquest. Valida domínios `mesaquest.com.br`/`worldcraft.com.br`.

### send-push
- **Propósito:** Envia Web Push (VAPID + criptografia RFC 8291 aes128gcm **implementada manualmente** com WebCrypto). Limpa subscriptions expiradas (404/410). Batch máx 500 usuários.
- **HTTP/payload:** `POST` JSON `{ notification_id?, user_ids?[], title?, body?, url?, image? }`. **Resposta:** `{ success, sent, failed, expired_cleaned }`.
- **Auth:** `verify_jwt=false` no config, MAS valida JWT manualmente + exige `user_roles.role = 'admin'` (service_role NÃO é aceito como auth de usuário; porém chamada internamente por `process-push-queue`/`admin-users` com Bearer service_role).
- **Secrets:** VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (deve ser `mailto:`/`https://`).
- **Deps:** push services dos browsers (FCM, Mozilla autopush, etc.) via `endpoint` da subscription. Tabela `push_subscriptions`, `notifications`.

### seo-specialist
- **Propósito:** Sugere/revisa metadados SEO de um post (título SEO ≤60, meta descrição ≤160, 5 tags, keywords, slug, categorias, excerpt). Modos `suggest`/`review`. Tem cache por `content_hash`.
- **HTTP/payload:** `POST` JSON `{ title (obrig.), content, slug, excerpt, tags, category_ids, seo_title, seo_description, seo_keywords, categories[], content_hash, post_id }`. **Resposta:** análise estruturada via tool calling (`seo_analysis`).
- **Auth:** auth via ANON_KEY (`getUser` com header). `verify_jwt=true`.
- **Deps:** Lovable AI Gateway (`google/gemini-3-flash-preview`, tool calling). System prompt do `.agent/agents/seo-specialist.md`.

### session-prep-check
- **Propósito:** IA: checklist/análise de preparo de sessão de RPG (modo `quick` ou completo). Categorias: narrativa, mecânica, npcs, locais, recompensas.
- **HTTP/payload:** `POST` JSON `{ session_id, campaign_id, mode? }`. **Resposta:** JSON estruturado de análise.
- **Auth:** JWT (`getUser`); resolve tenant via RPC `get_user_tenant_id` e valida `tenant_id` em campaign/session. `verify_jwt=true`.
- **Deps:** Lovable AI Gateway (`google/gemini-3-flash-preview`). Tabelas `campaigns`, `sessions`.

### sitemap
- **Propósito:** Arquitetura de sitemap index. `/sitemap` → `<sitemapindex>`; sub-sitemaps por `?type=` (static, posts paginado 1000/pág, profiles, dictionary, authors, notes, categories, images). Imagens extraídas de cover + conteúdo.
- **HTTP/payload:** `GET` querystring `?type=&page=`. **Resposta:** `application/xml` (cache 1h).
- **Auth:** nenhuma (`verify_jwt=false`); service_role para ler dados públicos.
- **Deps:** nenhuma. **Não emite CORS** (Content-Type XML).
