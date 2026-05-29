# 🚦 START HERE — orientação para começar o Nuckturp QG

> Você (Claude) acaba de assumir a **reescrita do zero** do "QG do Mestre". Este é o seu roteiro de partida. Leia-o inteiro, depois siga a ordem abaixo. **Não escreva código ainda.**

## 0. O que é este projeto (em 30 segundos)
- App existente: "QG do Mestre" (marca **Nuckturp**), plataforma para mestres de RPG. ~134 usuários ativos, tráfego de SEO concentrado em conteúdo de D&D 5e.
- Hoje: **Vite/React SPA no Lovable Cloud** (445 arquivos, ~26 Edge Functions Deno, editor TipTap, whiteboard, PWA, i18n).
- Objetivo: reconstruir em **Next.js 15 App Router + Supabase próprio**, na **Hostinger**, **mesmo domínio** `nuckturp.com.br`, **sem afetar usuários**.
- Por quê: **independência** (fim do lock-in) + **SEO real** (SSR/SSG). Sem prazo; qualidade acima de velocidade.

## 1. Ordem de leitura (no projeto antigo — somente leitura)
Caminho base: `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp`

1. **`docs/MIGRACAO-NEXTJS.md`** — a espinha. Plano 8 fases × 5 sub-fases + **Fase 00 (spikes GO/NO-GO)** + Decision Log (D1–D24) + §7 resultados do multi-agent review. **Disposição: APPROVED.**
2. **`docs/PRD.md`** — o quê/por quê/para quem; escopo de paridade.
3. **`docs/architecture.md`** + **`docs/adr/`** (ADR-0001 a 0005) — decisões técnicas.
4. **`docs/design-system.md`** + **`docs/branding.md`** — identidade visual a preservar verbatim (+ camada de motion).
5. **`docs/developer_guide.md`** — estrutura-alvo feature-first e convenções.
6. **`docs/security.md`**, **`docs/ops.md`**, **`docs/testing.md`**, **`docs/api.md`** — operação/qualidade.
7. **`docs/FEATURES.md`** + **`docs/plataforma-negocio.md`** — referência de paridade funcional (consultar por módulo, sob demanda).
8. **`docs/migration-runbook.md`** + `src/`/`supabase/` antigos — operação do cutover e referência de código (sob demanda, não tudo de uma vez).
9. **`FREEZE.md`** (raiz do projeto antigo) — regra de feature-freeze do app velho durante a reescrita.

## 2. Primeiras ações (nesta ordem)
1. **Confirmar entendimento com o Marco** — resuma o plano em poucas linhas e levante dúvidas antes de tudo.
2. **`git init`** neste diretório (`D:\ProjetoAntigravity\Nuckturp_QG`) — repositório próprio, novo.
3. Criar **`TODO.md`** e a **memória** deste projeto (copiando as regras inquebráveis do `CLAUDE.md`).
4. **Executar a Fase 00 (spikes de viabilidade)** — NÃO pular. Esses 4 spikes podem abortar/replanejar:
   - **00.1** Auth/senha: `pg_dump` do schema `auth` do Lovable; provar leitura de `encrypted_password` + `auth.identities` e que é bcrypt GoTrue; testar login email + Google + identidade dupla. **NO-GO aborta.**
   - **00.2** Credenciais: connection string `Direct` + `service_role` sem transfer? Se exigir transfer ⇒ **pausa e decisão do Marco**.
   - **00.3** ~~Runtime Hostinger~~ → **RESOLVIDO (D3 + ADR-0003: VPS "A")**. Não é mais gate de viabilidade. Resta só o **checklist de spec da VPS**: RAM dedicada ≥ 2 GB, vCPU ≥ 2, Ubuntu LTS, Node 22, SSH + firewall + PM2/systemd, SSL (Hostinger ou Let's Encrypt).
   - **00.4** Ensaio de cutover cronometrado com volume real + rollback de verdade.
   - **00.5** GO/NO-GO documentado (POC validado vs aposta).
5. Só com **GO** → começar a **Fase 0.1** (scaffold Next.js).

## 3. Como trabalhar
- **Sub-fase por sub-fase**, com critério de saída. Validar com o Marco ao fim de cada uma.
- **Context7 antes de codar** qualquer lib (Next.js 15, `@supabase/ssr`, etc.).
- **Nunca tocar** no projeto antigo (read-only). Nunca mudar slugs. Preservar UUIDs/identities no cutover.
- Atualizar `TODO.md` e o Decision Log conforme avança.

## 4. Lembretes de guardrail (detalhe no `CLAUDE.md`)
Sem diálogo nativo · só tokens de design · RLS em tudo · `service_role` só server · licença proprietária · responder em pt-BR.

---
**Resumo:** ler (ordem acima) → confirmar com o Marco → `git init` → Fase 00 (spikes) → GO/NO-GO → Fase 0.1. Devagar e sempre.
