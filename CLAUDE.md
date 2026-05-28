# CLAUDE.md — Nuckturp QG (reescrita Next.js)

> Projeto **novo, do zero**. Reconstrução total do "QG do Mestre" (hoje em Vite/React no Lovable) para **Next.js 15 App Router + Supabase próprio**, hospedado na Hostinger, mesmo domínio `nuckturp.com.br`. **Leia o `START-HERE.md` antes de qualquer coisa.**

## 🎯 Missão
Reescrever o QG do Mestre com base limpa, idiomática e escalável, **sem afetar os usuários** no cutover. Drivers: **independência** (fim do lock-in Lovable) + **SEO real** (SSR/SSG).

## 📚 Fonte de verdade — SOMENTE LEITURA
O projeto antigo e toda a documentação de migração vivem em:
`D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp`
- **NUNCA modifique** nada lá. É referência de paridade + o plano que você executa.
- O plano-mestre `docs/MIGRACAO-NEXTJS.md` foi **validado por multi-agent review (disposição APPROVED)**. Siga-o.

## ⛔ Guardrails inquebráveis
1. **Não escreva código antes de:** (a) ler os docs na ordem do `START-HERE.md`, (b) **confirmar o entendimento com o Marco**, (c) passar pela **Fase 00 (spikes de viabilidade GO/NO-GO)**. Os spikes podem abortar/replanejar o projeto — respeite os gates.
2. **Preservar SEO:** mesmos slugs/paths do app atual. Mudança de URL é proibida.
3. **Preservar usuários no cutover:** mesmos **UUIDs** de `auth.users` + `auth.identities` + `email_confirmed_at`. NUNCA recriar usuários via CSV.
4. **Sem diálogos nativos:** nunca `window.alert/confirm/prompt` — usar `Dialog`/`AlertDialog` (ESLint `no-alert`).
5. **Só tokens de design** (sem cor hardcoded); identidade visual portada **verbatim** de `docs/design-system.md`/`branding.md`.
6. **RLS em toda tabela** multi-tenant; `service_role` só server.
7. **Context7 obrigatório** para qualquer lib/API/SDK antes de codar (Next.js, Supabase, etc.) — a stack deve ficar 100% atual.
8. **Licença proprietária** (não OSS).

## 🧭 Como se organizar
- **Git próprio** aqui (`git init` neste diretório). Não tem relação com o git do projeto antigo.
- Manter `TODO.md` e memória próprios deste projeto, atualizados a cada avanço.
- Trabalhar **sub-fase por sub-fase** (8×5 + Fase 00), com critério de saída por sub-fase. *Slow and steady.*
- Estrutura-alvo feature-first do App Router: ver `docs/developer_guide.md` (no projeto antigo).

## 🗣️ Idioma
Responder sempre em **português brasileiro**, independente do idioma de código/docs/tooling.

## 🤝 Postura
Você é o executor; o Marco direciona e valida. Pergunte quando algo for ambíguo. Não invente requisitos. Não pule fases. Reporte honestamente (testes que falham, passos pulados).
