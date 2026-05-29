# Testes & Qualidade — QG do Mestre

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

> Estratégia de testes da reescrita. Base configurada na Fase 0.4.

## 1. Pirâmide de testes
| Tipo | Ferramenta | Alvo |
|---|---|---|
| **Unitário** | Vitest + Testing Library | lógica pura (`lib/`, `features/*/schema.ts`), componentes isolados |
| **Integração** | Vitest + Supabase local | Server Actions, queries com RLS, edge functions |
| **E2E** | Playwright | fluxos críticos no browser |
| **Visual/a11y** | Playwright + axe | regressão visual e acessibilidade (AA) |

## 2. Fluxos críticos E2E (obrigatórios antes do cutover)
- Cadastro + verificação de e-mail + login (e-mail e **Google**).
- Criar campanha → sessão → checklist.
- Editor: criar/salvar nota (auto-save), export PDF, nota pública.
- Publicar post (capa obrigatória, checklist SEO) e indexação.
- Stripe checkout (modo teste) + webhook → status Premium.
- Push notification ponta a ponta.

## 3. Cobertura
- **Alvo:** ≥ 80% em `lib/` e `features/*/` (lógica de domínio).
- Componentes puramente visuais não puxam a meta; foco em lógica e Server Actions.

## 4. Requisitos de merge (CI)
- `lint` (inclui `no-alert`) verde.
- `typecheck` (tsc strict) verde.
- `test` (unit + integração) verde; cobertura ≥ 80% nas áreas alvo.
- E2E críticos verdes em PRs que tocam fluxos críticos.

## 5. Dados de teste & mocking
- **Supabase local** (`supabase start`) para integração com RLS real.
- Seed determinístico (`supabase/seed.sql`) com tenant + usuários sintéticos.
- Mock de serviços externos (Stripe/Gemini/Resend) por fixtures; nunca chamar APIs reais em CI.
- Para o **dry-run de migração de senha** (Fase 2.2), usar 2–3 usuários de teste reais do Lovable — fora do CI.
