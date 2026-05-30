# TODO — Nuckturp QG

> Reescrita do QG do Mestre (Nuckturp) de Vite/React (Lovable) → Next.js 16 + Supabase próprio.
> Fonte de verdade do plano: `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp\docs\MIGRACAO-NEXTJS.md` (APPROVED).
> Slow and steady — 8 fases × 5 sub-fases + Fase 00 (spikes GO/NO-GO). Nada avança sem o anterior validado.

## 🔀 PIVOT — QG 100% pago (2026-05-29) — ver `docs/PIVOT-MODELO-PAGO.md`

Modelo freemium morre · R$29 · home = página de vendas · Academia removida do app · usuários atuais = Mestre VIP · WorldCraft grátis (badge header) · MesaQuest cupom · IA limitada + add-on. **SUPERSEDE PRD §3/§4.8.**

### Tarefas geradas pelo pivot (a executar nas fases certas)

- [ ] Revisar o PRD (modelo, Academia, monetização, métricas) refletindo o pivot.
- [x] **Página de vendas (home)** construída → `app/page.tsx` (copy via `/copy-basic` em `docs/copy-pagina-vendas.md`; design Onda D; trial 21d sem cartão; 134+; depoimento placeholder; badge WorldCraft). Botão canônico `components/ui/button.tsx` + `cn` em lib/utils. Build verde + screenshot conferido. CTAs apontam p/ `/signup` (rota futura, Fase 2).
- [ ] Paywall no nível do app (billing gateia tudo) + tiers (pago/VIP/WorldCraft/MesaQuest).
- [ ] Entitlement cross-product WorldCraft (cruzar Stripe/DB) + badge header 🔓 "assinante worldcraft".
- [ ] Cupom MesaQuest (Stripe coupons).
- [ ] Metering de IA (quota base) + add-on pago de requisições (conecta achado S8).
- [ ] Grandfather: marcar todos os migrados como VIP no cutover + regra de inatividade p/ revogar.
- [ ] Academia: remover UI/rotas `/journey/*` do escopo de port; decidir destino das URLs e das tabelas `academy_*`.
- [x] Confirmações C1–C7 resolvidas (2026-05-29): R$29/mês+trial 21d · SEO público aberto · WorldCraft via Stripe · IA quota base+add-on · VIP revoga 90d · manter tabelas academy\_\* · MesaQuest cupom (mecanismo+% a definir).
- [ ] Pendências derivadas: números de pricing da IA (C4) · mecanismo+% do cupom MesaQuest (C7) · confirmar mesmo Stripe account QG↔WorldCraft (pré-req C3).

## Em andamento (preparação — Supabase pendente)

- [x] Frente 1 — Inventários do app antigo → `docs/inventario/` (schema, edge-functions, rotas-slugs, modulos).
- [x] Frente 3 — Suíte de docs portada para `docs/` (VPS "A" + npm) + planos dos spikes 00.1 e 00.4.
- [x] Frente 2 (scripts) — Migração portada/corrigida em `scripts/` (export/import com schema `auth`).
- [x] Frente 2 (ferramentas) — pg_dump/psql 18.4, jq, supabase CLI instalados via scoop.
- [x] Frente opcional — Substitutos do lock-in mapeados em `docs/migracao-lock-in.md` (IA→Gemini REST, e-mail→Resend).
- [ ] (bloqueado) Fase 00.1 auth spike → aguarda acesso ao Lovable.

## Front — Fase 0 (gate da Fase 00 furado conscientemente pelo Marco)

> Decisão do Marco (2026-05-28): começar a fundação antes do GO da Fase 00, limitada ao que NÃO depende de auth (parar antes da Fase 2). Risco assumido: retrabalho se o spike 00.1 abortar.

- [x] Prep front: inventário de UI (`docs/inventario/ui-componentes.md`) + extração designlang (`docs/inventario/designlang/`).
- [x] **0.1 Scaffold Next 16** (App Router, TS strict, `output: 'standalone'`, Turbopack, Tailwind v4, alias `@/*`). `npm run build` verde.
- [x] 0.2 Design aplicado: tokens HSL dark-first (valores reais do app), Space Grotesk + Inter via `next/font`, Tailwind v4, gradiente nuckturp + `<strong>`/`<em>` de marca. Build verde + screenshot conferido. (Divergências refletidas como erratas nos docs; `FloatingDice` → Fase 5.)
- [x] 0.5 App shell: layout pt-BR dark + metadata Nuckturp + placeholder com a identidade (badge, gradiente, chips).
- [x] 0.4 Qualidade: ESLint `no-alert`, Prettier, husky+lint-staged (pre-commit validado), Vitest (3 testes), Playwright base (channel chrome). lint/typecheck/test verdes.
- [x] Docs: erratas em design-system.md/branding.md (apontam ui-componentes.md) + assets de marca copiados p/ `public/`.
- [ ] 0.3 Camada Supabase (`@supabase/ssr`) — depende de um projeto Supabase (bloqueado).
- [x] **0.3 + Fase 2.1 (auth núcleo)** feito e validado E2E: `/auth` (login/cadastro), `(app)` guard, `/dashboard`, callback, logout; signup cria profile+tenant. Reframe: o SISTEMA de auth não é refém do spike 00.1 (só a migração dos usuários Lovable, que é cutover).
  - [ ] Fase 2 resta: admin decoy/MFA · Google OAuth (client Google) · `/redefinir-senha` · onboarding · shell autenticado (sidebar/mobile-nav).

> Restante bloqueado: spikes 00.1/00.4 e Fase 1 dependem do acesso ao Lovable/Supabase.

## Auditoria preliminar (grande pausa — antes de portar)

- [x] **Onda A · Segurança & RLS** → `docs/auditoria/` (rls-policies, edge-seguranca, auth-admin-secrets + consolidado `seguranca-rls.md` + `admin-model.md` com design decoy+real). 12 achados (S1–S12) priorizados.
- [x] **Onda D · Design** → `docs/auditoria/design/` (6 lentes) + consolidado `design-diagnostico.md`. Convergência: corrigir regressão do `page.tsx`, preservar DNA, unificar sistema antes de portar, bottom-nav+a11y, disciplina de motion (D20 = momento Tompkins), voz de mestre 2ª pessoa.
- [x] **Onda B · Interconexão** (via /maestro) → `docs/auditoria/interconexao.md` (feature→camadas + 13 serviços + 4 fluxos Mermaid). Achado: billing antigo SEM webhook (polling 5min) → paywall exige webhook+`entitlements`.
- [x] **Onda C · Codemap** (via /maestro) → `docs/auditoria/codemap-legado.md` (navegação do `src/` por feature) + `.claude/INDEX.md` expandido. Achado: hooks da Academia compartilhados com Blog/Admin/Notas (não deletar cego).

### Decisões resolvidas (rodada 2026-05-29) ✅

- D-A: Academy RLS = **só publicados + Premium no banco**.
- D-B: **versionar `consent_links` + RLS antes do port** (LGPD).
- D-C: SSRF = **exigir auth + hardening**.
- Decoy/admin: **rota por secret + 404 + MFA no MVP**.
- E1: easing = **token set** (`[0.22,1,0.36,1]` entradas + standard micro).
- E2: fonte de corpo = **rodar spike Geist vs Inter** (decidir após).
- E3: D20 = **Fase 5** (spec agora).
- E4: bottom-nav = **adiado** (casca de navegação).
- E5: **P0 aplicado** (page.tsx on-brand + reduced-motion WCAG).

### Tarefas geradas pelas decisões (a executar)

- [x] **Spike de fonte** (E2) → escolhido e **aplicado**: **Geist (corpo) + Geist Mono (números)** em layout.tsx/globals.css; Space Grotesk no display. Build verde. Spike em `docs/auditoria/spike-fontes.{html,md}`. Também corrigida a metadata description (removido "hub", humanizer 4.2).
- [ ] **Revisar PRD** → feito (subagent, refletindo o pivot: §3 reescrita, Academia removida, métricas trial→pago, Stripe gateia app). ⚠️ Em-dashes pré-existentes no PRD a limpar quando "donos" do doc.
- [ ] Versionar `consent_links` + RPCs de consentimento com RLS (Fase 1, antes do port) — inventariar `manual-scripts/` primeiro.
- [ ] Spec do D20 animado para a Fase 5 (capturar agora).
- [ ] Hardening SSRF + auth nas functions de OG/thumbnail (Fase 1.4/6.3).
- [ ] Camada de auth/admin com decoy+real+MFA (Fase 2).

## Decisões travadas (2026-05-28)

- Hospedagem = **VPS "A"** (D3/ADR-0003). START-HERE.md corrigido; PRD/ops/architecture do projeto antigo seguem desatualizados (read-only, corrigir ao portar docs).
- Gerenciador de pacotes = **npm** (consistente com os 5 projetos Next do Marco; trocar pnpm→npm ao portar docs).

## Próximo (bloqueado por confirmação + acessos)

- [ ] **Fase 00 — Spikes de viabilidade (GO/NO-GO).** Requer acessos que o Marco abre sob demanda.
  - [ ] 00.1 Auth/senha: `pg_dump` schema `auth` do Lovable; provar leitura de `encrypted_password` + `auth.identities`; confirmar bcrypt GoTrue; testar import + login email/Google/identidade dupla. **NO-GO aborta.**
  - [ ] 00.2 Credenciais: connection string `Direct` + `service_role` sem transfer ownership; confirmar Google client_id/secret. Se exigir transfer ⇒ decisão do Marco.
  - [ ] 00.3 Spec da VPS "A" (decisão D3 já tomada): ≥2 GB RAM, ≥2 vCPU, Ubuntu LTS, Node 22, PM2/systemd, SSL. (Não é mais gate de viabilidade.)
  - [ ] 00.4 Ensaio de cutover cronometrado: export→import→sync-storage com volume real (DB ~231 MB + Storage ~408 MB) + rollback de verdade (runbook §8).
  - [ ] 00.5 GO/NO-GO documentado (POC validado vs aposta).

## Fases (macro — detalhe no plano-mestre)

- [ ] Fase 0 — Fundação & arquitetura (scaffold, design system, camada Supabase, qualidade, app shell). Local.
- [~] Fase 1 — Schema-first: ✅ schema (209 migrations, 85 tabelas, 0 sem RLS) + types + `@supabase/ssr` (0.3) + **grants das roles corrigidos** (migration de grants) + **478 posts públicos espelhados** do Lovable (dev, sem PII, via `scripts/mirror-posts.mjs`). ⏳ pendente: 1.4 deploy das edge functions (secrets + lock-in); 1.5 seed de dados privados sintéticos. Ver `docs/fase1-migracao-notas.md`.
- [ ] Fase 2 — Núcleo: Auth + shell + design. Inclui **2.2 dry-run de senha/identities** (risco nº 1).
- [ ] Fase 3 — Páginas públicas SSR/SSG (SEO): blog, perfil, dicionário, landing, metadata/sitemap/RSS/OG + diff de HTML.
- [ ] Fase 4 — App autenticado por módulo (campanhas, diário/TipTap, whiteboard, jogadores, ferramentas, admin). Gate de corte D17 pós-4.2.
- [ ] Fase 5 — Motion & polish.
- [ ] Fase 6 — Hardening & pré-cutover (paridade SEO, Lighthouse, segurança/RLS total, carga, staging).
- [ ] Fase 7 — Cutover (janela de manutenção, comunicação 48h/2h, freeze read-only, import preservando UUIDs/identities, smoke com conta real).
- [ ] Fase 8 — Pós-cutover (Search Console, erros, e-mails/push/Stripe/cron, descomissionar Lovable).

## Concluído recente

- [x] Ler os dois arquivos de orientação (CLAUDE.md, START-HERE.md) e confirmar entendimento de alto nível.
- [x] `git init` + primeiro commit + push para `origin/main` (https://github.com/binidev360/nuckturp_qg.git).
- [x] Criar `.gitignore`, `README.md`, memória do projeto e este `TODO.md`.
- [x] Ler docs core do projeto antigo: MIGRACAO-NEXTJS, PRD, architecture, developer_guide, ADR-0001..0005, design-system, branding, security, ops, testing, api.

## Guardrails (resumo — detalhe em CLAUDE.md/START-HERE.md)

Não tocar no projeto antigo (read-only) · preservar UUIDs+identities no cutover · mesmos slugs (SEO) · sem diálogo nativo (`no-alert`) · só tokens de design · RLS em tudo · `service_role` só server · Context7 antes de codar · licença proprietária · pt-BR.
