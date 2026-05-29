# TODO — Nuckturp QG

> Reescrita do QG do Mestre (Nuckturp) de Vite/React (Lovable) → Next.js 15 + Supabase próprio.
> Fonte de verdade do plano: `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp\docs\MIGRACAO-NEXTJS.md` (APPROVED).
> Slow and steady — 8 fases × 5 sub-fases + Fase 00 (spikes GO/NO-GO). Nada avança sem o anterior validado.

## Em andamento (preparação — Supabase pendente)
- [x] Frente 1 — Inventários do app antigo → `docs/inventario/` (schema, edge-functions, rotas-slugs, modulos).
- [x] Frente 3 — Suíte de docs portada para `docs/` (VPS "A" + npm) + planos dos spikes 00.1 e 00.4.
- [x] Frente 2 (scripts) — Migração portada/corrigida em `scripts/` (export/import com schema `auth`).
- [x] Frente 2 (ferramentas) — pg_dump/psql 18.4, jq, supabase CLI instalados via scoop.
- [x] Frente opcional — Substitutos do lock-in mapeados em `docs/migracao-lock-in.md` (IA→Gemini REST, e-mail→Resend).
- [ ] (bloqueado) Fase 00.1 auth spike → aguarda acesso ao Lovable.

> **Preparação sem Supabase ESGOTADA.** Tudo o que restava agora depende do acesso ao Lovable/Supabase (spikes 00.1/00.4) ou do GO da Fase 00 (scaffold/Fase 1).

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
- [ ] Fase 1 — Schema-first (clonar backend sem dados; RLS, triggers, functions, ~26 Edge Functions, seed).
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
