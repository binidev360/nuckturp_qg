# PRD — QG do Mestre (Nuckturp)

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

> **Product Requirements Document**
> **Produto:** QG do Mestre · **Marca:** Nuckturp · **Domínio:** `nuckturp.com.br`
> **Status:** Ativo (em produção no Lovable Cloud) → migração para Next.js + Supabase próprio
> **Versão do documento:** 1.0 · **Data:** 2026-05-22 · **Autor:** Marco Bini
> **Licença:** Proprietária — Copyright © 2026 Marco Bini. Todos os direitos reservados.

---

## 1. Visão geral

O **QG do Mestre** é o hub definitivo para **mestres de RPG** organizarem campanhas, documentarem sessões, criarem mundos e evoluírem como narradores — tudo em um só lugar, gratuito e sem limites de uso nas ferramentas core.

É uma plataforma **exclusiva para narradores** (não para jogadores): toda a seção "Jogadores" é um **CRM interno** do mestre sobre seus jogadores e personagens.

- **Idiomas:** pt-BR (padrão) + en
- **PWA:** instalável em mobile e desktop, mobile-first
- **Multi-tenant:** 1 mestre = 1 tenant, isolamento rigoroso de dados
- **IA:** Google Gemini (via "Nuckturp AI") para geração de aventuras e preparação de sessões

### Por que existe (problema)
Mestres de RPG hoje espalham sua preparação por dezenas de ferramentas genéricas (docs, planilhas, anotações soltas, VTTs). Falta um lugar **especializado no ofício de mestrar** — método, organização e produtividade — que funcione bem no celular durante a preparação e na mesa.

### Para quem (personas)
1. **Mestre iniciante** — busca organização e método para começar.
2. **Mestre intermediário** — quer centralizar ferramentas dispersas.
3. **Mestre experiente/profissional** — precisa de produtividade avançada.
4. **Jogador que assume a cadeira de mestre** — entrada natural para o produto.

---

## 2. Objetivos e não-objetivos

### Objetivos do produto
- Ser a ferramenta de produtividade #1 do mestre de RPG no Brasil.
- Adoção orgânica via **produto Free excelente** + SEO de conteúdo (blog/dicionário D&D 5e e afins).
- Monetização sustentável via **Premium (conteúdo + IA)** quando houver massa crítica.

### Objetivos desta fase (migração)
- **Independência total** do Lovable (fim do lock-in) — driver A.
- **SEO real** via SSR/SSG no Next.js (hoje é SPA Vite) — driver C.
- **Posse dos dados** em Supabase próprio, com backups.
- **Paridade funcional** com a versão atual + melhorias de design/arquitetura/motion.

### Não-objetivos (explícitos)
- ❌ Trocar de domínio ou rebrand de URL (mantém `nuckturp.com.br`).
- ❌ Abrir o produto para jogadores nesta fase.
- ❌ Produzir o conteúdo educativo da Academia agora (estrutura existe, conteúdo é horizonte).
- ❌ Zero-downtime sofisticado no cutover (janela de manutenção curta é aceitável).
- ❌ Reescrever as Edge Functions para outra tecnologia (continuam Deno no Supabase).

---

## 3. Modelo de negócio

| Aspecto | Detalhe |
|---|---|
| **Modelo** | Freemium |
| **Free** | 100% das ferramentas de produtividade, sem limite de quantidade; 100 MB de storage |
| **Premium** | R$ 29/mês via **Stripe** — Academia completa, IA ilimitada, 4 GB storage, acesso antecipado |
| **VIP (Premium Gratuito)** | Concedido manualmente pelo admin (`premium_overrides`), com ou sem prazo |
| **Produtos avulsos** | Curso de Worldbuilding (R$ 97, Hotmart) · Livro do Mestre (Hotmart + Amazon) · Checklist (lead magnet) |

**Filosofia:** "Todas as ferramentas são gratuitas e ilimitadas. O Premium existe para quem quer ir além com conteúdo exclusivo." Cobrança Premium só é ativada quando a Academia tiver conteúdo substancial.

---

## 4. Escopo funcional (paridade obrigatória na reescrita)

Cada bloco abaixo deve ter **paridade funcional** na versão Next.js. Detalhe completo em [`FEATURES.md`](FEATURES.md) e [`plataforma-negocio.md`](plataforma-negocio.md).

### 4.1 Autenticação & Perfil
- Login **e-mail/senha** ou **Google OAuth**; verificação de e-mail obrigatória.
- Criação automática de tenant no signup.
- Perfil: avatar (crop), banner (reposicionável), bio, apelido, pronome, redes sociais (reordenáveis), links MesaQuest/WorldCraft, até 3 Instagram + 2 YouTube.
- URL pública `/m/:slug`; perfil público acessível por qualquer pessoa.
- Tour guiado de onboarding (10 etapas).

### 4.2 Campanhas, Aventuras & Sessões
- CRUD de campanhas (capa, sistema, cenário, status, one-shot, cor, links externos, `arc_summary`).
- Aventuras vinculadas (drag-and-drop).
- Sessões com checklist pré/pós (método Mestre Metódico), duração estimada/real, status.
- Compartilhamento por e-mail com permissões granulares.

### 4.3 Jogadores (CRM do Mestre)
- `players` + `player_campaigns`; fichas em abas (Informações, Inventário, Relações, Anotações, Presença).
- Preferências de segurança (Gore/PvP/Mortalidade 1–10, gatilhos); NPCs sincronizados; presença por sessão.

### 4.4 Diário do Mestre
- Editor Notion-style (**TipTap**): formatação completa, tabelas, imagens, YouTube, menções, regra de paste (remove cor inline).
- Pastas em árvore (drag-and-drop, breadcrumbs); tipos, tags, status, pin, vinculação.
- Compartilhamento com presença em tempo real; notas públicas `/n/:token`; export PDF; templates Nuckturp.

### 4.5 Quadro de Ideias (Whiteboard infinito)
- Canvas pan/zoom/dot-grid, sticky notes, formas, conectores (reto/curvo/90°), imagens, frames, rich text, duplicação, minimap, undo/redo, atalhos, tags, vinculação.

### 4.6 Ferramentas de Mesa
- **Rolador de dados** (d4–d20, animação, histórico, inline no editor).
- **Gerador de Aventuras d20** (tabelas Nuckturp + IA + check de sistema).
- **Preparador de Sessões** (IA contextual; modo Revisão Rápida; limite diário no Free).
- **Avaliação de Mestre** (NPS, link compartilhável, template WhatsApp, push, ranking ponderado).

### 4.7 Blog & SEO (crítico — driver C)
- Blog da plataforma (`/novidades`) + blog pessoal (`/m/:slug/blog`) + dicionário (`/dicionario`).
- Editor com validação de slug em tempo real, auto-save, tempo de leitura, capa obrigatória, checklist SEO (7 critérios).
- **Especialista SEO (IA)**: score 0–100, histórico, cache por hash, inline editing.
- Importação WordPress; sitemap; RSS; OG images dinâmicas; ping a search engines.

### 4.8 Academia de Mestres
- Vitrine `/journey` com navegação por `destination_type` (book/course/external/tool); flag `launched`; "Continue onde parou"; tracking de progresso. **Conteúdo educativo é horizonte.**

### 4.9 Suporte
- Notificações push (segmentação, condicionais, bell + áudio).
- Busca global (Ctrl/Cmd+K). Favoritos. Agenda.

### 4.10 Painel Administrativo
- KPIs (Health Score, crescimento, engajamento, uso de IA, cohort, adoção).
- Infra (cache ratio, DB size, conexões, top tables, vacuum, snapshots 90d).
- Usuários (CRUD, tags, reset senha, premium override).
- Financeiro (Stripe MRR/assinaturas/balanço; ferramenta `/tools/finance`).
- Blog admin, notificações admin, dashboard de feedback (NPS, ranking).

---

## 5. Requisitos não-funcionais

| Categoria | Requisito |
|---|---|
| **Performance** | SSR/SSG nas páginas públicas; LCP < 2.5s mobile; Lighthouse SEO ≥ 95 |
| **SEO** | URLs/slugs **idênticos** aos atuais; sitemap, RSS, OG, structured data preservados |
| **Escala** | ~134 MAU hoje; projetar para milhares sem rearquitetura |
| **Disponibilidade** | App de preparação; janela de manutenção curta aceitável; sem SLA rígido |
| **Segurança** | RLS em todas as tabelas multi-tenant; secrets fora do bundle; rotação da anon key pendente; sem `window.alert/confirm/prompt` (regra `no-alert`) |
| **Privacidade** | Dados de mestres/jogadores isolados por tenant; LGPD-aware |
| **Backups** | Supabase Pro (retenção 7d) em produção |
| **Acessibilidade** | Áreas de toque ≥ 44px; foco visível; contraste AA no dark theme |
| **i18n** | pt-BR + en, detecção automática |
| **Manutenção** | Código próprio, versionado, documentado (esta suíte de docs) |

---

## 6. Métricas de sucesso

- **Migração:** zero perda de dados; zero reset de senha forçado; SEO sem queda > 10% em 30 dias (Search Console); paridade funcional 100%.
- **Produto:** crescimento de MAU 7d/30d; taxa de onboarding; engagement score; uso de IA; conversão Free→Premium (quando ativado); NPS global.

---

## 7. Restrições e dependências

- **Hospedagem:** **VPS Hostinger "A"** (decisão tomada — D3/ADR-0003, 2026-05-22), via Next.js `output: 'standalone'`; o plano Node "B" compartilhado foi descartado.
- **Backend:** Supabase próprio (Free para dev, Pro em produção).
- **Integrações externas:** Stripe, Hotmart, Google (OAuth, GA4, GTM, Ads, Search Console), Resend/e-mail, VAPID (push), Gemini.
- **CDN:** Cloudflare (DNS/CDN; lógica de SEO do worker migra para o Next).

---

## 8. Riscos principais

| Risco | Severidade | Mitigação |
|---|:---:|---|
| Migração de senha desvincular usuários | 🔴 Alta | Cópia preservando UUIDs + `auth.identities`; **dry-run cedo** (Fase 2) |
| Google OAuth quebrar no novo Supabase | 🟠 Média | Reusar client_id/secret; adicionar nova callback URL mantendo a antiga 24h |
| Queda de SEO na troca de plataforma | 🟠 Média | Mesmos slugs/paths; paridade de sitemap/OG/structured data; monitorar Search Console |
| VPS "A" não aguentar SSR | 🟡 Baixa | Teste de carga na Fase 6 valida a VPS já decidida (D3/ADR-0003); checklist de spec ≥ 2 GB RAM / ≥ 2 vCPU no spike 00.3 |
| Escopo grande (445 arquivos) | 🟠 Média | Faseamento 8×5 slow-and-steady; paridade por módulo |

---

## 9. Roadmap de alto nível

Execução detalhada em [`MIGRACAO-NEXTJS.md`](MIGRACAO-NEXTJS.md): 8 fases × 5 sub-fases, do scaffold ao cutover, 100% local até o corte. Pós-paridade, retomar o backlog de produto (Academia, geradores, social) descrito em `plataforma-negocio.md` §9.

---

*Documento vivo. Atualizar a cada mudança de comportamento do produto, em code review.*
