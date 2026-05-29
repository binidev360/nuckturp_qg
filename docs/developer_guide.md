# Guia do Desenvolvedor — QG do Mestre (Next.js)

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

> Convenções da reescrita. Estrutura-alvo feature-first no App Router.

## 1. Estrutura do repositório (alvo)

```
app/                      # Next.js App Router (rotas, layouts, route handlers)
  (public)/               # Páginas públicas SSR/SSG (blog, perfil, landing)
  (app)/                  # App autenticado (dashboard, editor, whiteboard, admin)
  api/                    # Route handlers (webhooks, sitemap, rss, og)
  auth/                   # Login, callback OAuth
features/                 # Módulos por domínio (campaigns, notes, whiteboard, players, blog…)
  <feature>/
    components/  hooks/  actions.ts  queries.ts  schema.ts  types.ts
components/ui/            # shadcn/ui + primitivos de marca
lib/                      # supabase/ (browser, server, middleware), utils, i18n
styles/                   # globals.css (tokens), tailwind
public/                   # assets estáticos, ícones PWA
supabase/                 # migrations + functions (Edge, Deno) — backend versionado
docs/                     # esta documentação
```

**Princípio:** lógica de domínio em `features/`; `app/` só orquestra rotas. Server Components por padrão; `'use client'` apenas onde há interatividade.

## 2. Convenções de código
- **TypeScript strict**; sem `any` sem justificativa.
- **Nomes:** componentes `PascalCase`; hooks `useX`; arquivos de feature `kebab-case`.
- **Server vs client:** mutações em `actions.ts` (`'use server'`); leituras client em `queries.ts` (TanStack Query).
- **Validação:** Zod em todo input (forms e Server Actions).
- **Sem cor hardcoded** — só tokens do design system.
- **🚫 Sem diálogos nativos** — nunca `window.alert/confirm/prompt`; usar `Dialog`/`AlertDialog`. Enforced por ESLint (`no-alert`).

## 3. Supabase no Next.js
- Browser client: `lib/supabase/client.ts`.
- Server client: `lib/supabase/server.ts` (`cookies()`), para RSC e Server Actions.
- Middleware: `lib/supabase/middleware.ts` com `getClaims()` — **nada de código entre `createServerClient` e `getClaims()`**.
- Service-role: `lib/supabase/admin.ts` — **só server**, para bypass de RLS em route handlers. Nunca expor no client.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (públicas) + `SUPABASE_SERVICE_ROLE_KEY` (server).

## 4. Branch strategy
**Trunk-based** com branches curtas:
- `main` protegida (CI verde + 1 review para merge).
- Features: `feat/<escopo>`; fixes: `fix/<escopo>`; docs: `docs/<escopo>`.
- Fases da migração: `migracao/fase-<n>-<sub>` (ex.: `migracao/fase-2-auth`).

## 5. Commits
Conventional Commits (ver [commit-template.md](commit-template.md)): `tipo(escopo): descrição`. Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`.

## 6. Qualidade local
```bash
npm run lint        # ESLint (inclui no-alert)
npm run typecheck   # tsc --noEmit
npm test            # Vitest
npm run test:e2e    # Playwright (fluxos críticos)
```
Pre-commit hooks (lint + typecheck + format) via husky/lint-staged. Ver [testing.md](testing.md).

## 7. Toda PR que muda comportamento
Atualiza a doc correspondente e o [CHANGELOG.md](../CHANGELOG.md). Ver [CONTRIBUTING.md](../CONTRIBUTING.md).
