# Auditoria — Autenticação, Modelo de Admin e Postura de Segredos

> **Escopo:** projeto antigo "QG do Mestre" (Nuckturp), Vite/React no Lovable, em
> `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp` (estritamente read-only).
> **Objetivo:** embasar o redesenho do padrão "admin decoy + admin real" na reescrita Next.js + Supabase próprio.
> **Data:** 2026-05-29. Tudo abaixo descreve o **estado atual (legado)**, não a versão nova.

---

## TL;DR (veredito)

- **Auth:** Supabase Auth (`@supabase/supabase-js`) com sessão em `localStorage`. E-mail/senha nativo; **Google OAuth via wrapper Lovable** (`@lovable.dev/cloud-auth-js`) — único acoplamento real ao Lovable na camada de auth.
- **Admin:** determinado por **linha em `public.user_roles` com `role = 'admin'`** (enum `app_role`). **Há reforço server-side real** (edge function + RLS + RPCs `SECURITY DEFINER`). O gating de **rota no client é puramente cosmético** (redirect via `<Navigate>`), mas os **dados/mutações admin são protegidos no servidor**. **Não há auto-promoção possível** por um usuário comum.
- **Segredos:** **nenhum `service_role` no client/bundle.** O `.env` só tem URL + anon/publishable key. **Pendência confirmada:** a **anon key vazou no histórico git** (commits `91efc759` / `1046cc40`) — precisa ser invalidada no projeto Lovable, não só "nascer nova".

---

## (a) Fluxo de autenticação atual

### Client Supabase

- **`src/integrations/supabase/client.ts`** (auto-gerado pelo Lovable, marcado "Do not edit"):
  ```ts
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
  });
  ```
  → Sessão persistida em **`localStorage`** (não cookie httpOnly). Token JWT exposto ao JS do browser — padrão SPA, mas vulnerável a XSS e **incompatível com SSR** (não dá pra ler sessão no servidor Next).
- **`src/integrations/supabase/portable.ts`** — cliente "portável" escrito à mão durante a preparação da migração. Lê env de Vite **ou** Node/Next **ou** Deno (`NEXT_PUBLIC_* | VITE_* | SUPABASE_*`), e expõe `createServerClient({ serviceRole: true })` que usa `SUPABASE_SERVICE_ROLE_KEY` (só server). **Já antecipa o cenário Next**, mas ainda não usa cookies (`@supabase/ssr`).

### Estado de sessão no app — `src/hooks/useAuth.tsx`

- `AuthProvider` (Context) assina `supabase.auth.onAuthStateChange` + fallback de 1s com `getSession()`.
- Ao logar, `fetchUserData(userId)` faz **3 queries em paralelo**:
  1. `memberships` → `tenantId` (multi-tenant: 1 mestre = 1 tenant).
  2. `profiles` → `onboarding_completed`, `locale`.
  3. **`user_roles` `.eq("role","admin")`** → define `isAdmin` (booleano no contexto).
- Expõe `{ session, user, loading, tenantId, onboardingCompleted, isAdmin, signOut, refreshProfile }`.
- Observação: `isAdmin` no client é **derivado de uma query RLS-protegida**, mas serve apenas para **UI/redirect** — não é fonte de autoridade.

### Login / signup / recuperação — `src/pages/Auth.tsx`

- **E-mail/senha:** `supabase.auth.signInWithPassword` (login) e `supabase.auth.signUp({ options: { emailRedirectTo: window.location.origin } })` (cadastro com verificação de e-mail).
- **Lockout client-side:** após N tentativas falhas, bloqueio temporário com countdown (apenas no client — não é rate-limit de servidor).
- **Reset de senha:** `supabase.auth.resetPasswordForEmail(email, { redirectTo: .../redefinir-senha })`.
- **Banimento:** mensagens de erro detectam `"banned"`/`"User is banned"` para exibir tela de conta banida.
- **Google OAuth:** `lovable.auth.signInWithOAuth("google", { redirect_uri })` — **único ponto que depende do Lovable**.

### Wrapper Lovable — `src/integrations/lovable/index.ts`

- Auto-gerado. Usa `createLovableAuth()` de **`@lovable.dev/cloud-auth-js`**.
- Fluxo: chama OAuth do provider via Lovable → recebe `result.tokens` → aplica no Supabase com `supabase.auth.setSession(result.tokens)`.
- Suporta `"google"` e `"apple"` (só Google é usado na UI).
- **Implicação para a reescrita:** este wrapper **tem que sumir**. O Google OAuth deve ser reconfigurado direto no Supabase Auth próprio (`signInWithOAuth({ provider: 'google', options: { redirectTo } })` + provider Google configurado no painel Supabase, com o **mesmo `client_id/secret`** — ver D9/gate 00.2 do plano de migração).
- **Verificação de e-mail:** há edge function `supabase/functions/auth-email-hook` (Auth Email Hook do Supabase) — confirmação de e-mail é tratada pelo Supabase Auth nativo + template custom.

---

## (b) Modelo de admin atual (DETALHADO) — **o ponto crítico**

### Como a permissão de admin é determinada

A autoridade canônica é uma linha em **`public.user_roles`** com `role = 'admin'`. Não é mais a coluna `profiles.is_admin` (legada/depreciada — ver evolução abaixo).

**Definição do schema** — `supabase/migrations/20260311005414_b0886f36-...sql`:

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS: SÓ admins leem/gerenciam roles (este é o anti-self-promotion guard)
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- função sem recursão, SECURITY DEFINER
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- is_admin() reescrita para consultar user_roles (antes consultava profiles.is_admin)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean ...
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
```

Este é o **padrão canônico Supabase/Lovable** (tabela de roles separada + `has_role()`/`is_admin()` `SECURITY DEFINER` para evitar recursão de RLS). Migrações de maio/2026 já usam a forma tipada `public.has_role(auth.uid(), 'admin'::app_role)` em policies novas (ex.: `edge_function_metrics`, `_purge_backup_20260522`).

### A checagem é só client-side ou há reforço server-side?

**Há reforço server-side real, em três camadas:**

1. **Edge Function `admin-users`** (`supabase/functions/admin-users/index.ts`) — gateway de TODA operação administrativa (stats, list/create/update/delete users, ban, premium override, cost settings, métricas de infra, etc.). Padrão de guarda no topo do handler (linhas ~16-50):

   ```ts
   const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ...); // service role
   const token = req.headers.get("Authorization")!.replace("Bearer ", "");
   const { data: { user } } = await supabase.auth.getUser(token);       // valida JWT
   if (!user) return 401 Unauthorized;
   const { data: adminRole } = await supabase.from("user_roles")
     .select("id").eq("user_id", user.id).eq("role","admin").single();
   if (!adminRole) return 403 Forbidden;                                // GATE server-side
   // ... só aqui em diante executa qualquer ação
   ```

   → Mesmo que alguém chame a function direto com um JWT de usuário comum, recebe **403**. A function usa `service_role` (bypassa RLS), mas **só depois de provar que o caller é admin**.

2. **RLS em `user_roles`** (policy "Admins can manage roles", acima) — bloqueia leitura/escrita da tabela de roles para quem não é admin. É o que **previne auto-promoção** (ver abaixo).

3. **RPCs `SECURITY DEFINER`** com checagem interna — ex.: `admin_platform_stats()` e a versão antiga de `admin_list_users()` faziam `IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'`. (As versões novas chamadas pela edge function confiam no gate da function, já que rodam sob `service_role`.) Funções de métrica novas (`get_edge_function_stats`) filtram por `has_role(auth.uid(),'admin')` na própria query e têm `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated`.

### O gating de **rota** (client) — puramente cosmético

- **`src/components/ProtectedRoute.tsx`** verifica **apenas** `session` + `onboardingCompleted`. **NÃO verifica `isAdmin`.**
- Em **`src/App.tsx`**, todas as rotas admin (`/admin`, `/admin/blog`, `/admin/templates`, `/admin/dictionary`, `/journey/admin`, `/journey/admin/cards`, `/journey/admin/livros`, `/journey/admin/cursos`, etc.) passam por `LayoutRoute = <ProtectedRoute><AppLayout>…`. Ou seja, no nível do roteador **qualquer usuário logado alcança o componente**.
- O comentário no App.tsx é explícito: _"Área administrativa — cada página protege com `isAdmin` internamente"_. De fato, cada página admin faz seu próprio redirect:
  ```ts
  // src/pages/Admin.tsx (linhas ~92-108)
  const { isAdmin, loading } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  ```
- **Consequência de segurança:** o redirect é **defesa cosmética** (esconde a UI). Não é barreira real — o componente chega a montar, e qualquer chamada de dado que ele faça **só retorna dados porque** o servidor (edge function / RLS) reautoriza. **A segurança real mora no servidor, não no `<Navigate>`.** Isso é exatamente o que valida a viabilidade de um padrão **"admin decoy + admin real"** na versão nova: o decoy é o que o client mostra/esconde; o real é o gate server-side.

### Proteção contra auto-promoção — **existe**

- Um usuário comum **não consegue** inserir/atualizar a própria linha em `user_roles`: a policy `WITH CHECK (public.is_admin(auth.uid()))` falha para quem não é admin.
- A única via de set `is_admin` é a ação **`update-user`** da edge function (linhas ~1623-1680):
  ```ts
  if (newIsAdmin)
    await supabase
      .from("user_roles")
      .upsert({ user_id, role: "admin" }, { onConflict: "user_id,role" });
  else await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
  ```
  …e essa ação **só é alcançável após o gate `403 Forbidden`** do topo da function. Logo, **só um admin já existente promove outro**.
- O trigger histórico `protect_is_admin_trigger` (que protegia a coluna `profiles.is_admin`) foi **dropado** quando a coluna virou legada (migration `20260311005414`, passos 8). Hoje a coluna `profiles.is_admin` ainda existe mas **não é mais a fonte de verdade**.

**Lacunas/observações (não bugs críticos, mas relevantes para o redesenho):**

- Não há guard explícito de **"admin não pode se auto-rebaixar"** nem **"não remover o último admin"** — um admin pode, via `update-user`, remover a própria role ou a de outro admin (risco operacional de lockout, não de elevação).
- A edge function tem **CORS `Access-Control-Allow-Origin: *`** (ver pendências de segredos) — não é hole de auth (o JWT ainda é exigido), mas amplia superfície.
- O `bootstrap` do primeiro admin é manual (INSERT direto em `user_roles` / migração `profiles.is_admin=true → user_roles`, passo 6 da migration). Na versão nova, definir um processo de seed explícito.

### Evolução histórica do modelo (contexto)

1. **Início:** `profiles.is_admin boolean` + `is_admin(uuid)` lendo `profiles` (`20260222183205_...sql`), protegido por trigger `protect_is_admin`.
2. **Refator (`20260311005414`):** introduz enum `app_role` + tabela `user_roles` + `has_role()`; migra admins existentes; reescreve `is_admin()` para ler `user_roles`; **dropa** o trigger e a coluna deixa de ser autoritativa.
3. **Maio/2026:** policies novas adotam `has_role(auth.uid(),'admin'::app_role)` diretamente.

---

## (c) Postura de segredos + pendências de rotação

### Onde as chaves são lidas

| Contexto              | Variável                                                                         | Tipo                    | Exposição                               |
| --------------------- | -------------------------------------------------------------------------------- | ----------------------- | --------------------------------------- |
| Browser (Vite)        | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | URL + anon/publishable  | **Pública** (vai pro bundle — esperado) |
| Scripts server locais | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`                                       | aliases sem `VITE_`     | Local                                   |
| Edge Functions (Deno) | `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, etc.                           | **secrets server-only** | Nunca no client                         |
| Cliente portável      | `SUPABASE_SERVICE_ROLE_KEY` (só em `createServerClient({serviceRole:true})`)     | service role            | Só server/edge                          |

- **`.env` real auditado** (valores redigidos): contém **apenas** `SUPABASE_URL`, `(VITE_)SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`. **Nenhum `service_role`, nenhum secret de Stripe/Gemini/Resend/VAPID** no `.env` versionável local. ✅
- **`.gitignore`** ignora `.env`, `.env.local`, `.env.production`, `.env.staging`, `.env.*.local`. ✅
- **`admin-users/index.ts`** lê `SUPABASE_SERVICE_ROLE_KEY` e `STRIPE_SECRET_KEY` via `Deno.env.get(...)` — **secrets de Edge Function**, corretamente fora do bundle. ✅
- **Não há `service_role` exposto no client nem no bundle.** O único secret sensível que transita é o **JWT de sessão do usuário** (em `localStorage`, padrão SPA).

### Pendências de rotação confirmadas (de `docs/security.md`)

> Fonte: `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp\docs\security.md`, seção 2.

- [ ] **Rotacionar/invalidar a anon key do Supabase** — **vazou no histórico git** (commits **`91efc759`** e **`1046cc40`**). ⚠️ O plano de migração (D21) ressalta: **não basta "o novo projeto nascer com chave nova"** — a **chave antiga continua válida no projeto Lovable** após o cutover; é preciso **invalidá-la explicitamente** no projeto antigo.
- [ ] **Remover `.env` do histórico git** (`git filter-repo` / BFG) — ou aceite formal de risco baixo (repo privado + chave rotacionada).
- [ ] **Rate limiting de autenticação** no Supabase Auth (hoje só há lockout client-side, contornável).
- [ ] **Validar `VAPID_SUBJECT`** (`mailto:`/`https://`) nas Edge Functions.
- [ ] **Auditar buckets de Storage** (privado vs público) — dado privado nunca em bucket público.
- [ ] **CSP header** (no servidor Next ou Cloudflare).
- [ ] **CORS das Edge Functions** — hoje `Access-Control-Allow-Origin: *` (confirmado em `admin-users`). Travar: público só sitemap/rss/og; IA/OCR/scraper/**admin** restritos a `nuckturp.com.br`.

> Nota: o **CHANGELOG.md** não registra a rotação; a memória institucional do vazamento vive em `security.md`. O plano `MIGRACAO-NEXTJS.md` (Fase 6.3 + D21) reforça a auditoria total de `pg_policies` (não amostragem) e JWT obrigatório nas mutativas (`admin-users`, `billing`).

---

## (d) Recomendações para a versão nova (Next.js App Router + Supabase próprio)

### Auth

1. **Adotar `@supabase/ssr`** (decisão D12 do plano). Três clients:
   - **browser client** (componentes client) — `createBrowserClient`.
   - **server client** lendo/escrevendo **cookies httpOnly** via `cookies()` (Server Components, Route Handlers, Server Actions).
   - **middleware** que renova a sessão e lê claims. Usar **`getClaims()`** (verificação local do JWT, sem round-trip) para gating leve, e **`getUser()`** quando precisar de garantia forte (revalida no Auth server).
   - **Migrar a sessão de `localStorage` → cookies httpOnly/secure/sameSite** (mitiga XSS-token-theft e habilita SSR). Atende ao threat model (Spoofing) do `security.md`.
2. **Eliminar o wrapper Lovable** (`@lovable.dev/cloud-auth-js`). Configurar **Google OAuth nativo** no Supabase próprio com o mesmo `client_id/secret` (gate 00.2/D9) e `signInWithOAuth({ provider:'google', options:{ redirectTo } })` + callback `/auth/callback` (Route Handler que faz `exchangeCodeForSession`).
3. **Login/signup/reset como Server Actions** (D12 / Fase 2.1), preservando: verificação de e-mail, lockout (agora **server-side** + rate-limit do Supabase Auth), banimento.
4. **Preservar usuários no cutover:** mesmos UUIDs de `auth.users` + `auth.identities` + `email_confirmed_at` (guardrail do CLAUDE.md). Não recriar via CSV.

### Modelo de admin (com o padrão "decoy + real")

5. **Manter `user_roles` + enum `app_role` + `has_role()`/`is_admin()` `SECURITY DEFINER`** — o padrão atual é sólido e idiomático; portar verbatim do schema legado.
6. **Role como autoridade server-side, sempre.** Determinar admin no **servidor** (Server Component / middleware / Route Handler) via `has_role(auth.uid(),'admin')` ou checagem em `user_roles` sob JWT do usuário — **nunca confiar no client**. O `isAdmin` do client serve só para renderização (mostrar/esconder o "real").
7. **Padrão "admin decoy + admin real":**
   - **Decoy:** rota/UI pública aparente (ou rota admin "óbvia" que sempre nega/404) — defesa por obscuridade, cosmética.
   - **Real:** rota administrativa de verdade protegida no **servidor** (middleware + layout server-side que faz `redirect()`/`notFound()` se `!has_role`). Como o legado já prova que o redirect client é cosmético e o servidor é o gate verdadeiro, o decoy é seguro **desde que** toda leitura/mutação admin seja reautorizada server-side (RLS + Route Handlers com `getUser()`), independente da rota acessada.
   - **Não vazar a existência** da rota real: usar `notFound()` (404) em vez de `redirect('/dashboard')` para não confirmar que a rota existe a um não-admin.
8. **Fechar as lacunas do legado:**
   - Guard **"não remover o último admin"** e/ou **confirmação para auto-rebaixamento** (evita lockout operacional).
   - **Auditoria de ações admin** (já há `post_admin_actions`; generalizar para promoção/rebaixamento/ban — atende Repudiation do threat model).
   - **Seed explícito** do primeiro admin (migration/script idempotente), não INSERT manual ad-hoc.
9. **JWT obrigatório + checagem de role em toda function mutativa** (`admin-users`, `billing`) — manter o gate `getUser → user_roles → 403` que já existe; **travar CORS** dessas functions para `nuckturp.com.br` (hoje `*`).

### Segredos

10. **`service_role` só server** (env do host Next + secrets das Edge Functions). Nunca em `NEXT_PUBLIC_*`. Só `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são públicas.
11. **Antes/durante o cutover:** **invalidar a anon key antiga no projeto Lovable** (D21) + decidir `git filter-repo`/BFG vs aceite formal do `.env` no histórico + rate limiting Auth + auditoria de buckets + CSP + CORS travado (checklist da seção (c)).
12. **RLS em toda tabela multi-tenant** com auditoria **total** de `pg_policies` (Fase 6.3 — não amostragem). `service_role` só server.

---

## Arquivos-fonte auditados (todos read-only, projeto antigo)

- `src/hooks/useAuth.tsx` — Context de sessão, deriva `isAdmin` de `user_roles`.
- `src/hooks/useAdmin.ts` — client das ações admin (chama a edge function `admin-users` com `Authorization: Bearer <access_token>`).
- `src/integrations/lovable/index.ts` — wrapper `@lovable.dev/cloud-auth-js` (Google/Apple OAuth).
- `src/integrations/supabase/client.ts` — client auto-gerado (anon key, `localStorage`).
- `src/integrations/supabase/portable.ts` — client portável escrito à mão (multi-env, service-role server-side).
- `src/components/ProtectedRoute.tsx` — gate de rota (session + onboarding; **sem** isAdmin).
- `src/App.tsx` — mapa de rotas; admin via `LayoutRoute`, redirect interno por página.
- `src/pages/Auth.tsx` — login/signup/reset/Google.
- `src/pages/Admin.tsx` — redirect cosmético `if (!isAdmin) <Navigate to="/dashboard"/>`.
- `supabase/functions/admin-users/index.ts` — **gate server-side real** (getUser → user_roles → 403) com `service_role`.
- `supabase/migrations/20260222183205_*.sql` — modelo legado (`profiles.is_admin`).
- `supabase/migrations/20260311005414_*.sql` — **modelo atual** (`app_role`, `user_roles`, RLS, `has_role`, `is_admin`).
- `supabase/migrations/20260522030052_*.sql` / `20260522143328_*.sql` — uso atual de `has_role(auth.uid(),'admin'::app_role)` em policies novas.
- `docs/security.md` — pendências de rotação + threat model.
- `docs/MIGRACAO-NEXTJS.md` — decisões D9/D12/D21, gate 00.2, Fase 2.1 e 6.3.
