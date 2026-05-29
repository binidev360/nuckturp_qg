# Auditoria de Segurança — Edge Functions (Deno) · QG do Mestre / Nuckturp

> **Escopo:** diagnóstico das 26 Edge Functions do projeto antigo (Vite/Lovable) **antes** da portabilidade D10 (port "como está") e do endurecimento previsto na Fase 6.3.
> **Fonte (READ-ONLY):** `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp\supabase\functions\` + `supabase\config.toml`.
> **Data:** 2026-05-29.
> **Natureza:** este documento é **somente diagnóstico**. Nenhum arquivo do projeto antigo foi modificado.

---

## 0. Sumário executivo

- **26 functions** (+ `_shared/withMetrics.ts`).
- **CORS:** **100% usam `Access-Control-Allow-Origin: "*"`** (relato confirmado). Nenhuma trava por origem.
- **`service_role` (bypass RLS):** usado em **20+ functions** (quase todas que tocam DB). Diversas o usam sem nenhuma checagem de auth/role no código, confiando só no gateway `verify_jwt`.
- **Públicas / sem JWT de usuário:** ver §2. Destaque para `instagram-thumbnail` (SSRF), `fetch-og-image` (SSRF), `scraper`, `og-proxy`, `og-profile-image`, `rss`, `sitemap`, `redirect-legacy`, `ping-search-engines`.
- **Segredo hardcoded confirmado:** chave IndexNow `nuckturp2026indexnow` em `ping-search-engines/index.ts:64`.
- **Rate limiting:** existe **apenas** em `scraper` (10 req/min por IP, in-memory) e `analyze-feedback` (quota 2/mês por usuário não-premium). As demais functions de IA/OCR (caras) **não têm rate limit próprio** — os `429` que aparecem no código são apenas _tratamento do 429 vindo do gateway de IA upstream_, não enforcement local.

### Nota importante sobre `verify_jwt` e o `config.toml`

O `config.toml` lista explicitamente apenas **15** functions. Functions **ausentes do `config.toml` assumem o default do Supabase: `verify_jwt = true`**. Porém, OG images, sitemaps, RSS, redirects e webhooks precisam ser **publicamente acessíveis** — então, na prática, essas foram quase certamente deployadas com `supabase functions deploy --no-verify-jwt` (o flag de deploy sobrepõe o config). **Isto é um ponto cego do `config.toml`:** ele não reflete fielmente o estado real de produção. Na migração (Supabase próprio) é preciso reconstruir o `config.toml` com `verify_jwt` por função **alinhado ao deploy real**, senão functions públicas quebram (ou functions sensíveis ficam expostas).

---

## 1. Tabela por função

Legenda: **vJWT** = `verify_jwt` no `config.toml` (✓=true, ✗=false, `(def)`=ausente→default true). **SR** = usa `service_role`. **Auth no código** = checagem própria de sessão/role além do gateway.

| #   | Função                              | CORS                | vJWT (config)                         | SR                      | Público?                      | Auth no código                                                                               | Segredos consumidos                            | Rate-limit                                | Risco   |
| --- | ----------------------------------- | ------------------- | ------------------------------------- | ----------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- | ------- |
| 1   | `admin-users`                       | `*`                 | ✓                                     | ✓                       | Não                           | `getUser` + `user_roles=admin`                                                               | SR, STRIPE_SECRET_KEY, ANON                    | Não                                       | 🟡      |
| 2   | `billing`                           | `*`                 | **✗**                                 | ✓                       | Não (auth no código)          | `getUser` obrigatório p/ toda action                                                         | SR, STRIPE_SECRET_KEY, PREMIUM_OVERRIDE_EMAILS | Não                                       | 🟡      |
| 3   | `auth-email-hook`                   | `*`                 | **✗**                                 | ✓                       | Webhook (HMAC)                | Verifica assinatura HMAC (`verifyWebhookRequest`); `/preview` exige `Bearer LOVABLE_API_KEY` | SR, LOVABLE_API_KEY                            | Não                                       | 🟡      |
| 4   | `generate-adventure`                | `*`                 | ✓                                     | ✓                       | Não                           | `getUser` obrigatório                                                                        | SR, LOVABLE_API_KEY                            | **Não** (IA cara)                         | 🔴      |
| 5   | `finance-extract-receipt`           | `*`                 | ✓                                     | ✓                       | Não                           | `getUser` + checa `storage_path` começa com `user.id/`                                       | SR, LOVABLE_API_KEY                            | **Não** (OCR/visão cara); só limite 10 MB | 🔴      |
| 6   | `analyze-feedback`                  | `*`                 | `(def)`                               | ✓                       | Não                           | `getUser` + `user_roles=admin` em parte; quota 2/mês p/ não-premium                          | SR, LOVABLE_API_KEY                            | **Sim** (quota mensal)                    | 🟡      |
| 7   | `analyze-post-links`                | `*`                 | ✓                                     | ✓                       | Não                           | `getClaims` + `user_roles=admin`                                                             | SR, ANON                                       | Não (IA)                                  | 🟡      |
| 8   | `apply-link-corrections`            | `*`                 | ✓                                     | ✓                       | Não                           | `getClaims` + `user_roles=admin`                                                             | SR, ANON                                       | Não                                       | 🟡      |
| 9   | `import-wordpress`                  | `*`                 | ✓                                     | ✓                       | Não                           | `getUser` + `user_roles=admin`                                                               | SR                                             | Não                                       | 🟡      |
| 10  | `seo-specialist`                    | `*`                 | ✓                                     | ✗ (ANON c/ JWT do user) | Não                           | `getUser` + `user_roles=admin`                                                               | ANON, LOVABLE_API_KEY                          | Trata 429 upstream                        | 🟡      |
| 11  | `session-prep-check`                | `*`                 | ✓                                     | ✓                       | Não                           | `getUser` + `user_roles=admin`                                                               | SR, LOVABLE_API_KEY                            | Trata 429 upstream; sem limite próprio    | 🔴      |
| 12  | `optimize-images`                   | `*`                 | ✓                                     | ✓                       | Não                           | `getUser` + `user_roles=admin`                                                               | SR                                             | Não                                       | 🟡      |
| 13  | `process-conditional-notifications` | `*`                 | ✓                                     | ✓                       | Cron (gateway-only)           | Nenhuma no código (confia no gateway)                                                        | SR                                             | Não                                       | 🟡      |
| 14  | `process-email-queue`               | (sem CORS p/ erros) | `(def)`                               | ✓                       | Cron                          | **`getUser`?não** → parseia JWT e exige `role==='service_role'`                              | SR, LOVABLE_API_KEY, LOVABLE_SEND_URL          | Cooldown via `email_send_state`           | 🟢      |
| 15  | `process-push-queue`                | `*`                 | `(def)`                               | ✓                       | Cron (gateway-only)           | Nenhuma no código; invoca `send-push` com SR                                                 | SR                                             | Não                                       | 🟡      |
| 16  | `process-scheduled-posts`           | `*`                 | `(def)`                               | ✓                       | Cron (gateway-only)           | Nenhuma no código                                                                            | SR                                             | Não                                       | 🟡      |
| 17  | `send-push`                         | `*`                 | **✗**                                 | ✓                       | Não (auth no código)          | `getUser` + `user_roles=admin`; batch máx 500                                                | SR, VAPID_PUBLIC/PRIVATE/SUBJECT               | Não (limite de batch)                     | 🟡      |
| 18  | `scraper`                           | `*`                 | **✗**                                 | ✗                       | **Sim (público)**             | Nenhuma; allowlist de host (`*.mesaquest.com.br`, `*.worldcraft.com.br`)                     | FIRECRAWL_API_KEY                              | **Sim** (10 req/min/IP, in-memory)        | 🟡      |
| 19  | `ping-search-engines`               | `*`                 | `(def)`                               | ✗                       | Cron/admin                    | Nenhuma no código                                                                            | **Hardcoded `nuckturp2026indexnow`**           | Limite 100 URLs/call                      | 🔴      |
| 20  | `instagram-thumbnail`               | `*`                 | `(def)`                               | ✗                       | **Sim (público, GET ?url=)**  | Nenhuma; **só valida protocolo http/https**                                                  | —                                              | **Não**                                   | 🔴 SSRF |
| 21  | `fetch-og-image`                    | `*`                 | ✗                                     | ✗ (ANON)                | Requer auth                   | `getUser`; **só valida protocolo http/https**                                                | ANON                                           | **Não**                                   | 🔴 SSRF |
| 22  | `og-proxy`                          | `*`                 | ✓ (não explícito no config → default) | ✓                       | **Sim (SSR público p/ bots)** | Nenhuma; lê dados públicos via RPC (`get_public_note`, etc.)                                 | SR                                             | Não                                       | 🟡      |
| 23  | `og-profile-image`                  | `*`                 | `(def)`                               | ✓                       | **Sim (imagem OG pública)**   | Nenhuma; lê `public_profiles`                                                                | SR                                             | Não                                       | 🟡      |
| 24  | `rss`                               | (sem CORS; XML)     | ✓ (não explícito)                     | ✓                       | **Sim (feed público)**        | Nenhuma; só posts `published`+`public`                                                       | SR                                             | Não                                       | 🟢/🟡   |
| 25  | `sitemap`                           | (sem CORS; XML)     | ✓                                     | ✓                       | **Sim (sitemap público)**     | Nenhuma                                                                                      | SR                                             | Não                                       | 🟢/🟡   |
| 26  | `redirect-legacy`                   | `*`                 | ✓                                     | ✓                       | **Sim (301/410 público)**     | Nenhuma                                                                                      | SR                                             | Não                                       | 🟢/🟡   |

> Observação `config.toml`: lista também `cleanup-notifications` e `admin-health-check` (`verify_jwt=true`) que **não têm pasta** em `functions/` — entradas órfãs (functions removidas ou deployadas de outro lugar). Limpar na migração.

---

## 2. Inventário de funções públicas (sem JWT de usuário final)

Funções alcançáveis sem um JWT de usuário autenticado (públicas por design ou por `--no-verify-jwt`):

1. **`scraper`** — POST público. Protegido por rate-limit 10/min/IP + allowlist de host. Consome créditos Firecrawl no caminho `worldcraft`.
2. **`instagram-thumbnail`** — GET `?url=` público. **Nenhuma proteção** além de protocolo. SSRF.
3. **`fetch-og-image`** — exige `getUser` (qualquer usuário logado), mas qualquer conta serve. SSRF.
4. **`og-proxy`**, **`og-profile-image`** — SSR/imagem para crawlers; precisam ser públicos. Leem só dados marcados como públicos.
5. **`rss`**, **`sitemap`**, **`redirect-legacy`** — conteúdo público read-only.
6. **`ping-search-engines`** — sem auth no código; protegido só pelo gateway (se `verify_jwt=true`). Contém segredo hardcoded.
7. **`auth-email-hook`** — webhook (`verify_jwt=false`), mas protegido por verificação de assinatura HMAC.
8. **`billing`**, **`send-push`** — `verify_jwt=false` no config, **porém** fazem `getUser`/role-check no código (defense-in-depth). Seguros na prática, mas dependem do código, não do gateway.

**Proteções existentes por endpoint público:**

- Rate-limit por IP: **apenas `scraper`** (in-memory `Map`, **não sobrevive a cold start nem é compartilhado entre instâncias** → facilmente contornável distribuindo requests/forjando `x-forwarded-for`).
- Nada de rate-limit em `instagram-thumbnail`, `fetch-og-image`, `og-*`, `ping-search-engines`.

---

## 3. Achados priorizados

### 🔴 CRÍTICOS

**C1 — SSRF em `instagram-thumbnail` (função pública, sem auth, sem allowlist).**
`instagram-thumbnail/index.ts` aceita `?url=` arbitrário, valida **apenas** `protocol ∈ {http, https}` (linha 52), e faz `fetch(url, { redirect: "follow" })` server-side (linhas 12, 79). Permite:

- Atingir endpoints internos / metadata cloud (ex.: `http://169.254.169.254/...`), serviços internos, `http://localhost`, IPs privados.
- Usar a Edge Function como proxy de requisições anônimas (abuso/encadeamento).
  Sem auth (público) e sem rate-limit, é o achado mais grave.

**C2 — SSRF em `fetch-og-image`.**
`fetch-og-image/index.ts` faz `fetch(url)` de URL arbitrária do body (linha 58), validando só protocolo (linha 51). Exige usuário logado (mitiga parcialmente), mas qualquer conta gratuita serve, e não há allowlist nem bloqueio de IPs privados.

**C3 — Segredo hardcoded: chave IndexNow.**
`ping-search-engines/index.ts:64` → `const indexNowKey = "nuckturp2026indexnow";`. Confirmado. Como a chave também é servida publicamente em `/{key}.txt`, o impacto é baixo (a própria spec do IndexNow expõe a chave), mas **viola a política "sem hardcode"** e deve virar env var (`INDEXNOW_KEY`).

**C4 — Functions de IA/OCR caras sem rate-limit por usuário.**
`generate-adventure`, `finance-extract-receipt`, `session-prep-check` exigem auth, mas **não têm quota/rate-limit próprio**. Um usuário autenticado pode disparar chamadas ilimitadas ao gateway de IA (custo $$ e/ou esgotamento de créditos Lovable / DoS de orçamento). Os `429` no código apenas repassam o 429 do upstream. (Contraste: `analyze-feedback` já implementa quota 2/mês — bom modelo a replicar.)

### 🟡 ALTOS / MÉDIOS

**A1 — CORS `*` em 100% das functions.** Permite que qualquer site na web invoque as functions a partir do navegador da vítima. Para endpoints que tratam dados sensíveis (billing, admin-users, finance), combinado com tokens em `Authorization`, o risco é menor que com cookies, mas ainda amplia superfície (CSRF-like via fetch, phishing UIs). **Travar para `https://nuckturp.com.br` (+ subdomínios de preview controlados).**

**A2 — `service_role` ubíquo + ausência de auth no código em crons.** `process-scheduled-posts`, `process-push-queue`, `process-conditional-notifications`, `og-profile-image`, `og-proxy`, `rss`, `sitemap`, `redirect-legacy` usam SR **e não checam nada no código**, confiando 100% no gateway. Se qualquer uma for (re)deployada com `--no-verify-jwt` por engano, vira RCE-de-dados com bypass total de RLS. `process-email-queue` faz certo (exige claim `role===service_role`); esse padrão deveria ser o piso para todas as functions de cron.

**A3 — `verify_jwt=false` em `billing` e `send-push`.** Hoje compensado por `getUser`+role no código. Mas a postura segura é `verify_jwt=true` no gateway **e** o check no código (defense-in-depth). Deixar o gateway aberto significa que qualquer bug/regressão no check de código expõe Stripe (`billing`) e envio de push em massa (`send-push`).

**A4 — Prompt injection nas functions de IA.** `generate-adventure` (linha 62: `O sistema de RPG é: "${gameSystem}"`), `session-prep-check`, `seo-specialist`, `analyze-feedback` interpolam input do usuário direto no prompt. Risco: manipulação de saída/jailbreak. Baixo impacto direto (saída é texto/JSON estruturado via tool_choice), mas deve ser sanitizado/limitado em tamanho.

**A5 — Rate-limit do `scraper` é frágil.** `Map` in-memory por instância: não persiste entre cold starts nem é compartilhado entre réplicas; `x-forwarded-for` é forjável (o próprio código admite no comentário). Insuficiente para um endpoint que gasta créditos Firecrawl.

**A6 — `config.toml` desalinhado da realidade.** 15 functions listadas, 26 existem; 2 entradas órfãs (`cleanup-notifications`, `admin-health-check`). O estado real de `verify_jwt` depende de flags de deploy, não do arquivo. Fonte de confusão e de erro de re-deploy na migração.

### 🟢 BAIXOS / OK (registrar como boas práticas a preservar)

- **`process-email-queue`**: exige claim `role === 'service_role'` — padrão correto para cron.
- **`finance-extract-receipt`**: checa ownership do `storage_path` (`startsWith(user.id + "/")`) + limite 10 MB — bom.
- **`auth-email-hook`**: verificação HMAC de webhook + timestamp anti-replay — bom.
- **`send-push`**: limite de batch 500 + admin-only — bom.
- **`scraper`/`worldcraft`+`mesaquest`**: allowlist de host por sufixo de domínio — bom (replicar nas SSRF).
- **`rss`/`sitemap`**: só expõem posts `published`+`public` — vazamento improvável.

---

## 4. Plano de remediação (Fase 6.3)

Ordem sugerida (impacto × esforço). Tudo a aplicar **no Supabase próprio**, não no projeto antigo.

### 4.1 CORS travado para `nuckturp.com.br`

- Criar helper compartilhado `_shared/cors.ts` que devolve `Access-Control-Allow-Origin` **dinâmico**, ecoando a origem **apenas se** estiver numa allowlist (`https://nuckturp.com.br`, `https://www.nuckturp.com.br`, domínios de preview controlados). Caso contrário, omitir o header.
- Substituir os 26 objetos `corsHeaders = { "...Origin": "*" }` por esse helper.
- Endpoints SSR/feed para crawlers (`og-*`, `rss`, `sitemap`, `redirect-legacy`) **não precisam de CORS** (não são chamados via fetch de browser) — podem dispensar o header ou manter `*` só nesses casos (decidir caso a caso; bots não respeitam CORS).

### 4.2 JWT obrigatório nas mutativas / sensíveis

- No `config.toml` reconstruído: `verify_jwt = true` para **`admin-users`, `billing`, `send-push`, `finance-extract-receipt`, `generate-adventure`, `session-prep-check`, todas `*-link*`, `import-wordpress`, `optimize-images`, `seo-specialist`, `analyze-feedback`** e **manter** o check no código (defense-in-depth).
- Mover `billing` e `send-push` de `verify_jwt=false` → `true`.
- Crons (`process-*`, `ping-search-engines`): `verify_jwt=true` **e** adicionar o check de claim `role==='service_role'` (padrão do `process-email-queue`) em **todos**. Idealmente invocá-las via `pg_cron`/scheduler com a service key, nunca expostas a usuário.
- Documentar explicitamente quais funções são deployadas com `--no-verify-jwt` (somente as genuinamente públicas: `og-proxy`, `og-profile-image`, `rss`, `sitemap`, `redirect-legacy`, `instagram-thumbnail` se mantida pública, `scraper`).

### 4.3 SSRF — allowlist + bloqueio de rede interna

- `instagram-thumbnail` e `fetch-og-image`: antes do `fetch`, resolver/validar o host:
  - Bloquear hostnames que resolvem para IPs privados/loopback/link-local (`10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `::1`, `fc00::/7`).
  - Para `instagram-thumbnail`, restringir host a `*.instagram.com` / `*.cdninstagram.com` / `*.fbcdn.net`.
  - Para `fetch-og-image`, considerar allowlist de domínios ou ao menos o bloqueio de rede interna acima; limitar tamanho de resposta e timeout; **não** seguir redirects para IPs privados (revalidar após cada redirect).
- Reaproveitar o padrão de `endsWith(domínio)` já usado no `scraper`.

### 4.4 Rate limiting

- Substituir o `Map` in-memory do `scraper` por rate-limit **persistente** (tabela Postgres com `INSERT`/cleanup, ou Upstash/Redis se disponível) por IP **e** por usuário.
- Adicionar **quota por usuário** nas functions de IA/OCR caras (`generate-adventure`, `finance-extract-receipt`, `session-prep-check`), espelhando o modelo de `analyze-feedback` (contador mensal em DB, com bypass para premium/admin).
- `instagram-thumbnail`/`fetch-og-image`/`og-*`: rate-limit por IP no edge (proteção anti-DoS de funções de fetch).

### 4.5 Remover hardcodes

- `ping-search-engines`: trocar `"nuckturp2026indexnow"` por `Deno.env.get("INDEXNOW_KEY")`; servir `/{key}.txt` a partir da mesma env. Auditar o repositório inteiro por outros literais (grep já não achou outros segredos hardcoded além deste).

### 4.6 Higiene de configuração e segredos

- Reconstruir `config.toml` cobrindo as **26** functions com `verify_jwt` explícito; remover órfãs `cleanup-notifications` e `admin-health-check`.
- Inventário de secrets a recriar no Supabase próprio: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`, `STRIPE_SECRET_KEY`, `LOVABLE_API_KEY`, `LOVABLE_SEND_URL`, `FIRECRAWL_API_KEY`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, `PREMIUM_OVERRIDE_EMAILS`, **+ novo** `INDEXNOW_KEY`. **Atenção:** `LOVABLE_API_KEY` e o gateway `ai.gateway.lovable.dev` representam dependência do ecossistema Lovable — avaliar substituição (driver do projeto é justamente sair do lock-in Lovable).
- Sanitização/limites de tamanho em todo input de prompt de IA (A4) e validação de schema do body (vários só fazem checagem rasa de tipo).

### 4.7 Prioridade de execução

1. **C1, C2** (SSRF) e **C3** (hardcode) — rápidos e críticos.
2. **4.1 CORS** + **4.2 JWT/role nas mutativas e crons**.
3. **C4 / 4.4** quotas de IA.
4. **A5** rate-limit persistente; **A6** higiene de config.

---

## 5. Apêndice — referências de linha (projeto antigo, read-only)

- CORS `*`: presente em todos os `index.ts` (ex.: `admin-users:7`, `billing:19`, `scraper:18`, `send-push:5`).
- Hardcode IndexNow: `ping-search-engines/index.ts:64`.
- SSRF `instagram-thumbnail`: validação só de protocolo em `:52`; `fetch` em `:12`, `:64`, `:79`.
- SSRF `fetch-og-image`: protocolo em `:51`; `fetch(url)` em `:58`.
- Rate-limit `scraper`: `:14-39`, aplicado em `:541`.
- Quota `analyze-feedback`: `:205-235`.
- Service-role claim check (padrão correto): `process-email-queue/index.ts:70-77`.
- Ownership check storage: `finance-extract-receipt/index.ts:69-71`.
- HMAC webhook: `auth-email-hook/index.ts:148-182`.
- Allowlist de host: `scraper/index.ts:298` (mesaquest), `:480` (worldcraft).
