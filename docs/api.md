# API — QG do Mestre

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

> A "API" tem três superfícies: **Edge Functions** (Deno), **REST/RPC auto-gerado do Supabase** e **Route Handlers do Next**. Autenticação por sessão Supabase (JWT em cookie) ou service-role (server-only).

## 1. Autenticação
- **Cliente:** sessão Supabase via cookies (`@supabase/ssr`); JWT do usuário em cada request.
- **Server-only:** `service_role` para bypass de RLS (route handlers/edge). Nunca exposto ao browser.
- **OAuth:** Google (callback `/auth/callback`). Ver [ADR-0004](adr/ADR-0004-auth-supabase-ssr.md).

## 2. Supabase REST/RPC
- Tabelas expostas via PostgREST, **protegidas por RLS** (isolamento multi-tenant).
- Acesso pelo SDK (`supabase.from('...')`), não por chamadas REST cruas no app.
- Realtime para presença/edição colaborativa.

## 3. Edge Functions (Deno) — superfície principal a documentar via OpenAPI

| Function | Propósito |
|---|---|
| `billing` | Stripe checkout/portal/assinaturas |
| `generate-adventure` | IA — gerador de aventuras (Gemini) |
| `session-prep-check` | IA — preparador de sessões |
| `seo-specialist` | IA — score/sugestões SEO |
| `analyze-post-links` / `apply-link-corrections` | auditoria/correção de links |
| `finance-extract-receipt` | OCR de recibo (sugere lançamento) |
| `import-wordpress` | importação de posts WP |
| `fetch-og-image` / `og-profile-image` / `og-proxy` / `instagram-thumbnail` | imagens OG/thumbnails |
| `optimize-images` | compressão/WebP |
| `sitemap` / `rss` / `ping-search-engines` | SEO |
| `process-scheduled-posts` / `process-email-queue` / `process-push-queue` / `process-conditional-notifications` | filas e cron |
| `send-push` | push notifications (VAPID) |
| `auth-email-hook` | templates de e-mail de auth |
| `admin-users` | operações admin de usuários |
| `analyze-feedback` | dashboard de feedback/NPS |
| `redirect-legacy` | redirects de URLs legadas |
| `scraper` | scraping com rate limit |

> **OpenAPI/Swagger:** gerar spec por function (input/output/erros) na Fase 4/6 e servir via Swagger UI ou Redoc. Cada function deve declarar: método, payload, códigos de resposta e exemplo.

## 4. Route Handlers (Next)
`app/api/*` para webhooks (Stripe), `sitemap.xml`, `rss.xml`, `opengraph-image`. Documentar contratos conforme implementados na Fase 3.

## 5. Códigos de resposta (convenção)
`200/201` ok · `400` validação (Zod) · `401` sem sessão · `403` RLS/permite · `404` inexistente · `429` rate limit · `500` erro interno. Erros retornam `{ error: { code, message } }`.
