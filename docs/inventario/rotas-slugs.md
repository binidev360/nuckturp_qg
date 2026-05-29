# Inventário de Rotas e Slugs — Contrato de URLs (Nuckturp QG)

> **Propósito:** este documento é o **CONTRATO DE URLs** que a reescrita Next.js 16 deve preservar **verbatim**. Cada path abaixo já circula em produção (`nuckturp.com.br`), está indexado pelo Google e/ou foi compartilhado por usuários. Mudança de path é **proibida** (guardrail de SEO).
>
> **Fontes (read-only):**
> - Tabela de rotas: `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp\src\App.tsx` (linhas 141–208) — React Router v6 (`react-router-dom`, `<BrowserRouter>`).
> - SEO/prerender/redirects: `cloudflare-worker.js` (raiz) + `supabase/functions/redirect-legacy/index.ts` + `supabase/functions/og-proxy/index.ts`.
> - Geração de slug: `src/lib/utils.ts` (`generateSlug`), `src/hooks/usePostEditorForm.ts`, `src/pages/Profile.tsx`, `src/pages/AdminDictionary.tsx`.
> - Geração de token: `src/components/NoteShareDialog.tsx`.
>
> **Stack atual:** SPA Vite/React, roteamento 100% client-side. Crawlers recebem HTML pré-renderizado via Edge Function `og-proxy` (interceptado no Cloudflare Worker). No Next.js, esse prerender deixa de ser necessário (SSR/SSG nativo) e o Worker será **aposentado** — toda a sua lógica (XML proxy, CDN rewrite, redirects legados, OG) precisa ser reimplementada no Next.

---

## 1. Tabela completa de rotas

Legenda render-alvo no Next:
- **SSG** = estático no build (conteúdo raro de mudar).
- **ISR** = estático com revalidação (conteúdo público que muda; revalidar por tag/path).
- **SSR** = render por requisição (conteúdo dinâmico por slug/token; precisa de fresh data + OG/metadata por item).
- **CSR (app shell)** = página autenticada; shell server-rendered + dados no client (TanStack Query). Não indexável.

### 1.1 Rotas públicas (anônimas, indexáveis salvo nota)

| Path (React Router) | Página/Componente | Acesso | Render-alvo Next | Observações |
|---|---|---|---|---|
| `/` | `Landing` | Público | **SSG/ISR** | Home/landing principal. Indexável. |
| `/auth` | `Auth` | Público | **SSR** (ou CSR) | Login/cadastro. `noindex` recomendado. |
| `/redefinir-senha` | `ResetPassword` | Público | **CSR** | Fluxo Supabase recovery (lê token do hash). `noindex`. |
| `/onboarding` | `Onboarding` | Público (pós-cadastro) | **CSR** | Fora do `AppLayout`. `noindex`. |
| `/novidades` | `PublicBlog` | Público | **ISR** | Índice do blog editorial. Indexável. Sem `AppLayout`. |
| `/novidades/dicionario` | `PublicDictionary` | Público | **ISR** | Índice do dicionário. ⚠️ Declarada **antes** de `/novidades/:slug` (ordem importa). |
| `/novidades/dicionario/:slug` | `DictionaryEntryPage` | Público | **SSR/ISR** | Verbete do dicionário. Slug pode conter `%` (URL-encoded). |
| `/novidades/:slug` | `PublicBlogPost` | Público | **SSR/ISR** | Post do blog. **Canonical** dos posts de autor. Indexável. |
| `/m/:slug` | `PublicProfile` | Público | **SSR** | **Perfil público do mestre.** URL gerada por usuário (ver §4). OG dinâmica. |
| `/m/:slug/blog` | `AuthorPublicBlog` | Público | **SSR/ISR** | Índice do blog do autor. |
| `/m/:slug/blog/:postSlug` | `PublicBlogPost` | Público | **SSR/ISR** | Post do autor. `canonical` → `/novidades/:postSlug` (evita conteúdo duplicado). |
| `/m/:slug/:postSlug` | `AuthorPostRedirect` | Público | **Redirect** | Encurtador legado → `/m/:slug/blog/:postSlug` (`<Navigate replace>`). Manter como redirect 301/308. |
| `/n/:token` | `PublicNote` | Público (token) | **SSR** | **Nota pública compartilhada.** URL gerada por usuário (ver §4). |
| `/f/:token` | `SessionFeedback` | Público (token) | **SSR/CSR** | **Formulário público de feedback (NPS/sessão).** URL gerada por usuário (ver §4). |
| `/c/:token` | `ConsentForm` | Público (token) | **CSR** | **Formulário de Linhas & Véus (consentimento).** `noindex`. URL gerada por usuário (ver §4). |
| `/o-livro-completo-do-mestre-de-rpg` | `BookLandingPage` | Público | **SSG/ISR** | Landing de venda (livro). Indexável. |
| `/checklist-do-mestre-metodico` | `ChecklistLandingPage` | Público | **SSG/ISR** | Landing de venda (checklist). |
| `/curso-de-worldbuilding` | `WorldbuildingLandingPage` | Público | **SSG/ISR** | Landing de venda (curso). |
| `/curso-de-worldbuilding-para-mestres` | `WorldbuildingLandingPageForMasters` | Público | **SSG/ISR** | Variante da landing de worldbuilding. |
| `/rss.xml` | `EdgeRedirect fn="rss"` | Público | **Route handler** | Hoje: redireciona p/ Edge Function `rss`. No Next: gerar via route handler / proxy (ver §3). |
| `/sitemap.xml` | `EdgeRedirect fn="sitemap"` | Público | **Route handler** | Idem. Worker faz proxy reverso (NÃO redirect) preservando querystring (`?type=posts` para paginação). |
| `*` (catch-all) | `NotFound` | Público | **404** | Página 404. |

### 1.2 Rotas autenticadas — app interno (`ProtectedRoute` + `AppLayout`)

Todas envoltas em `LayoutRoute` = `<ProtectedRoute><AppLayout>…</AppLayout></ProtectedRoute>` (exceto `/whiteboard`, que usa só `ProtectedRoute` sem `AppLayout`). **Não indexáveis.** Render-alvo: **CSR (app shell)** — shell server + dados client via Supabase/TanStack Query.

| Path | Página/Componente | Notas |
|---|---|---|
| `/dashboard` | `Index` | Home autenticada. |
| `/campaigns` | `Campaigns` | Lista de campanhas. |
| `/campaigns/:id` | `CampaignDetail` | `:id` = UUID da campanha. |
| `/campaigns/:campaignId/characters/:characterId` | `CharacterDetail` | Ambos UUID. |
| `/agenda` | `Agenda` | |
| `/diary` | `Diary` | |
| `/whiteboard` | `Whiteboard` | **Sem `AppLayout`** (tela cheia). |
| `/players` | `Players` | |
| `/players/:id` | `PlayerDetail` | `:id` = UUID. |
| `/profile` | `Profile` | Edição do perfil (define o `slug` de `/m/:slug`). |
| `/plans` | `Plans` | |
| `/checkout` | `CheckoutSuccess` | Retorno de checkout. |
| **Academia de Mestres** | | |
| `/journey` | `Journey` | Gate da academia. |
| `/journey/biblioteca` | `Library` | |
| `/journey/biblioteca/:bookSlug` | `BookDetail` | Slug de livro. |
| `/journey/biblioteca/:bookSlug/:sessionSlug` | `BookReader` | Leitor (livro + sessão). |
| `/journey/biblioteca/cursos/:courseSlug` | `CourseDetail` | Slug de curso. |
| `/journey/biblioteca/cursos/:courseSlug/:lessonId` | `CourseViewer` | `:lessonId` = UUID/ID da aula. |
| `/journey/admin` | `JourneyAdmin` | Gate admin (`isAdmin` interno). |
| `/journey/admin/cards` | `AdminCards` | |
| `/journey/admin/configuracoes` | `AdminSettings` | |
| `/journey/admin/livros` | `AdminBooks` | |
| `/journey/admin/livros/:bookId` | `AdminBookEditor` | `:bookId` = UUID. |
| `/journey/admin/cursos` | `AdminCourses` | |
| `/journey/admin/cursos/:courseId` | `AdminCourseEditor` | `:courseId` = UUID. |
| **Ferramentas** | | |
| `/tools` | `Tools` | |
| `/tools/adventure-generator` | `AdventureGenerator` | |
| `/tools/dice-roller` | `DiceRoller` | |
| `/tools/session-prep` | `SessionPrepCheck` | |
| `/tools/feedback` | `FeedbackPage` | Gestão dos formulários (gera `/f/:token`). |
| `/tools/consent` | `ConsentManagement` | Gestão de consentimento (gera `/c/:token`). |
| `/tools/finance` | `FinanceManager` | |
| **Administração / Blog** | | |
| `/admin` | `Admin` | Painel admin. |
| `/admin/blog` | `AdminBlog` | |
| `/admin/templates` | `AdminTemplates` | |
| `/admin/dictionary` | `AdminDictionary` | Gera slugs do dicionário. |
| `/author-blog` | `AuthorBlog` | Painel do autor (gera posts de `/m/:slug/blog`). |
| `/post/new` | `PostEditor` | Criação de post (gera `slug`). |
| `/post/:id/edit` | `PostEditor` | `:id` = UUID do post. |

**Resumo de contagem:** 64 entradas `<Route>` no `App.tsx` (inclui catch-all `*`). Excluindo o catch-all: **63 rotas**. Públicas/anônimas (§1.1, incl. XML e catch-all): **22**. Autenticadas (§1.2): **41**.

---

## 2. Padrões de slug dinâmico — geração e validação

### 2.1 `generateSlug` (helper canônico) — `src/lib/utils.ts:17`
```ts
text.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // remove acentos
    .replace(/[^a-z0-9]+/g, "-")                        // não-alfanum → hífen
    .replace(/^-|-$/g, "");                             // tira hífen das pontas
```
Usado para: **posts** (`usePostEditorForm.ts` — `f.slug || generateSlug(f.title)`), **autores do blog** (`AdminBlogAuthorsTab.tsx`), **categorias** (com sufixo de desambiguação em colisão).

### 2.2 Slug de perfil (`/m/:slug`) — `src/pages/Profile.tsx:293`
Sanitização própria (não usa `generateSlug`):
```ts
slug.toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 40)
```
- Permite letras, números, **hífen e underscore**; corta em **40 chars**.
- **Validação de unicidade:** consulta `profiles` por `.eq("slug", cleanSlug)` antes de salvar; rejeita se já existir (em outro usuário).
- Armazenado em `profiles.slug` (nullable). RPC de leitura: `get_public_profile(_slug)`.

### 2.3 Slug de dicionário (`/novidades/dicionario/:slug`) — `AdminDictionary.tsx:61`
`generateDictSlug(term)` (gerador local), editável manualmente. Pode conter `%` na URL pública (verbete acentuado URL-encoded — o regex do `og-proxy` aceita `[a-zA-Z0-9%-]`). Campos: `term, slug, definition, letter`.

### 2.4 Slugs de academia (`bookSlug`, `courseSlug`, `sessionSlug`)
Definidos nos editores admin (`AdminBookEditor`, `AdminCourseEditor`). Conteúdo **autenticado**, não indexável — paridade de URL importa só para bookmarks internos.

### 2.5 IDs como params
`:id`, `:campaignId`, `:characterId`, `:bookId`, `:courseId`, `:lessonId`, `:postId` → **UUIDs** (ou IDs) do Supabase. Rotas autenticadas; não há SEO em jogo.

---

## 3. Cloudflare Worker — lógica de SEO a migrar para o Next

> Arquivo: `cloudflare-worker.js`. O Worker será **aposentado**. Cada fluxo abaixo precisa de equivalente no Next.js (route handler, `middleware.ts`, `next.config` rewrites/redirects, ou rota de imagem).

### 3.1 XML de SEO (proxy reverso — NÃO redirect)
- `/sitemap.xml`, `/sitemap`, **e** qualquer path iniciando com `/sitemap` → proxy p/ Edge Function `sitemap`, **preservando querystring** (`?type=posts` para paginação de sitemap).
- `/rss.xml`, `/rss` → proxy p/ Edge Function `rss`.
- Headers cravados: `Content-Type: application/xml; charset=utf-8`, `Cache-Control: public, max-age=3600`, `Access-Control-Allow-Origin: *`.
- **No Next:** gerar nativamente (`app/sitemap.ts` / route handler que monta o XML) ou route handler que faz proxy. Manter suporte a `?type=` para sitemaps paginados e os aliases sem `.xml`.

### 3.2 CDN de imagens — host `cdn.nuckturp.com.br`
- Rewrite: `cdn.nuckturp.com.br/<bucket>/<path>` → `…supabase.co/storage/v1/object/public/<bucket>/<path>` (preserva querystring).
- Buckets permitidos: **`blog-assets`, `profile-assets`, `public-assets`**. Outros → 404.
- Cache agressivo: `Cache-Control: public, max-age=604800, s-maxage=2592000, immutable`; `CDN-Cache-Control: max-age=2592000` (30 dias). Só `GET`.
- **No Next/Hostinger:** decidir se mantém subdomínio CDN (rewrite/proxy) ou aponta `next/image` direto p/ Supabase Storage. **Se o subdomínio `cdn.nuckturp.com.br` permanecer, manter o mapeamento bucket→storage verbatim** (URLs de imagem já estão embutidas em posts/perfis).

### 3.3 OG/prerender para crawlers (Edge Function `og-proxy`)
- Worker detecta crawler via UA (`CRAWLER_RE`: WhatsApp, facebookexternalhit, Twitterbot, TelegramBot, LinkedInBot, Slackbot, Discordbot, Googlebot, bingbot, GPTBot, Claude-Web, PerplexityBot, etc.) e, se path ∈ `OG_CONTENT_ROUTES`, serve HTML pré-renderizado (cache 5 min).
- `OG_CONTENT_ROUTES`: `/novidades*`, `/m/*`, `/n/:token`, `/f/:token`, `/o-livro-completo-do-mestre-de-rpg`, `/checklist-do-mestre-metodico`, `/curso-de-worldbuilding`.
- **No Next:** este mecanismo **deixa de existir** — SSR/SSG nativo já entrega HTML+metadata completo a qualquer agente. **Portar a montagem de metadata** (title, description, OG image, Article schema, canonical) para `generateMetadata` de cada rota correspondente. Rotas que o `og-proxy` trata e suas regras de metadata (de `og-proxy/index.ts`):
  - `/novidades/:slug` → post (title/excerpt/cover/og_image/published/updated/tags/autor/categorias).
  - `/novidades` → índice; `/novidades/dicionario` → índice; `/novidades/dicionario/:slug` → verbete.
  - `/m/:slug/blog/:postSlug` → post de autor, **`canonical` → `/novidades/:postSlug`**.
  - `/m/:slug/:postSlug` → redirect p/ `/m/:slug/blog/:postSlug` (canonical).
  - `/m/:slug/blog` → índice do autor; `/m/:slug` → perfil.
  - `/n/:token` → nota pública.
- **OG image dinâmica de perfil:** `…/functions/v1/og-profile-image?slug=<slug>` (ver `PublicProfile.tsx:461`). Reimplementar como rota de imagem (`opengraph-image` / `og` route) ou manter chamando a Edge Function.

---

## 4. URLs geradas por usuários — JÁ circulam fora do nosso controle ⚠️

**Estas têm prioridade máxima de paridade.** Estão em mensagens de WhatsApp, e-mails, bios, QR codes, links de NPS enviados a jogadores. Quebrá-las = link morto para terceiros.

| Padrão | Origem da geração | Token/Slug | Indexável? |
|---|---|---|---|
| **`/m/:slug`** | Usuário define o slug em `/profile` (`Profile.tsx`). Sanitizado `[a-z0-9-_]`, ≤40 chars, único. | slug escolhido pelo mestre | **Sim** (perfil público) |
| **`/m/:slug/blog/:postSlug`** | `postSlug` via `generateSlug(title)` no `PostEditor`. | slug do post de autor | Sim (canonical → `/novidades/:postSlug`) |
| **`/m/:slug/:postSlug`** | Encurtador antigo compartilhado; redireciona p/ a forma `/blog/`. | — | redirect |
| **`/n/:token`** | Botão "compartilhar nota" (`NoteShareDialog.tsx:89`). | `crypto.randomUUID().replace(/-/g,"").slice(0,16)` → **16 chars hex**, salvo em `notes.public_token` (`is_public=true`). | Não-óbvia; tratada como pública (está em `OG_CONTENT_ROUTES`). |
| **`/f/:token`** | Formulário de feedback/NPS criado em `/tools/feedback`; link enviado a jogadores. RPC `get_feedback_config_by_token`. | token de feedback | Tratada como pública (em `OG_CONTENT_ROUTES`). |
| **`/c/:token`** | Formulário Linhas & Véus criado em `/tools/consent`; link enviado a jogadores. RPC por `p_token`. | token de consentimento | **`noindex`** (NÃO está em `OG_CONTENT_ROUTES`). |
| **`/novidades/:slug`** | Posts do blog editorial; compartilhados/indexados há anos. | `generateSlug(title)` | Sim |
| **`/novidades/dicionario/:slug`** | Verbetes do dicionário. | `generateDictSlug` | Sim |

> **Nota:** `/n/:token`, `/f/:token`, `/c/:token` usam tokens opacos (não enumeráveis), mas a resolução por token deve continuar idêntica — o token É a URL pública. No Next, resolver server-side (SSR) preservando o mesmo nome de parâmetro e o mesmo formato de token.

---

## 5. Redirects legados (WordPress/antigos) — Edge Function `redirect-legacy`

> O Worker intercepta paths legados (regex `LEGACY_PATTERNS`) e delega à Edge Function `redirect-legacy`, que devolve **301** (canonical novo) ou **410** (removido permanentemente). No Next, portar para `next.config.js` `redirects()` + `middleware.ts` (os casos que precisam de lookup no banco) ou manter a Edge Function chamada por `middleware`.

### 5.1 Regras de redirect (de `redirect-legacy/index.ts`)

| Padrão legado | Destino | Status |
|---|---|---|
| `…/br.pinterest.com/nuckturpstudios` (sufixo concatenado) | strip do sufixo, reprocessa o path limpo | 301 |
| `/wp-content/*`, `/wp-admin/*`, `/wp-*`, `/cdn-cgi/l/email-protection` | — | **410 Gone** (`X-Robots-Tag: noindex`) |
| `/rss.xml` | Edge Function `rss` | 301 |
| `/2020/MM/DD/slug` (e qualquer `/YYYY/MM/DD/slug`) | `/novidades/slug` | 301 |
| `/dicionario/term` | `/novidades/dicionario/term` | 301 |
| `/dicionario` | `/novidades/dicionario` | 301 |
| `/dicionario_tag/*`, `/dicionario_categoria/*` | `/novidades/dicionario` | 301 |
| `/tag/*` | `/novidades` | 301 |
| `/author/:authorSlug` | `/m/:authorSlug/blog` (se autor existir em `blog_authors`); senão `/novidades` | 301 |
| `/rpg/*`, `/geek-lifestyle/*`, `/serious-games/*`, `/cartas/*`, `/tabuleiro/*` | `/novidades` | 301 |
| `/cursos/o-livro-completo-do-mestre-de-rpg` | `/o-livro-completo-do-mestre-de-rpg` | 301 |
| `/cursos/worldbuilding` | `/curso-de-worldbuilding` | 301 |
| `/cursos/*` (outros) | `/novidades` | 301 |
| `/postagens/*` | `/novidades` | 301 |
| `/league-of-legends`, `/webcomics` | `/novidades` | 301 |
| `/page/:n` (paginação antiga) | `/novidades` | 301 |
| `/politica-de-cookies`, `/politica-de-privacidade` | `/` | 301 |
| `/sobre` | `/` | 301 |
| `/<slug-raiz>` (single segment, não-reservado) | lookup em `posts` (status=published); se achar → `/novidades/:slug`; senão → `/novidades/:slug` (deixa o front mostrar 404 com contexto) | 301 |

### 5.2 `LEGACY_PATTERNS` (lista bruta do Worker, para referência)
`/br.pinterest.com/nuckturpstudios$`, `/nuckturp.com.br/`, `/triaeditora.com.br/`, `^/wp-content/`, `^/wp-admin/`, `^/wp-`, `^/tag/`, `^/author/`, `^/dicionario_tag/`, `^/dicionario_categoria/`, `^/dicionario(/|$)`, `^/rpg/`, `^/geek-lifestyle/`, `^/serious-games/`, `^/cartas/`, `^/tabuleiro/`, `^/cursos/`, `^/postagens/`, `^/page/\d+$`, `^/cdn-cgi/`, `^/\d{4}/\d{2}/\d{2}/`, `^/league-of-legends$`, `^/webcomics$`, `^/politica-de-cookies$`, `^/politica-de-privacidade$`, `^/sobre$`, `^/a/`.

> ⚠️ **Heurística de slug-raiz:** o Worker (`isLegacyPath`) trata qualquer `/<segmento-único>` que **não** esteja em `SPA_ROUTES` como legado e tenta redirecionar p/ `/novidades/<slug>`. No Next, replicar com cuidado: a allowlist `SPA_ROUTES` (abaixo) deve cobrir TODA rota de primeiro nível válida, senão um path novo válido cairá no redirect legado.

### 5.3 `SPA_ROUTES` (allowlist de primeiro segmento — Worker)
`auth`, `dashboard`, `campaigns`, `diary`, `whiteboard`, `players`, `journey`, `tools`, `profile`, `plans`, `checkout`, `admin`, `onboarding`, `novidades`, `m`, `n`, `f`, `redefinir-senha`, `author-blog`, `post`, `o-livro-completo-do-mestre-de-rpg`, `checklist-do-mestre-metodico`, `curso-de-worldbuilding`, `llms.txt`, `llms-full.txt`, `robots.txt`, `manifest.json`, `sw.js`, `assets`.

> ⚠️ **Divergência detectada:** `SPA_ROUTES` **não** inclui `c` (consent), `agenda`, nem `curso-de-worldbuilding-para-mestres`, embora sejam rotas válidas no `App.tsx`. `c` e `agenda` (segmento único) e a landing extra cairiam na heurística de legado. Como hoje são acessadas só via link direto/SPA client-side, pode não ter dado problema — **mas ao migrar para SSR no Next, garantir que a allowlist inclua `/c/:token`, `/agenda` e `/curso-de-worldbuilding-para-mestres`** para não redirecioná-las indevidamente.

---

## 6. Arquivos estáticos / well-known referenciados
`robots.txt`, `manifest.json`, `sw.js` (service worker), `llms.txt`, `llms-full.txt`, `/assets/*` (build). Servidos pelo origin/SPA. No Next: `public/` + `app/robots.ts` / `app/manifest.ts` conforme o caso. `llms.txt`/`llms-full.txt` aparecem na allowlist — verificar se existem como arquivos a portar.

---

## 7. Checklist de paridade (para a migração)
- [ ] Todas as 63 rotas do §1 respondem nos **mesmos paths**.
- [ ] Ordem `/novidades/dicionario` **antes** de `/novidades/:slug` preservada (no App Router, segmento estático ganha do dinâmico automaticamente — validar).
- [ ] `/m/:slug/:postSlug` → 301/308 para `/m/:slug/blog/:postSlug`.
- [ ] `canonical` de `/m/:slug/blog/:postSlug` aponta p/ `/novidades/:postSlug`.
- [ ] Tokens `/n`, `/f`, `/c` resolvidos server-side com mesmo formato.
- [ ] `/c/:token` e formulário de consentimento marcados `noindex`.
- [ ] Sitemap/RSS servidos como XML (com `?type=` paginado) nos paths `.xml` **e** aliases.
- [ ] Todos os redirects legados do §5.1 portados (incl. 410 para `/wp-*`).
- [ ] Allowlist de primeiro segmento corrigida para incluir `c`, `agenda`, `curso-de-worldbuilding-para-mestres`.
- [ ] `cdn.nuckturp.com.br` resolvido (manter rewrite bucket→storage OU migrar URLs de imagem).
- [ ] OG image de perfil (`og-profile-image?slug=`) reimplementada.
