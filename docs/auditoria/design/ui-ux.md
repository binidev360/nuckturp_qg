# Auditoria de UI/UX/Acessibilidade — QG do Mestre (Nuckturp)

> **Escopo:** diagnóstico premium de navegação/IA, acessibilidade AA, padrões de UX e densidade mobile, para guiar a reescrita Next.js. Produto **mobile-first** (mestres usam na mesa, no celular), **dark-first**.
>
> **Lente aplicada:** UI/UX sênior (skill `ui-ux-pro-max`) — prioridades em ordem: Acessibilidade > Toque/Interação > Performance > Layout/Responsivo > Tipografia/Cor > Animação.
>
> **Fontes de evidência:**
>
> - Código antigo (READ-ONLY): `AppLayout.tsx`, `AppSidebar.tsx`, `MobileNav.tsx`, `GlobalSearch.tsx`, `ThemeToggle.tsx` em `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp\src\components\`.
> - Inventários: `docs/inventario/{modulos.md, ui-componentes.md, rotas-slugs.md}`.
> - Artefatos designlang: `docs/inventario/designlang/design-extract-output/` (`-design-language.md`, `-intent.json`, `-form-states.json`, `-icon-system.json`, `screenshots/`).
>
> **⚠️ Limite de cobertura da evidência designlang:** a extração designlang capturou **apenas a landing page pública** (`/`) — 615 elementos, page intent `landing`. Os screenshots responsivos (`mobile-dark.png`, `desktop-dark.png`) são **da LP de marketing**, não do app autenticado. Portanto: o WCAG 100% e o score 91/100 do designlang valem para a **vitrine**, não para o produto interno (dashboard, diário, whiteboard, admin). O diagnóstico do app real abaixo é fundamentado no **código** dos componentes de navegação e nos inventários de módulos/UI. Quando uma afirmação vale só para a LP, está marcada **[LP]**; quando vale para o app autenticado, **[APP]**.

---

## 0. Sumário executivo

O QG do Mestre tem uma **base de design system madura e disciplinada** (tokens HSL consistentes, escala de espaçamento limpa, raio único, ícones `lucide-react` uniformes, paleta cyber-lime/vapor-violet sobre noir-void com forte identidade). A landing pontua A no designlang. O risco de UX **não está na estética** — está em três frentes do **app autenticado mobile-first**, que é onde os mestres realmente operam:

1. **Navegação mobile sub-ótima para o contexto de uso.** O mobile usa um **top bar + menu dropdown** que **some no scroll-down** e exige 2 toques (abrir menu → escolher destino) para qualquer troca de seção. Para um produto usado **na mesa, com o celular numa mão, no meio de uma sessão**, isso é fricção real. Um app com 9 destinos primários de uso frequente pede **bottom navigation** (alcance do polegar) ou tab bar persistente, não menu escondido. Agrava: `AppLayout` reserva `pb-16` (64px) no rodapé como se houvesse bottom-nav, mas **não há** — é espaço morto no mobile.

2. **Alvos de toque abaixo de 44px e lacunas de acessibilidade.** Os controles do header mobile (hambúrguer, busca, sino) são `w-9 h-9` = **36px** (regra `touch-target-size` exige ≥44px). Triggers de ícone (`GlobalSearch`, `NotificationBell`, hambúrguer) **sem `aria-label`/`aria-expanded`**. Variantes de cor `muted-foreground/40` e `/60`, usadas amplamente, **falham contraste AA** no dark.

3. **Estados de UX não-padronizados e dois sistemas de toast coexistindo.** `sonner` + `toast/toaster/use-toast` rodam em paralelo (inventário UI seção b/e). Vazio/erro/loading não têm um padrão único; o único empty/loading capturado foi `skeleton-loading` [LP].

A reescrita Next é a **janela certa** para corrigir os três sem regressão de marca: portar tokens verbatim, mas **repensar a casca de navegação mobile e padronizar estados**.

---

## 1. Navegação e Arquitetura de Informação

### 1.1 Estrutura atual (do código)

Tanto `AppSidebar` (desktop) quanto `MobileTopBar` (mobile) compartilham o **mesmo `navItems`** (boa consistência de IA):

| Ordem | Item             | Rota          | Ícone (lucide)    |
| ----- | ---------------- | ------------- | ----------------- |
| 1     | Dashboard        | `/dashboard`  | `LayoutDashboard` |
| 2     | Agenda           | `/agenda`     | `CalendarDays`    |
| 3     | Campanhas        | `/campaigns`  | `Swords`          |
| 4     | Jogadores        | `/players`    | `Users`           |
| 5     | Diário           | `/diary`      | `BookOpen`        |
| 6     | Quadro de Ideias | `/whiteboard` | `PenTool`         |
| 7     | Academia         | `/journey`    | `GraduationCap`   |
| 8     | Ferramentas      | `/tools`      | `Wrench`          |
| 9     | Perfil           | `/profile`    | `User`            |

Mais, condicionalmente: **Meu Blog** (`/author-blog`, se autor), **Novidades** (`/novidades`, com badge de novo post), e no rodapé **Admin** (`/admin`, se `isAdmin`) **ou** **Premium** (`/plans`), **Tema**, **Sair**, **Colapsar** (só desktop).

**Total: 9 destinos primários + 2–4 secundários.** Isso é muito para uma navegação rasa de um nível, e demais para um bottom-nav clássico (que comporta 4–5). Pede **agrupamento/IA em 2 níveis** no mobile.

### 1.2 Desktop — `AppSidebar` (avaliação)

**Pontos fortes:**

- Sidebar `sticky top-0 h-screen`, colapsável (`w-64` ↔ `w-16`), com persistência em `localStorage` (`sidebar-collapsed`). Bom para telas densas.
- Estado ativo claro: `bg-primary/10 text-primary border-glow-lime` — affordance forte e on-brand.
- `GlobalSearch` (cmdk, atalho ⌘K/Ctrl+K) + `NotificationBell` no topo; `SidebarStorageIndicator` antes do rodapé (transparência de quota — bom).

**Gaps:**

- **Estado ativo desktop usa só `location.pathname === item.path` (match exato)**, enquanto o mobile usa `startsWith(item.path + "/")`. Resultado: em `/campaigns/:id` ou `/diary/...`, a sidebar desktop **não destaca o item pai**, mas o mobile destaca. Inconsistência de IA — corrigir no port unificando para `startsWith`.
- **No estado colapsado, os itens não têm `title`/tooltip nem `aria-label`** — ícones sem rótulo acessível. Quem usa colapsado (a maioria, por persistência) navega por adivinhação e leitor de tela não anuncia o destino.
- Botão "Colapsar" fica **no fim de uma lista longa de ações** (Admin/Premium → Sair → Tema → Colapsar). "Sair" e "Tema" entre navegação e o toggle de layout é hierarquia confusa.

### 1.3 Mobile — `MobileTopBar` (avaliação — ponto crítico)

**Como funciona hoje:**

- Header fixo `h-14` (56px) no topo, com logo + breadcrumb da página atual, e à direita: busca, sino, hambúrguer.
- Toda a navegação vive num **dropdown** que expande abaixo do header (`max-h-[80vh]`, scroll interno).
- O header **esconde no scroll-down** (`-translate-y-full`) e reaparece no scroll-up; ao esconder, **fecha o menu**.

**Problemas para o contexto mobile-first (mestre na mesa):**

1. **Navegação escondida + 2 toques.** Trocar de seção exige: tocar hambúrguer → esperar animação 300ms → tocar destino. Em uso ativo (consultar Diário, depois Agenda, depois Jogadores no meio da sessão), isso multiplica fricção. **Bottom-nav daria 1 toque** e ficaria na zona de alcance do polegar.
2. **Header some no scroll.** Padrão de "leitura imersiva" (blog/feed), **errado para um app de tarefas**: o usuário rola uma lista de campanhas/sessões, perde a navegação, e precisa rolar de volta para cima para trocar de seção. Conflita com o gesto natural de scroll na mesa.
3. **Alcance do polegar invertido.** Todos os controles de navegação ficam **no topo** (zona mais difícil de alcançar com uma mão no celular). Mobile-first sério coloca ações primárias na **base**.
4. **`pb-16` morto.** `AppLayout` aplica `pb-16 md:pb-12` ao `<main>`, reservando 64px no rodapé mobile — coerente com um bottom-nav que **não existe**. Hoje é padding fantasma; é também a "vaga" perfeita para o bottom-nav recomendado.
5. **Whiteboard fora do `AppLayout`** (tela cheia, só `ProtectedRoute`) — correto, mas significa que a casca de navegação nova precisa de uma estratégia de "voltar/sair" própria nessa tela (hoje depende do que o `WhiteboardToolbar` oferecer).

**Pontos fortes do mobile atual:** breadcrumb contextual no header (mostra a página atual), badge de novidades, overlay de fechar ao tocar fora, fecha menu na troca de rota. A intenção está certa; o **padrão de container** é que não serve ao contexto.

### 1.4 Recomendação de IA para a nova versão

- **Adotar bottom navigation persistente no mobile** com **5 slots**: as 4–5 jornadas mais frequentes + um slot **"Mais"** que abre o restante (sheet/drawer). Candidatos a slot fixo (validar com analytics de uso real do admin): **Dashboard, Campanhas, Diário, Agenda** + **Mais**. Whiteboard, Academia, Ferramentas, Jogadores, Perfil, Novidades, Premium/Admin entram no "Mais".
- **Não esconder a navegação no scroll.** Bottom-nav fixa; se necessário esconder algo no scroll, esconder só o **header/breadcrumb**, nunca a navegação.
- **Unificar o match de rota ativa** (`startsWith`) entre desktop e mobile.
- **Manter `GlobalSearch` (⌘K)** como acelerador transversal — é excelente IA secundária. No mobile, expor a busca também no bottom-nav ou como ação primária do header.
- **Sidebar desktop colapsada:** adicionar `title` + `aria-label` por item e `aria-current="page"` no ativo.

---

## 2. Acessibilidade (alvo AA) — gaps

### 2.1 Contraste no dark (cálculo WCAG sobre os tokens reais)

Tokens do código (dark): `--background 0 0% 10%` (≈#1A1A1A), `--card 0 0% 12%` (≈#1F1F1F), `--foreground 80 100% 95%` (≈#F7FFE6), `--muted-foreground 0 0% 55%` (≈#8C8C8C), `--primary 82 100% 65%` (≈#C4FF4D).

| Par                                                                      | Razão      | AA texto normal (4.5:1) | AA texto grande/UI (3:1)        | Veredito                                                                      |
| ------------------------------------------------------------------------ | ---------- | ----------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `foreground` sobre `background`                                          | **16.9:1** | ✅                      | ✅                              | AAA — corpo de texto excelente                                                |
| `primary` (lime) sobre `background`                                      | **14.7:1** | ✅                      | ✅                              | AAA                                                                           |
| `muted-foreground` sobre `background`                                    | **5.2:1**  | ✅ (limítrofe)          | ✅                              | passa, mas sem folga                                                          |
| `muted-foreground` sobre `card` (#1F1F1F)                                | **4.9:1**  | ✅ (limítrofe)          | ✅                              | passa apertado                                                                |
| **`muted-foreground/60`** sobre `background`                             | ≈**3.0:1** | ❌                      | ✅ só se for ≥18.66px/14px-bold | **falha** para texto normal                                                   |
| **`muted-foreground/40`** (separador/breadcrumb mobile)                  | ≈**1.9:1** | ❌                      | ❌                              | **falha** (já está em texto: `text-muted-foreground/40` no `/` do breadcrumb) |
| `text-foreground/60` (ícones, ex. `lucide-dices ... text-foreground/60`) | ≈**6–7:1** | ✅ p/ ícone             | ✅                              | ok (foreground é muito claro)                                                 |

**Gaps de contraste:**

- **`muted-foreground` com opacidade reduzida (`/40`, `/50`, `/60`) aplicada a texto** é o padrão mais comum de falha. Aparece em placeholders, legendas, separadores (ex.: `MobileNav.tsx` linha 126 `text-muted-foreground/40` no separador `/`, e o badge designlang `rgba(140,140,140,0.5)`). Para texto, **mínimo `muted-foreground` cheio**; abaixo disso, só elementos puramente decorativos.
- **`muted-foreground` cheio já é limítrofe (4.9–5.2:1).** Sobreviveu por pouco; qualquer escurecimento de fundo (cards aninhados, overlays) o derruba. Recomendo **elevar o token `--muted-foreground` no dark para ≈`0 0% 62–65%`** (ganha folga sem perder a hierarquia visual) e **proibir opacidade <100% em texto** via lint/convention.
- **Cores semânticas no dark** (`warning/success/info/caution`, ver `ui-componentes.md`) têm valores definidos mas **não foram auditadas contra fundo** — validar cada `*-foreground` sobre seu respectivo fundo no port.
- **Herança das vars nomeadas** (`--cyber-lime`, `--vapor-violet` ficam no valor _light_ 38%/55% no dark — ver `ui-componentes.md` seção a): `text-cyber-lime` no dark renderiza um lime **escuro (38%)** sobre fundo escuro → **provável falha de contraste** onde for usado como texto. Auditar todos os usos de `text-cyber-lime`/`text-vapor-violet` (vs. `text-primary`/`text-secondary`, que são os vivos).

### 2.2 Toque ≥44px

| Elemento (arquivo)                                                          | Tamanho atual            | Veredito                            |
| --------------------------------------------------------------------------- | ------------------------ | ----------------------------------- |
| Hambúrguer (`MobileNav.tsx:134`)                                            | `w-9 h-9` = **36px**     | ❌ < 44px                           |
| Ícones do header mobile (busca/sino, via `GlobalSearch`/`NotificationBell`) | herdam ~36px             | ❌ provável < 44px                  |
| Itens do dropdown mobile (`px-3 py-2.5`, ícone 20px)                        | ≈ **40px** de altura     | ⚠️ limítrofe                        |
| Itens da sidebar desktop (`py-2.5`)                                         | ≈ 40px                   | ⚠️ (desktop tolera, mas padronizar) |
| Botões de tema/sair (`py-2.5` full-width)                                   | largura ok, altura ≈40px | ⚠️                                  |

**Ação:** padronizar **mín. 44×44px** em todo controle tocável no mobile. Trocar `w-9 h-9` → `w-11 h-11` (44px) ou `min-h-11 min-w-11` com padding interno. Itens de menu → `py-3` (≈48px). Espaçamento mínimo de 8px entre alvos adjacentes (o header tem `gap-1` = 4px entre busca/sino/menu — **aumentar para `gap-2`**).

### 2.3 Foco visível e navegação por teclado

- **[LP]** O designlang capturou estados de foco ricos nos botões da landing (box-shadow de ring lime duplo + outline) — bom sinal de que o foco existe na vitrine.
- **[APP]** Nos componentes de navegação do app, os `NavLink`/`button` **não declaram estilo de foco explícito** (`focus-visible:ring`). Dependem do default do browser/shadcn. Como o app sobrescreve muito estilo, **garantir `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`** em todos os interativos da casca. `--ring` = `82 100% 65%` (lime) é perfeito para isso.
- **Tab order:** a estrutura DOM (header → dropdown → overlay) segue a ordem visual; ok. Mas o **dropdown mobile não move foco para o primeiro item ao abrir**, nem **devolve o foco ao hambúrguer ao fechar** (sem focus trap). Adicionar gerenciamento de foco + fechar com `Esc`.
- **Atalhos de teclado:** `useKeyboardShortcuts` + ⌘K (busca) existem — ótimo para desktop. `KeyboardShortcutsDialog` documenta. Manter.

### 2.4 ARIA e semântica

- **Botões de ícone sem rótulo acessível:** hambúrguer (`MobileNav`), triggers de `GlobalSearch` e `NotificationBell` — **sem `aria-label`**. Leitor de tela anuncia "botão" vazio. `ThemeToggle` **tem** `aria-label` (bom exemplo a replicar).
- **Estado do menu sem `aria-expanded`/`aria-controls`** no hambúrguer.
- **Item ativo sem `aria-current="page"`** (hoje a indicação é só visual via classe).
- **Overlay de fechar** é uma `div` clicável sem papel/teclado — aceitável como reforço, desde que `Esc` e o botão X cubram a a11y.
- **Badge "novo post"** (`w-2 h-2 rounded-full animate-pulse`) é puramente visual — adicionar texto oculto (`sr-only` "novos posts") para não ser informação só por cor/forma.

### 2.5 `prefers-reduced-motion`

- O app é **CSS-motion-first** (ver `ui-componentes.md` seção e): `.reveal`+IntersectionObserver, `animate-fade-up`, `animate-pulse-lime`, `bell-ring`, `page-enter`, `slide-up`, `scroll-reveal`. **Não há evidência de guard `@media (prefers-reduced-motion: reduce)`** em nenhum desses keyframes/utilities.
- **Gap AA (2.3.3 / boa prática):** `animate-pulse-lime` (badge), `bell-ring` (sino), reveals de scroll e `page-enter` de troca de rota podem incomodar usuários sensíveis a movimento. **Ação:** no port, envolver todas as animações não-essenciais num bloco `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }` e/ou checar a preferência nos 2 componentes que usam `framer-motion` (academia) via `useReducedMotion()`.

---

## 3. Padrões de UX (estados, feedback, formulários, densidade)

### 3.1 Estados vazios / loading / erro

- **Loading:** existe `SkeletonCards.tsx` (composite custom) e a primitiva `skeleton`; designlang detectou `skeleton-loading` **[LP]**. Bom — skeleton é o padrão certo para listas. **Mas não há garantia de que todas as listas pesadas (campanhas, jogadores, notas, academia, admin) usem skeleton** vs. spinner vs. nada. **Ação:** padronizar — toda query TanStack com `isLoading` renderiza skeleton com o **shape do conteúdo real** (não spinner genérico), reservando espaço para evitar layout shift (`content-jumping`).
- **Vazio:** `form-states.json` reporta `empty.count: 0` **[LP]** — a LP não tem estados vazios (esperado). **[APP]** O app **tem dezenas de coleções** (campanhas, sessões, jogadores, notas, quadros, anotações da academia, formulários de feedback) e **não há um componente `EmptyState` no inventário de UI**. Esse é um buraco de UX premium: primeira sessão de um mestre novo cai em telas vazias sem orientação. **Ação:** criar **um `EmptyState` único** (ícone lucide on-brand + título + descrição + CTA primário), usado em toda coleção vazia. É também a oportunidade de onboarding contextual ("Crie sua primeira campanha").
- **Erro:** `form-states.json` `error.count: 0` **[LP]**. **[APP]** Existe `LazyErrorBoundary` (inventário, seção c) para erros de chunk/render — bom. **Mas erros de dados/rede** (query falhou, mutation falhou) não têm padrão visível. **Ação:** padronizar **error state inline** por seção (mensagem clara + botão "Tentar de novo" que chama `refetch`), próximo do problema (`error-feedback`), em vez de só toast efêmero. Reservar toast para confirmações/avisos transitórios.

### 3.2 Feedback (toasts)

- **Dois sistemas de toast coexistem:** `sonner` **e** `toast/toaster/use-toast` (shadcn), com `use-toast.ts` duplicado em `ui/` e `hooks/` (ver `ui-componentes.md` seções b e e). Risco de inconsistência visual e de manutenção. **Ação no port:** **escolher um** (recomendo `sonner` — mais simples, melhor a11y de live-region, é o que a comunidade shadcn convergiu) e remover o outro. Garantir `role="status"`/`aria-live` (sonner já entrega).

### 3.3 Formulários

- **[LP]** `form-states.json` reporta `forms.count: 0` — a landing não tem formulário inline (CTAs levam a `/auth`). Não há evidência de formulário a auditar nos artefatos.
- **[APP]** O app usa `react-hook-form` + `zod` + `@hookform/resolvers` (inventário seção e) — stack correta. Pontos a garantir no port (lente `form-labels`, `error-feedback`, `loading-buttons`):
  - **`<label>` com `htmlFor`** em todo input (a primitiva `form` do shadcn ajuda, mas validar campos custom: crop dialogs, editores).
  - **Erros de validação inline**, associados ao campo via `aria-describedby`, não só toast.
  - **Botões de submit com estado disabled + spinner** durante async (`loading-buttons`) — evitar duplo-submit em conexões móveis instáveis (mesa de RPG = wifi ruim).
  - **`inputmode`/`type` corretos no mobile** (numérico na calculadora de finanças, e-mail no auth) para o teclado certo.
- **Guardrail do projeto:** nada de `window.alert/confirm/prompt` — usar `Dialog`/`AlertDialog` (ESLint `no-alert`). As primitivas já existem (`alert-dialog`, `dialog`, `drawer`). Manter.

### 3.4 Densidade mobile

- **Tipografia mobile:** body 16px (designlang confirma 16px em mobile/tablet/desktop) — ✅ atende `readable-font-size` (≥16px evita zoom no iOS). **Atenção:** o type-scale da LP tem `body { font-size: 12px }` em alguns nós e `nav/a/button` em 12px **[LP]** — 12px é pequeno demais para alvo de leitura/toque no app; no port, **mínimo 14px para metadados e 16px para corpo** no app autenticado.
- **Cards:** raio 16px, fundo `#1F1F1F`, borda sutil `border/60` — densidade visual boa. Em telas com muitos cards (dashboard, academia, admin), atenção ao **anti-pattern de "tudo é card"** (lente `taste-skill`): nem toda lista precisa ser grade de cards; listas densas (jogadores, sessões) ganham com **list rows** mais compactas no mobile.
- **Largura de container:** designlang lista vários max-widths (1280/1152/1024/896/768/448) — ok para conteúdo, mas **padronizar 2–3 larguras** no port (ex.: `max-w-7xl` app, `max-w-3xl` leitura/editor) para ritmo consistente.
- **Linha de leitura (blog/diário/academia):** com `@tailwindcss/typography`, garantir `max-w` de ~65–75ch (`line-length`) e `line-height` 1.6–1.75 no corpo — crítico nos leitores (BookReader, PublicBlogPost, PublicNote).

### 3.5 Ícones e consistência visual

- **`lucide-react` uniforme**, grid 24, stroke 2, rounded caps (icon-system.json: 49 ícones, 100% stroke) — ✅ excelente consistência, sem emoji (atende `no-emoji-icons`). Manter no port.
- **Símbolo D20 (`DiceIcons.tsx`)** usa **HSL hardcoded** (não tokens), com presets `ember/ice/gold` que não existem como tokens (ver `ui-componentes.md` seção c). **Conflita com o guardrail "só tokens de design".** No port: ou tokenizar esses presets, ou documentar a exceção explícita do símbolo de marca.

---

## 4. Recomendações priorizadas

Prioridade pela lente `ui-ux-pro-max` (Acessibilidade/Toque = CRITICAL; Layout/IA = HIGH; resto MEDIUM). Esforço relativo: S/M/L.

### CRÍTICO (corrigir na casca de navegação da nova versão — antes de portar features)

| #   | Ação                                                                                                                                                                                                       | Lente                          | Esforço |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------- |
| C1  | **Substituir o top-bar+dropdown mobile por bottom navigation persistente** (5 slots: 4 jornadas + "Mais"), na zona do polegar; parar de esconder a navegação no scroll. Aproveitar o `pb-16` já reservado. | `touch`, IA                    | M       |
| C2  | **Elevar todos os alvos de toque mobile para ≥44px** (`w-9 h-9`→`w-11 h-11`; itens de menu `py-3`; `gap-1`→`gap-2` no header).                                                                             | `touch-target-size`            | S       |
| C3  | **`aria-label` em todo botão de ícone** (hambúrguer, busca, sino), `aria-expanded`/`aria-controls` no menu, `aria-current="page"` no item ativo.                                                           | `aria-labels`                  | S       |
| C4  | **Eliminar opacidade <100% em texto** (`muted-foreground/40,/50,/60`); elevar `--muted-foreground` dark p/ ~62–65%; auditar `text-cyber-lime`/`text-vapor-violet` (escuros no dark).                       | `color-contrast`               | M       |
| C5  | **Focus-visible explícito** (`ring-2 ring-ring ring-offset-2 ring-offset-background`) em todos os interativos + focus trap/`Esc`/restauração de foco no menu mobile.                                       | `focus-states`, `keyboard-nav` | M       |

### ALTO

| #   | Ação                                                                                                                                                                                           | Lente                               | Esforço |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------- |
| A1  | **Bloco global `prefers-reduced-motion: reduce`** zerando animações não-essenciais (reveals, pulse-lime, bell-ring, page-enter) + `useReducedMotion()` nos 2 usos de framer-motion (academia). | `reduced-motion`                    | S       |
| A2  | **Componente `EmptyState` único e reutilizável** em toda coleção vazia (com CTA/onboarding contextual).                                                                                        | UX states                           | M       |
| A3  | **Unificar match de rota ativa (`startsWith`)** entre sidebar e mobile; corrigir destaque em rotas-filhas.                                                                                     | consistency                         | S       |
| A4  | **Padronizar skeleton com shape real** em todas as listas pesadas (reservar espaço, sem layout shift).                                                                                         | `loading-states`, `content-jumping` | M       |

### MÉDIO

| #   | Ação                                                                                                                          | Lente                               | Esforço |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------- |
| M1  | **Consolidar em um único sistema de toast** (recomendo `sonner`); remover o duplicado e `use-toast` redundante.               | consistency                         | S       |
| M2  | **Padrão de error state inline por seção** ("Tentar de novo"→`refetch`), reservando toast só para transitórios.               | `error-feedback`                    | M       |
| M3  | **Tooltip/`title`+`aria-label` na sidebar colapsada**; reorganizar rodapé da sidebar (separar navegação de ações de sistema). | `aria-labels`                       | S       |
| M4  | **Mínimo 14px (meta) / 16px (corpo)** no app; padronizar 2–3 larguras de container; linha de leitura 65–75ch nos leitores.    | `readable-font-size`, `line-length` | S       |
| M5  | **Tokenizar (ou documentar exceção) das cores HSL hardcoded** do `DiceIcons` e presets `ember/ice/gold`.                      | tokens (guardrail)                  | M       |

---

## 5. As 5 ações de maior impacto para a nova versão

Se a nova versão fizer **só estas cinco**, já sobe de "app funcional com boa identidade" para **app mobile-first premium e acessível**:

1. **Bottom navigation mobile persistente (C1).** É a mudança de maior retorno: alinha o produto ao contexto real (mestre, uma mão, na mesa), elimina a fricção de 2 toques + scroll-hide, e usa espaço já reservado. **Maior impacto isolado em usabilidade.**

2. **Toque ≥44px em tudo + `aria-label` nos ícones (C2+C3).** Barato (S) e destrava acessibilidade de toque e leitor de tela de uma vez. Pré-requisito de "AA de verdade".

3. **Disciplina de contraste no dark (C4).** Banir opacidade em texto e elevar o cinza secundário tira o app da zona limítrofe/falha de AA sem tocar na identidade lime/violet. Define a **convenção de cor** que vale para todas as 270+ telas portadas.

4. **`prefers-reduced-motion` + foco visível (A1+C5).** Fecha os dois gaps de a11y que faltam (movimento e teclado) e protege a marca CSS-motion-first de virar passivo de acessibilidade.

5. **`EmptyState` único + skeleton padronizado + um toast (A2+A4+M1).** Padroniza os três estados que o usuário mais encontra (vazio, carregando, feedback). Transforma a primeira sessão de um mestre novo (hoje: telas vazias) em onboarding guiado, e elimina a dívida dos dois sistemas de toast — **a base de "polimento percebido"** da versão nova.

---

## Anexo — notas de portabilidade que cruzam com UX

- **Páginas SEO** (`/novidades*`, `/m/:slug`, `/n|f|c/:token`, landings) → Server Components com `generateMetadata`; são as que mais ganham e onde a hierarquia tipográfica/leitura (item M4) mais importa.
- **Telas client-only pesadas** (whiteboard, editores TipTap, recharts do admin) → `dynamic(ssr:false)`; o bottom-nav novo precisa de estratégia de "voltar/sair" no whiteboard (tela cheia, fora do `AppLayout`).
- **PWA/push** → manter o sino de notificação, mas com `aria-label` e badge acessível (item C3).
- **Tokens** → portar `index.css` + `tailwind.config.ts` **verbatim** (batem 95%, ver `ui-componentes.md`), **exceto** o ajuste de `--muted-foreground` dark (C4), que é melhoria deliberada de acessibilidade.
