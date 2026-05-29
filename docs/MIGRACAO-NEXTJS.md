# Plano-Mestre — Migração QG do Mestre → Next.js + Supabase próprio

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

> **Objetivo:** sair do Lovable Cloud (independência) e ganhar SEO real (SSR/SSG), reescrevendo o app de Vite/React SPA para **Next.js App Router**, com backend em **Supabase próprio**, hospedado na **Hostinger**, **no mesmo domínio** `nuckturp.com.br`, **sem afetar usuários**.
>
> **Princípio operacional:** *slow and steady* — 8 fases × 5 sub-fases, 100% local até o cutover, paridade por módulo, qualidade acima de prazo.
>
> **Status:** 📐 Design validado · aguardando início da Fase 0
> **Data:** 2026-05-22 · **Relacionados:** [`PRD.md`](PRD.md), [`migration-runbook.md`](migration-runbook.md), [`branding.md`](branding.md)

---

## 0. Resumo do Entendimento (Understanding Lock)

- **O quê:** reescrita idiomática completa Vite SPA → Next.js (App Router), saindo do Lovable Cloud para Supabase próprio, hospedado na Hostinger.
- **Por quê:** independência/fim do lock-in (driver A) + SEO real via SSR/SSG (driver C).
- **Para quem:** ~134 MAU, mestres de RPG; tráfego de SEO concentrado em conteúdo (D&D 5e).
- **Restrições:** mesmo domínio e mesmos slugs/paths; senhas continuam funcionando (sem reset em massa); cutover via janela de manutenção curta.
- **Não-objetivos:** trocar domínio/rebrand; zero-downtime sofisticado; reescrever Edge Functions; produzir conteúdo da Academia.

### Premissas confirmadas
1. Edge Functions (~26, Deno) vão para o novo Supabase **como estão** (refatoração oportunista).
2. PWA, i18n e editor TipTap **preservados**.
3. Cloudflare permanece como DNS/CDN; lógica de SEO do worker migra para o Next.
4. Claude Code executa a reescrita; Marco direciona e valida. **Sem prazo rígido.**
5. Migração de senha é viável (cópia preserva UUIDs); **risco nº 1 a validar com dry-run cedo**.

---

## 1. Estratégia da cópia de dados (não transferência)

A cópia (não "transfer ownership") traz tudo para um Supabase novo na conta do Marco, deixando o Lovable intacto como rede de segurança. Operação detalhada em [`migration-runbook.md`](migration-runbook.md).

**Separação de ouro:**
- **Schema** entra **cedo**, reconstruído a partir de `supabase/migrations` (DDL, RLS, triggers, functions). Não depende de acesso ao Lovable.
- **Dados + usuários + storage** entram **só no cutover** (janela de manutenção), via `scripts/export-supabase.sh` + `import-supabase.sh` + `sync-storage.sh`.

**🔴 Regra inquebrável (vínculo usuário↔conteúdo):** a cópia preserva os **mesmos UUIDs** de `auth.users` **e** a tabela `auth.identities` (vínculo do Google). Conteúdo liga-se ao usuário por `user_id` (UUID); preservando UUIDs, nada é desvinculado e nenhuma senha precisa reset. **Nunca** usar o caminho de CSV manual da Lovable (gera UUIDs novos → quebra tudo).

---

## 2. Stack-alvo (validada via Context7)

| Camada | Decisão |
|---|---|
| Framework | **Next.js 16 (App Router)**, TypeScript strict, `output: 'standalone'` (viabiliza Hostinger Node) |
| UI | Tailwind 3 + shadcn/ui (re-init p/ Next) + framer-motion; tokens HSL light+dark portados verbatim |
| Fontes | `next/font` — Space Grotesk (display) + Inter (sans) |
| Auth | **`@supabase/ssr`** — browser client, server client (`cookies()`), middleware com `getClaims()`; login/signup via **server actions** |
| Dados | RSC + `fetch`/Supabase server client; ISR (`generateStaticParams` + `revalidate`) nos posts; `revalidateTag` em mutations; TanStack Query só onde há interação client-heavy |
| Backend | Supabase próprio (Free p/ dev, **Pro** em produção); Edge Functions Deno como estão |
| SEO | `generateMetadata`, sitemap/RSS/OG nativos do Next (aposenta o worker de SEO) |

---

## 3. Faseamento (8 fases × 5 sub-fases)

Cada sub-fase tem **critério de saída**. Nada avança sem o anterior pronto e validado localmente.

### ⛔ Fase 00 — Spikes de viabilidade (GO/NO-GO antes de qualquer código)
> Adicionada após o multi-agent review (§7). Os três revisores convergiram: as 4 maiores incógnitas estavam sendo adiadas para depois de meses de reescrita. Estes spikes são **baratos, rápidos e podem abortar/replanejar o projeto cedo**. Nenhuma linha de Next.js antes de fechar os 4.
- **00.1 — Auth/senha (mata o projeto se falhar):** rodar **hoje** `pg_dump` do schema `auth` via a connection string do Lovable. Provar que (a) dá para **ler `auth.users.encrypted_password` e `auth.identities`** com o role disponível, e (b) o hash é **bcrypt GoTrue padrão** (não formato proprietário do `@lovable.dev/cloud-auth-js`). Testar import + login (email/senha **e Google**, incluindo **usuário com identidade dupla**) num Supabase descartável. **NO-GO ⇒ replanejar auth antes de tudo.**
- **00.2 — Acesso a credenciais (gate de replanejamento):** confirmar se a **connection string `Direct` + `service_role`** são obteníveis **sem** transfer ownership. **Se exigir transfer ⇒ PAUSA e decisão explícita do Marco** (não seguir em silêncio): aceitar perder a origem intacta como rede de segurança (D6 vira D6-transfer) ou buscar alternativa. Também confirmar aqui que o `client_id/secret` do Google são acessíveis e idênticos (D9).
- **00.3 — ~~Runtime Hostinger~~ → RESOLVIDO por decisão (VPS "A"):** o gate de NO-GO foi eliminado pela escolha pela VPS "A". Resta apenas **checklist de spec da VPS** antes do scaffold: RAM dedicada ≥ 2 GB, vCPU ≥ 2, Ubuntu LTS, Node 22 instalado, SSH + firewall + PM2/systemd, certificado SSL (Hostinger ou Let's Encrypt). Sem teste de viabilidade — VPS roda Node persistente nativamente.
- **00.4 — Ensaio de cutover cronometrado:** ensaio **completo** `export → import → sync-storage` com **volume real** (DB 231 MB + Storage 408 MB) e **executar o rollback do runbook §8 de verdade**. Cronometrar a janela real (provavelmente dezenas de min, não os "≈5 min" do runbook). Ajustar a comunicação da janela ao tempo medido.
- **00.5 — Decisão GO/NO-GO documentada:** consolidar resultados dos 4 spikes; reclassificar no Decision Log o que é **POC validado** vs **aposta**. Só com GO segue para a Fase 0.

### Fase 0 — Fundação & arquitetura (local, sem tocar produção)
- **0.1 Scaffold:** Next.js 16 (App Router, TS strict, `output: 'standalone'`), estrutura feature-first, ESLint/Prettier.
- **0.2 Design system portado:** tokens HSL (light+dark), `next/font` (Space Grotesk + Inter), `tailwind.config`, `globals.css`, shadcn re-init.
- **0.3 Camada Supabase:** `@supabase/ssr` (browser/server/middleware com `getClaims`) + util service-role; envs `NEXT_PUBLIC_*`.
- **0.4 Qualidade & convenções:** branch strategy, commit template, pre-commit hooks (inclui regra `no-alert`), tsconfig strict, Vitest/Playwright base.
- **0.5 App shell local:** layout raiz dark, providers, página placeholder com a identidade rodando 100% local.
- **Saída:** app vazio rodando local com identidade visual e camada de auth prontos.

### Fase 1 — Schema-first (clonar o backend, sem dados)
- **1.1** Criar Supabase novo (Free) + Supabase CLI local.
- **1.2** Reconstruir schema a partir de `supabase/migrations` (DDL, extensões).
- **1.3** Aplicar RLS, triggers e functions; recriar cron jobs e realtime publication.
- **1.4** Portar e deployar as ~26 Edge Functions; mapear secrets (valores repostos manualmente).
- **1.5** Seed com dados sintéticos para desenvolvimento.
- **Saída:** backend próprio com paridade de schema, zero dependência do Lovable.

### Fase 2 — Núcleo: Auth + shell + design aplicado
- **2.1** Substituir Lovable Cloud Auth → Supabase Auth (server actions login/signup, middleware).
- **2.2** **🔴 Dry-run de migração de senha + identities:** importar 2–3 usuários de teste do Lovable e logar (email/senha **e** Google). Validar UUID + `auth.identities` preservados.
- **2.3** Google OAuth: configurar provider no novo Supabase, adicionar nova callback URL no Google Cloud.
- **2.4** Layout/sidebar/tema/mobile nav + providers definitivos.
- **2.5** Onboarding tour (10 etapas) + criação de tenant no signup.
- **Saída:** login funciona ponta a ponta; risco nº 1 resolvido cedo.

### Fase 3 — Páginas públicas SSR/SSG (coração do SEO)
- **3.1** Blog plataforma (`/novidades`) + post individual com ISR e **mesmos slugs**.
- **3.2** Blog pessoal (`/m/:slug/blog`) + perfil público (`/m/:slug`) + notas públicas (`/n/:token`).
- **3.3** Dicionário (`/dicionario`) + landing/páginas de venda (checklist, curso, livro).
- **3.4** `generateMetadata`, sitemap, RSS, OG images dinâmicas, structured data; ping search engines.
- **3.5** Aposentar a lógica de SEO do Cloudflare Worker; **diff automatizado de HTML renderizado** (meta, OG, JSON-LD, canonical, `lastmod`) página-a-página produção×staging — não só paridade de URL. Auditar também **URLs geradas por usuários** (`/n/:token`, `/m/:slug`, links de NPS) que já circulam fora do nosso controle.
- **Saída:** SEO igual ou melhor (provado por diff), validável no staging. Antes: descobrir **quem serve HTML ao Googlebot hoje** (Worker com prerender vs SPA via JS-rendering) para prever o que o SSR muda.

### Fase 4 — App autenticado (o grosso, por módulo)
> **Classificação de escopo para o cutover (gate D17):**
> - **Inegociável-para-cutover** (precisa de paridade no corte): 4.1 Campanhas/Aventuras/Sessões · 4.2 Diário/TipTap · 4.3 Whiteboard · 4.4 Jogadores + Ferramentas de Mesa · e de 4.5: Notificações, Busca, Favoritos, Agenda, Painel Admin (operar a plataforma).
> - **Pós-cutover-aceitável** (pode subir como "em breve"/redirect ao legado): **Academia `/journey`** (conteúdo é horizonte de qualquer forma) e **Gestão Financeira** (ferramenta admin do dono, baixo risco ao usuário) e analytics admin avançado (cohort/infra).
> - **Checkpoint pós-4.2:** se o esforço para chegar à paridade do TipTap indicar que os módulos restantes não fecham em ritmo aceitável, **cortar o conjunto pós-cutover** e seguir ao cutover com o inegociável.
- **4.1** Campanhas + Aventuras + Sessões (CRUD, drag-and-drop, checklist, compartilhamento).
- **4.2** Diário do Mestre + editor TipTap (`dynamic(ssr:false)`; POC prévio de auto-save + presença realtime no modelo Server Actions + Supabase Realtime). Auto-save com **estado de "não salvo/sem conexão" honesto** + rascunho local antes de qualquer redirect de sessão.
- **4.3** Quadro de Ideias (whiteboard infinito, `ssr:false`, conectores, undo/redo).
- **4.4** Jogadores (CRM), Ferramentas de Mesa (dados, gerador d20, preparador IA, avaliação NPS).
- **4.5** Academia (`/journey`), Notificações push, Busca global, Favoritos, Agenda, Gestão Financeira, Painel Admin.
- **Saída:** paridade funcional completa **+ paridade de layout/posição dos controles-chave no mobile** (MobileNav, FAB do whiteboard, toolbar do editor, pull-to-refresh, haptics) — o mestre mobile-first não pode sentir "mudou tudo".

### Fase 5 — Motion & polish
- **5.1** Sistema de motion (tokens de duração/easing) alinhado à sobriedade "Gamer Premium".
- **5.2** Transições de página e de rota (App Router).
- **5.3** Micro-interações (botões, cards, toasts, bell, dados).
- **5.4** Scroll-reveal e o D20 com física na landing (`FloatingDice` repensado).
- **5.5** Atualizar `branding.md`/`design-system.md` com as guidelines de motion.
- **Saída:** o "uau" gráfico que falta, sem trair a identidade.

### Fase 6 — Hardening & pré-cutover
- **6.1** Auditoria de paridade de SEO (URLs, redirects, sitemap, OG, structured data) + diff de HTML (ver 3.5) + URLs de usuário.
- **6.2** Lighthouse + Web Vitals + acessibilidade (AA, toque 44px). **Definir onde a otimização de imagem ocorre** (`next/image` no processo Node vs Cloudflare Image Resizing/`unoptimized`) e projetar **egress** do Storage sob crawler (teto Pro 250 GB).
- **6.3** Segurança: **auditoria total de `pg_policies`** (toda tabela de tenant nega por padrão, não amostragem) + **plano de invalidação da anon key antiga no projeto Lovable** (não basta "nasce nova") + `.env` no histórico (filter-repo/BFG ou aceite formal) + **CORS travado** (público só sitemap/rss/og; IA/OCR/scraper/admin restritos a `nuckturp.com.br`) + **rate limiting** nas functions de IA/OCR + JWT obrigatório nas mutativas (`admin-users`, `billing`).
- **6.4** Teste de carga real → **valida a VPS "A"** (decisão já tomada em D3/ADR-0003; o plano Node "B" foi descartado). Definir **connection pooling Supavisor (porta 6543, transaction mode)** para qualquer conexão direta; documentar **topologia single-node** como restrição dura do ISR (multi-instância exige cache handler Redis). **Build sempre no CI** (nunca na VPS). Validar limites de **Realtime** do tier Pro.
- **6.5** Deploy no subdomínio de staging + QA funcional completo + **uptime monitor externo** apontando para `/api/health` (não há SRE on-call).
- **Saída:** candidato a produção validado.

### Fase 7 — Cutover (janela de manutenção)
> **Comunicação (pré-7.1):** e-mail **48h e 2h antes** + banner in-app com data/hora/duração (pt-BR/en), em horário de baixo uso (madrugada de dia útil, não fim de semana). Banner de freeze = **modo somente-leitura explícito** com botões de salvar/criar desabilitados (não deixar o usuário tentar e falhar).
- **7.1** Subir Supabase novo para **Pro** (backups ligados). **Backup verificado da ORIGEM** (Lovable) imediatamente antes do freeze, com checksum de contagem de linhas por tabela crítica (`auth.users`, posts, players).
- **7.2** Freeze writes no app velho (banner read-only + 503); dump final de dados (delta).
- **7.3** Import final (dados + usuários + storage) preservando **UUIDs + `auth.identities` + `email_confirmed_at`**. Em seguida: **snapshot manual (`pg_dump`) do DESTINO + restore test validado** antes do unfreeze (o backup automático do Pro ainda não rodou — não confiar nele).
- **7.4** Trocar secrets/OAuth/webhooks/cron/realtime/CDN (checklist do runbook §7); apontar DNS (TTL baixo 24h antes). **Invalidar o service worker do PWA** (skipWaiting/claim + versão) para clientes instalados buscarem o app novo.
- **7.5** **Smoke test com CONTA REAL MIGRADA** (não conta nova): login **Google + email/senha**, e confirmar que **campanhas, Diário, whiteboard, storage (capa/avatar/banner/imagens), status Premium/VIP e fluxo de verificação de e-mail** aparecem corretos. Pagamento Stripe de teste end-to-end com **webhook chegando na nova function**. Checar **realtime publication** (presença + sino atualizam). **Critério go/no-go objetivo** dispara o rollback (runbook §8) → unfreeze → monitorar.
- **Saída:** no ar, dados frescos, usuários intactos, **experiência da conta migrada validada**. Rollback já ensaiado na 00.4.

### Fase 8 — Pós-cutover
- **8.1** Monitorar Search Console (indexação, posições) ~2 semanas.
- **8.2** Monitorar erros (logs/observabilidade) e Web Vitals reais.
- **8.3** Validar e-mails comportamentais, push, Stripe webhooks, cron jobs.
- **8.4** Ajustes finos de performance/SEO conforme dados reais.
- **8.5** **Descomissionar o Lovable** só após janela de segurança estável.
- **Saída:** migração encerrada; Lovable desligado.

---

## 4. Decision Log

| # | Decisão | Alternativas consideradas | Por quê |
|---|---|---|---|
| D1 | Drivers = independência (A) + SEO (C) | Custo (B) | Custo do Lovable não dói; a "prisão" sim |
| D2 | Reescrita idiomática completa em Next.js | Lift-and-shift; híbrido faseado | Quer base limpa, melhor design e arquitetura; sem prazo |
| D3 | **VPS Hostinger "A"** com `output: 'standalone'` (decisão do Marco em 2026-05-22) | Plano Node "B" compartilhado | Elimina riscos 🔴 do Constraint Guardian: processo persistente garantido, RAM dedicada, ISR cache em disco persistente, PM2/systemd sem amarras. Custa um pouco mais; em troca, runtime confiável e fim da incerteza pré-código |
| D4 | **Manter `nuckturp.com.br`**; descartar qgdomestre.com.br | Trocar domínio + 301 | Evita migração de domínio em cima de troca de plataforma (risco somado) |
| D5 | Cutover por janela de manutenção curta | Zero-downtime contínuo | 134 MAU, app de mesa; tooling não foi feito p/ delta zero-downtime |
| D6 | **Copiar** dados (não transferir) | Transfer ownership | Lovable fica como rede de segurança; transfer era só p/ destravar credencial |
| D7 | Schema cedo (via migrations), dados no cutover | Copiar tudo de uma vez no início | Dado "envelhece" entre cópia e corte; separar elimina o problema |
| D8 | Preservar UUIDs + `auth.identities` | CSV manual da Lovable | Único caminho que não desvincula usuário↔conteúdo nem força reset de senha |
| D9 | Reusar Google client_id/secret + nova callback URL | Criar credencial Google nova | Mantém identidade Google dos usuários; só adiciona redirect URI |
| D10 | Edge Functions ficam Deno no Supabase | Virar route handlers Next | Minimiza reescrita; refatoração oportunista |
| D11 | Supabase Free p/ dev, **Pro** em produção | Free em produção | Free não tem backup automático e tem egress 5 GB; contradiz "posse dos dados" |
| D12 | `@supabase/ssr` + middleware `getClaims()` | auth-helpers (legado) | Padrão atual; cookie-based session em todo o App Router |
| D13 | Licença **proprietária** (All Rights Reserved) | OSS (MIT/Apache/GPL) | Produto comercial fechado; código deve continuar privado |
| D14 | Suíte de docs: dirigem-construção primeiro, descrevem-built depois | Escrever tudo já | Evita documentar vaporware; mantém docs próximas ao código |
| D15 | **Fase 00 — spikes de viabilidade antes de qualquer código** | Validar auth/Hostinger/cutover só nas Fases 2/6/7 | Multi-agent review: as 4 maiores incógnitas estavam adiadas para o ponto de maior custo |
| D16 | **Feature-freeze do app Lovable** durante a reescrita. "Crítico" = só **segurança, perda de dados, pagamento ou auth quebrados**. Registrado em `FREEZE.md` no repo antigo; **toda** entrada obriga re-port explícito ao Next (item no TODO). | Lovable seguir evoluindo livremente | Senão a paridade vira alvo móvel; enforcement torna o freeze auditável (Skeptic #3 / Arbiter) |
| D17 | **Critério objetivo de corte de escopo** (ver classificação na Fase 4): checkpoint **após a 4.2**; se os módulos restantes não estiverem track, corta-se o conjunto **pós-cutover-aceitável** para "em breve"/redirect ao legado e segue-se ao cutover com o conjunto **inegociável**. Decisor: Marco. | Tudo-ou-nada | Reescrita de 445 arquivos sem prazo precisa de gate de corte decidível (Skeptic #3 / Arbiter) |
| D18 | SEO validado por **diff de HTML** (meta/OG/JSON-LD/canonical), não só slug | Confiar em "mesmos slugs" | Troca de servidor/markup muda o que o Google vê (Skeptic #5) |
| D19 | TipTap/whiteboard como `dynamic(ssr:false)` + POC de realtime | "SSR + client" genérico | Componentes client-only quebram em SSR/hydration (Skeptic #6) |
| D20 | **Supavisor (6543) + topologia single-node** documentada para ISR | Conexão direta; ISR sem ressalva | Esgotamento de conexões e cache ISR não-compartilhável (Constraint #3/#4) |
| D21 | **Invalidar anon key antiga no Lovable** + auditoria total de `pg_policies` | "Novo projeto nasce com chave nova" | Chave antiga segue válida pós-cutover; RLS imperfeita = vazamento (Constraint #7) |
| D22 | **CORS travado + rate limiting** nas Edge Functions migradas | Migrar "como estão" com CORS `*` | Custo de IA descontrolado + DoS (Constraint #8) |
| D23 | **Smoke test com conta real migrada** + snapshot/restore test do destino antes do unfreeze | Smoke test com conta nova; confiar no backup Pro | O medo do usuário ("loguei e sumiu tudo") só é exercido com conta migrada (User Advocate) |
| D24 | **Plano de comunicação da janela** (e-mail 48h/2h + banner read-only) + invalidação do SW do PWA | Banner só durante o freeze | Sem aviso prévio o usuário entra em pânico; PWA serve bundle velho (User Advocate #1/#8) |

---

## 5. Riscos e mitigações

Ver [`PRD.md`](PRD.md) §8. Destaques operacionais:
- **Senha/UUID (🔴):** dry-run na Fase 2.2 antes de qualquer compromisso de cutover.
- **OAuth Google (🟠):** callback dupla por 24h; testar login Google no staging.
- **SEO (🟠):** congelar slugs; comparar sitemap antigo×novo; monitorar Search Console pós-corte.
- **VPS "A" (🟡):** teste de carga na 6.4 valida a VPS já decidida (D3/ADR-0003); plano Node "B" descartado.

---

## 6. Próximo passo recomendado

Stress-test concluído (§7). Próximo passo concreto: **executar a Fase 00 (spikes de viabilidade)** antes de qualquer código.

## 7. Resultados do Multi-Agent Review (2026-05-22)

Stress-test estruturado com 3 revisores de mandato travado (Skeptic, Constraint Guardian, User Advocate) + 2 rodadas de arbitragem. **Disposição final: ✅ APPROVED** (1ª arbitragem deu REVISE por 2 itens bloqueantes — D16 sem enforcement e D17 sem critério objetivo — corrigidos e re-arbitrados). O design exigiu correção de **sequenciamento de risco** (Fase 00) e novos gates.

**Padrão de fundo (convergência dos 3):** o plano adiava as 4 maiores incógnitas (hash de senha, acesso a credenciais, runtime Hostinger, tempo de cutover) para depois da reescrita. **Corrigido com a Fase 00.**

| # | Objeção | Sev. | Disposição |
|---|---|:---:|---|
| Auth hash pode ser impossível / wrapper Lovable | 🔴 | **Aceita** → Spike 00.1 (NO-GO aborta) |
| Acesso a credenciais contraditório (connection string vs transfer) | 🔴 | **Aceita** → Spike 00.2 |
| Escopo de 445 arquivos sem corte | 🔴 | **Aceita** → D16 (freeze) + D17 (corte) |
| Runtime Hostinger incompatível com ISR/processo persistente | 🔴 | **Aceita** → Spike 00.3 (decide VPS cedo) |
| SEO além de slugs (diff de HTML) | 🟠 | **Aceita** → D18 / Fase 3.5 |
| TipTap/whiteboard SSR/hydration | 🟠 | **Aceita** → D19 / Fase 4.2-4.3 |
| Cutover sem números + rollback não-ensaiado | 🟠 | **Aceita** → Spike 00.4 |
| Realtime/cron/Stripe falham em silêncio | 🟠 | **Aceita** → Fase 7.5 (smoke estendido) |
| Anon key vazada atravessa o cutover | 🔴 | **Aceita** → D21 / Fase 6.3 |
| Pooling Postgres + ISR single-node | 🔴 | **Aceita** → D20 / Fase 6.4 |
| Egress / otimização de imagem | 🟠 | **Aceita** → Fase 6.2 |
| Build standalone em ambiente restrito | 🟠 | **Aceita** → "build sempre no CI" (Fase 6.4) |
| CORS `*` + rate limiting nas edge | 🟠 | **Aceita** → D22 / Fase 6.3 |
| Backup do destino antes do unfreeze | 🔴 | **Aceita** → Fase 7.3 |
| Smoke test só com conta nova | 🟠 | **Aceita** → D23 / Fase 7.5 |
| Sem aviso da janela + PWA cache velho | 🔴 | **Aceita** → D24 / Fase 7 |
| Google OAuth: conta dupla / callback | 🟠 | **Aceita** → Spike 00.1 (testa identidade dupla) |
| Verificação de e-mail / Premium-VIP / storage quebrado | 🟠 | **Aceita** → Fase 7.5 (validação de conta real) |
| "Validado via Context7" ≠ integração testada | 🟡 | **Aceita** → Spike 00.5 (POC vs aposta) |
| Callback Google byte-idêntica (D9) | 🟡 | **Aceita** → Spike 00.2 |

Nenhuma objeção **rejeitada**; todas viraram spike, decisão ou gate de fase.

---

*Documento vivo. Atualizar o Decision Log a cada decisão e o status das fases conforme avançam.*
