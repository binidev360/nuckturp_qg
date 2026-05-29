# Arquitetura — QG do Mestre (Next.js + Supabase)

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

> Arquitetura-alvo da reescrita. Decisões registradas em [adr/](adr/) e no Decision Log de [MIGRACAO-NEXTJS.md](MIGRACAO-NEXTJS.md).

## 1. Visão de alto nível

```
                         ┌─────────────────────────────┐
        Browser / PWA ──▶│  Next.js (App Router, SSR)  │
                         │  Hostinger VPS (standalone)  │
                         └──────────────┬──────────────┘
                           RSC │ Server Actions │ Route Handlers
                                ▼
        ┌───────────────────────────────────────────────────┐
        │                Supabase (conta própria)            │
        │  Postgres + RLS │ Auth │ Storage │ Realtime         │
        │  Edge Functions (Deno) │ Cron (pg_cron)             │
        └───────────────────────────────────────────────────┘
              │            │              │            │
           Stripe       Gemini        Resend/SMTP    Google
        (pagamentos)   (IA)          (e-mail)        (OAuth/GA4)

        Cloudflare = DNS + CDN (lógica de SEO migrada p/ o Next)
```

## 2. Camadas

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Apresentação | Next.js 15 App Router, React 18, Tailwind, shadcn/ui, framer-motion | UI, SSR/SSG/ISR, motion |
| Sessão/Auth | `@supabase/ssr` (cookies) + middleware `getClaims()` | Sessão em RSC, Server Actions, Route Handlers e middleware |
| Dados (server) | Supabase server client / service-role util | Leitura RSC, mutações via Server Actions |
| Dados (client) | TanStack Query (onde há interação intensa) | Cache client-side, optimistic updates |
| Backend lógico | Edge Functions Deno (~26) | Stripe, IA, e-mail, OCR, scraping, sitemap, RSS, push |
| Persistência | Postgres + RLS (multi-tenant) | Isolamento por tenant; Storage para mídia |

## 3. Estratégia de renderização (SEO — driver C)

| Tipo de página | Estratégia | Exemplos |
|---|---|---|
| Conteúdo público | **SSG/ISR** (`generateStaticParams` + `revalidate`) | posts, dicionário, landing |
| Perfil/nota pública | **SSR** dinâmico | `/m/:slug`, `/n/:token` |
| App autenticado | **SSR + client** | dashboard, editor, whiteboard, admin |
| Mutações | **Server Actions** + `revalidateTag`/`revalidatePath` | criar post, salvar nota |

**URLs e slugs idênticos aos atuais** — requisito inquebrável (paridade de SEO).

## 4. Fluxos críticos

### 4.1 Autenticação (e-mail/senha e Google)
1. `middleware` cria server client e chama `getClaims()` (refresh de sessão; nada de código entre os dois).
2. Login via Server Action (`signInWithPassword`) ou OAuth (redirect → callback `/auth/callback`).
3. Sessão em cookies → disponível em RSC, Server Actions, Route Handlers.
4. Multi-tenant: `tenant`/`user_id` resolvido por RLS em toda query.

### 4.2 Publicação de post (SEO)
1. Editor (client) → Server Action salva no Supabase.
2. Especialista SEO (Edge Function + Gemini) calcula score; cache por hash.
3. `revalidateTag('posts')` → ISR regenera listagem e a página do post.
4. Sitemap/RSS/OG regenerados; ping a search engines.

### 4.3 Pagamento (Stripe)
1. Checkout Session (Edge Function) → Stripe.
2. Webhook (`checkout.session.completed`, `customer.subscription.*`) → Edge Function atualiza assinatura.
3. RLS + flags (`premium_overrides`) controlam acesso Premium/VIP.

## 5. Multi-tenancy & segurança
- 1 mestre = 1 tenant; isolamento por **RLS** em todas as tabelas.
- Service-role só no server (Edge Functions / util server-side), nunca no bundle.
- Detalhes em [security.md](security.md).

## 6. Hospedagem
- Next.js `output: 'standalone'` → servidor Node persistente na **VPS Hostinger "A"** (decisão tomada — D3/ADR-0003, 2026-05-22).
- VPS "A" é a hospedagem primária; o plano Node "B" compartilhado foi descartado. Spec mínima (checklist do spike 00.3): RAM dedicada ≥ 2 GB, vCPU ≥ 2, Ubuntu LTS, Node 22, PM2/systemd, SSL. O teste de carga da Fase 6 apenas **valida** a VPS já decidida. Ver [ADR-0003](adr/ADR-0003-hostinger-standalone.md) e [ops.md](ops.md).
