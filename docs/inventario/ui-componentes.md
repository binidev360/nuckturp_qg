# Inventário de UI — Nuckturp QG (port Next.js)

> Gerado em 2026-05-28. Fonte: projeto antigo **READ-ONLY** `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp` (Vite/React/shadcn). Insumo fiel para a **Fase 0.2 (design aplicado)** e para o planejamento do port de componentes.
>
> Arquivos de origem dos tokens: `tailwind.config.ts`, `src/index.css`, `components.json`, `index.html` (fontes).

---

## (a) Validação de tokens — código vs. docs portados

Comparação dos valores **reais** do código antigo contra `docs/design-system.md` e `docs/branding.md`. Coluna "Bate?": ✅ idêntico · ⚠️ divergente · ➕ existe no código, ausente nos docs.

### Cores de marca (modo dark = produção)

| Token | Valor no código (dark) | Valor nos docs | Bate? | Obs |
|---|---|---|---|---|
| `--primary` (Cyber Lime) | `82 100% 65%` | `82 100% 65%` (#C4FF4D) | ✅ | HEX documentado bate |
| `--secondary` (Vapor Violet) | `268 100% 77%` | `268 100% 77%` (#BA8CFF) | ✅ | |
| `--background` (Noir Void) | `0 0% 10%` | `0 0% 10%` (#1A1A1A) | ✅ | |
| `--foreground` | `80 100% 95%` | `80 100% 95%` | ✅ | |
| `--card` | `0 0% 12%` | `0 0% 12%` | ✅ | |
| `--muted` | `0 0% 18%` | `0 0% 18%` | ✅ | |
| `--muted-foreground` | `0 0% 55%` | `0 0% 55%` | ✅ | |
| `--border` | `0 0% 22%` | `0 0% 22%` | ✅ | |
| `--destructive` | `0 84% 60%` | `0 84% 60%` | ✅ | |
| `--accent` | `82 100% 65%` | (igual ao primary) | ✅ | doc não lista, mas = primary |
| `--ring` | `82 100% 65%` | — | ➕ | não documentado; = primary |
| `--input` / `--popover` | `0 0% 22%` / `0 0% 12%` | — | ➕ | não documentado individualmente |

### Cores de sidebar (modo dark)

| Token | Valor no código (dark) | Valor nos docs | Bate? | Obs |
|---|---|---|---|---|
| `--sidebar-background` | `0 0% 8%` | `0 0% 8%` | ✅ | único sidebar token documentado |
| `--sidebar-foreground` | `80 100% 95%` | — | ➕ | ausente nos docs |
| `--sidebar-primary` | `82 100% 65%` | — | ➕ | ausente nos docs |
| `--sidebar-primary-foreground` | `0 0% 6%` | — | ➕ | ausente nos docs |
| `--sidebar-accent` | `0 0% 15%` | — | ➕ | ausente nos docs |
| `--sidebar-accent-foreground` | `80 100% 95%` | — | ➕ | ausente nos docs |
| `--sidebar-border` | `0 0% 18%` | — | ➕ | ausente nos docs |
| `--sidebar-ring` | `82 100% 65%` | — | ➕ | ausente nos docs |

### Cores nomeadas de marca + grid

| Token | Valor no código | Valor nos docs | Bate? | Obs |
|---|---|---|---|---|
| `--cyber-lime` | `82 85% 38%` (`:root`/light) **não redefinido no dark** | doc cita "82 100% 65%" como Cyber Lime | ⚠️ | A var `--cyber-lime` herda o valor **light** (`82 85% 38%`) mesmo no dark, pois `.dark` NÃO a redefine. O Cyber Lime "vivo" (65%) vem de `--primary`. **Atenção no port:** usos de `text-cyber-lime` no dark renderizam o lime mais escuro (38%), não o 65%. |
| `--vapor-violet` | `268 60% 55%` (`:root`/light) **não redefinido no dark** | doc cita "268 100% 77%" | ⚠️ | Mesmo caso: `--vapor-violet` fica no valor light (55%) no dark; o violet vivo (77%) vem de `--secondary`. |
| `--noir-void` | `60 10% 96%` (`:root`/light) **não redefinido no dark** | doc cita "0 0% 10%" | ⚠️ | `--noir-void` literal = quase branco (valor light); o preto real vem de `--background`. Doc descreve o conceito, não o valor da var. |
| `--grid-gray` | `60 5% 80%` (`:root`/light) **não redefinido no dark** | `branding.md` diz `0 0% 30%` | ⚠️ | **Divergência de valor.** Código real = `60 5% 80%`; doc afirma `0 0% 30%`. Nenhum dos dois é redefinido no `.dark`. Corrigir o doc. |

> **Nota estrutural importante (carregar para a Fase 0.2):** as 4 vars nomeadas `--cyber-lime`, `--vapor-violet`, `--noir-void`, `--grid-gray` **só existem no bloco `:root` (light)** e **não são redefinidas em `.dark`**. Como o app roda dark-first (`<html class="dark">`), classes como `text-cyber-lime`/`bg-vapor-violet`/`text-noir-void` usam os valores **light**. As cores vivas de marca no dark vêm de `--primary`/`--secondary`/`--background`. Os docs tratam essas 4 como se tivessem os valores dark — conceitualmente certo, literalmente impreciso. Portar o CSS **verbatim** (com essa herança) para não quebrar a aparência atual.

### Cores semânticas de status (existem no código, docs só mencionam por nome)

| Token | Valor light | Valor dark | Nos docs? | Obs |
|---|---|---|---|---|
| `--warning` / `-foreground` | `45 93% 47%` / `0 0% 100%` | `45 96% 64%` / `0 0% 6%` | ⚠️ citado por nome, sem HSL | ➕ valores ausentes |
| `--success` / `-foreground` | `152 69% 31%` / `0 0% 100%` | `152 76% 46%` / `0 0% 6%` | ⚠️ citado por nome, sem HSL | ➕ valores ausentes |
| `--info` / `-foreground` | `213 94% 48%` / `0 0% 100%` | `213 94% 62%` / `0 0% 6%` | ⚠️ citado por nome, sem HSL | ➕ valores ausentes |
| `--caution` / `-foreground` | `25 95% 53%` / `0 0% 100%` | `25 95% 63%` / `0 0% 6%` | ⚠️ citado por nome, sem HSL | ➕ valores ausentes |

### Tipografia

| Item | Código | Docs | Bate? | Obs |
|---|---|---|---|---|
| `font-display` | `["Space Grotesk", "sans-serif"]` | Space Grotesk (400–700) | ✅ | aplicada a `h1–h6` via `@layer base` |
| `font-sans` | `["Inter", "sans-serif"]` | Inter (300–900) | ✅ | aplicada a `body` |
| Pesos Space Grotesk carregados | `400;500;600;700` (Google Fonts em `index.html`) | "400, 500, 600, 700" | ✅ | |
| Pesos Inter carregados | `300;400;500;600;700;800;900` (Google Fonts) | "300–900" | ✅ | doc fala "300–900", mas 100/200 NÃO são carregados |
| Carregamento | `<link>` Google Fonts no `index.html` | doc diz "via `next/font`" | ⚠️ | **No port:** decisão correta migrar para `next/font` (self-host), mas hoje é Google Fonts via `<link>`. Doc descreve o alvo, não o estado atual. |
| `<strong>` | Cyber Lime, peso 650 | idem | ✅ | `.notion-editor`/`.blog-content strong` |
| `<em>` | Vapor Violet, itálico | idem | ✅ | |

### Forma, raio e gradientes

| Item | Código | Docs | Bate? | Obs |
|---|---|---|---|---|
| `--radius` | `0.75rem` | `0.75rem` (12px) | ✅ | |
| `borderRadius` lg/md/sm | `var(--radius)` / `-2px` / `-4px` | — | ➕ escala md/sm não documentada |
| Gradiente `.bg-gradient-nuckturp` | `linear-gradient(135deg, hsl(82 100% 65%) 0%, hsl(268 100% 77%) 100%)` | doc cita gradientes lime/violet/void genéricos | ⚠️ | O gradiente real é **lime→violet 135°** (utility CSS). Os "gradientes cyber-lime/vapor-violet/noir-void" do `branding.md` não existem como tokens no código — são descrições conceituais. |
| `.text-glow-lime` | `text-shadow` lime 20px/40px | — | ➕ utility não documentada |
| `.text-glow-violet` | `text-shadow` violet 20px/40px | — | ➕ utility não documentada |
| `.border-glow-lime` | `box-shadow` lime inset+outer | — | ➕ utility não documentada |
| `.logo-adaptive` | `filter: brightness(0)` no light, `none` no dark | — | ➕ truque de inversão de logo não documentado |

### Keyframes e animações (Tailwind config)

| Animação | Definição | Nos docs? | Obs |
|---|---|---|---|
| `accordion-down` / `accordion-up` | radix height, 0.2s ease-out | ❌ | ➕ ausente |
| `pulse-lime` | opacity 1↔0.6, 2s infinite | ❌ | ➕ usado no badge do hero da landing |
| `fade-up` | opacity 0→1 + translateY 30px→0, 0.7s | parcial (citado como ponto de partida) | ➕ valores ausentes; usado no hero |
| `fade-in` | opacity 0→1 + translateY 8px→0, 0.4s | parcial (`animate-fade-in` citado) | ➕ |
| `scale-up` | opacity 0→1 + scale 0.95→1, 0.5s | ❌ | ➕ ausente |
| `bell-ring` | rotação amortecida (notificação), 0.8s | ❌ (design-system cita "bell" por nome) | ➕ keyframe completo ausente; usado em `NotificationBell` |

### Keyframes/animações CSS adicionais em `index.css` (fora do Tailwind config)

Não documentados em nenhum dos docs (todos ➕):

- `@keyframes page-enter` → `.animate-page-enter` (0.25s) — transição de rota
- `@keyframes slide-up` → `.animate-slide-up` (0.35s, expo)
- `@keyframes selection-pulse` — whiteboard (seleção)
- `@keyframes snap-bounce` — whiteboard (snap-to-grid)
- `.scroll-reveal` / `.revealed` — entrada premium (0.6s cubic-bezier expo)
- `.reveal` / `.is-visible` + `.reveal-delay-1..5` — **motion principal da landing** (IntersectionObserver, NÃO framer-motion)
- `.section-separator` + `.sep-dot` — divisor de seção com gradiente
- `.notion-editor` / `.blog-content` — folhas de estilo extensas do editor TipTap e do blog (tipografia, blockquote, code, tabelas, taskList, columns)
- `.wb-rt-editor` / `.wb-rt-display` — rich text do whiteboard
- Scrollbar custom (violet sobre cinza escuro, webkit + Firefox)

> **Divergências acionáveis (corrigir docs antes de portar):**
> 1. `--grid-gray`: doc diz `0 0% 30%`, código é `60 5% 80%` (e fica no valor light no dark). **Corrigir `branding.md`.**
> 2. Vars `--cyber-lime`/`--vapor-violet`/`--noir-void` não são redefinidas no dark — documentar a herança.
> 3. Fontes hoje via Google Fonts `<link>`, não `next/font` (alvo do port).
> 4. `FloatingDice` citado nos dois docs **não existe no código** (ver seção c).
> 5. Cores semânticas (warning/success/info/caution) sem valores HSL nos docs.
> 6. Faltam nos docs: glow utilities, `bg-gradient-nuckturp` real (135° lime→violet), keyframes `scale-up`/`pulse-lime`/`bell-ring`, animações CSS de página/scroll/whiteboard, tokens de sidebar individuais.

---

## (b) Componentes shadcn/ui — `src/components/ui/`

**Config (`components.json`):** style `default`, `rsc: false` (port para Next App Router exigirá decidir client/server por componente), `baseColor: slate`, `cssVariables: true`, sem prefix. Aliases: `@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`, `@/hooks`.

**Total: 49 `.tsx` + 1 `.ts`.** Destes, **48 são primitivas shadcn/ui stock** + **1 composite custom** (`SkeletonCards.tsx`) + **1 hook** (`use-toast.ts`).

Primitivas stock (48): `accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`, `toggle-group`, `tooltip`.

Custom/extra dentro de `ui/`:
- `SkeletonCards.tsx` — composite de skeletons (não stock).
- `use-toast.ts` — hook re-export do toast (duplicado em `src/hooks/use-toast.ts`).

> **Nota de port:** `sonner.tsx` + `toast.tsx`/`toaster.tsx`/`use-toast.ts` coexistem (dois sistemas de toast). `drawer` usa `vaul`, `carousel` usa `embla-carousel-react`, `chart` usa `recharts`, `calendar` usa `react-day-picker`, `command` usa `cmdk`, `input-otp` usa `input-otp`, `resizable` usa `react-resizable-panels`. Todas primitivas Radix listadas nas deps (seção e).

---

## (c) Componentes de marca / custom relevantes — `src/components/`

### Componentes de marca / identidade visual

| Componente | Papel | Notas para o port |
|---|---|---|
| `DiceIcons.tsx` | **Símbolo central D20.** Exporta `DiceIcon` (SVG paramétrico d4/d6/d8/d10/d12/d20/d100) + `DICE_COLOR_PRESETS` (cyber-lime, vapor-violet, ember, ice, gold) com strokes/fills/glow em HSL **hardcoded**. Importa `nuckturp-dado-white.png`. | Cores HSL inline (não tokens) — atenção ao guardrail "só tokens". `ember`/`ice`/`gold` não existem como tokens CSS. |
| `InlineDiceRoller.tsx` | Rolador de dados inline (popover) usando `DiceIcon`. | — |
| `NarrativeDivider.tsx` | Divisor narrativo (linha gradiente + ponto), usa tokens `border`/`primary`. | Versão React do `.section-separator` CSS. |
| `MasterBadges.tsx` | Badges de "mestre" (gamificação). | — |
| `LevelDotSelector.tsx` | Seletor de nível por pontos. | — |
| `ThemeToggle.tsx` | Toggle de tema (next-themes), embora dark-first. | — |
| `NotificationBell.tsx` | Sino de notificação — consome animação `bell-ring`. | — |

> **ALERTA — `FloatingDice` não existe.** Tanto `design-system.md` quanto `branding.md` afirmam que o D20 aparece como `FloatingDice` na landing. **Não há nenhum componente `FloatingDice` no código** (grep confirmou). O D20 na landing aparece como imagem estática (`nuckturp-dado-white.png`) + os ícones SVG de `DiceIcons.tsx`. O motion da landing é **CSS puro** (`animate-fade-up`, `animate-fade-in`, `animate-pulse-lime`, `.reveal`+IntersectionObserver), **não framer-motion**. Corrigir os docs ou criar o componente de propósito na Fase 5 (motion).

### Landing (`src/components/landing/`) — 4 componentes

`LandingHeroSection`, `LandingFeaturesSection`, `LandingBlogSection`, `LandingCtaSection`. Motion 100% via classes CSS (`animate-fade-up`/`animate-fade-in` no hero, `.reveal reveal-delay-N` nas seções). Hero usa `bg-cyber-lime text-noir-void` + `animate-pulse-lime` no badge.

### Outros agrupamentos de componentes (volume p/ planejamento do port)

| Pasta | Qtd | Domínio |
|---|---|---|
| `src/components/` (raiz) | ~73 `.tsx` | layout (`AppLayout`, `AppSidebar`, `MobileNav`), blog (`Blog*` ~15), editor (`NotionEditor`, `NotionPage`), diálogos (`*Dialog`, `*Drawer`), perfil/onboarding, infra (`ProtectedRoute`, `LazyErrorBoundary`, `GoogleAnalytics`, `Pwa*`, `PushNotification*`) |
| `admin/` | ~50 + `platform/` | painel admin (blog, usuários, notificações, financeiro, usabilidade) |
| `whiteboard/` | ~17 + extensões TipTap | quadro de ideias (canvas, toolbar, minimap, layers) |
| `academy/` | ~20 | Academia de Mestres (reader, NPS, anotações, vídeo) — **únicos usuários de framer-motion** |
| `profile/` | 9 | abas de perfil |
| `dashboard/` | 7 | widgets do dashboard |
| `character/` | 8 | abas de ficha de personagem |
| `campaign/` | 10 | sessões/campanha |
| `finance/` | 6 | calculadora/ledger financeiro |
| `blog/` | 5 | editor de post |
| `feedback/` | 4 | avaliação de mestre (NPS) |
| `feature-hints/` | 7 | tour/hints onboarding (provider + portals) |
| `player/` | 2 | consentimento de jogador |
| `editor/` | 8 | nodes custom do TipTap (Callout, Spoiler, EmbedCard, Mention, etc.) |

> Volume total ≈ **270+ componentes**. O port da Fase 0.2 foca em **tokens + primitivas shadcn + componentes de marca**; o restante entra nas fases de feature.

---

## (d) Assets de marca + caminhos

> Caminhos relativos ao projeto antigo (read-only). Copiar para o projeto novo no port.

### Logo e símbolo (em `src/assets/`)

| Asset | Caminho | Uso |
|---|---|---|
| Logo (texto, branco) | `src/assets/nuckturp-aventura-logo-white.png` | Header, landing, branding |
| Ícone D20 (branco) | `src/assets/nuckturp-dado-white.png` | Símbolo central; importado por `DiceIcons.tsx`, splash/loading |
| Logo alt (branco) | `public/nuckturp-logo-white.png` | Variante pública |

### Favicon / PWA (em `public/`)

| Asset | Caminho |
|---|---|
| Favicon PNG | `public/favicon.png` |
| Favicon ICO | `public/favicon.ico` |
| PWA 192 | `public/pwa-192x192.png` |
| PWA 512 | `public/pwa-512x512.png` |
| Placeholder | `public/placeholder.svg` |

> `theme-color` do PWA (`index.html`) = `#B6FF00` (lime). **Atenção:** difere ligeiramente do Cyber Lime de marca (`#C4FF4D`). Decidir no port se unifica.

### OG / social (em `public/`)

`og-image.jpg`, `og-book.jpg`, `og-checklist.jpg`, `og-dicionario.jpg`, `og-worldbuilding.jpg`, `email-header.jpg`. OG principal do `index.html` aponta para URL externa do Lovable (`storage.googleapis.com/gpt-engineer-...`) — **substituir no port**.

### Imagens de landing/marketing (em `src/assets/`)

`landing-hero.jpg`, `landing-feature-campaigns.jpg`, `landing-feature-diary.jpg`, `landing-feature-ideaboard.jpg`, `worldbuilding-hero.jpg`, `worldbuilding-intensity.jpg`, `worldbuilding-solution.jpg`, `book-landing-*.{jpg,png}` (7), `checklist-*.{jpg,png}` (3), `screenshot-*.jpg` (4).

### SEO/infra (em `public/`)

`robots.txt`, `llms.txt`, `llms-full.txt`, `nuckturp2026indexnow.txt`, `sw-push.js` (service worker de push).

---

## (e) Bibliotecas de UI / motion (de `package.json`)

### Primitivas / base de UI
- **Radix UI** (24 pacotes `@radix-ui/react-*`) — base de toda a camada shadcn.
- **shadcn/ui** (style default, cssVariables) — gerado, não é dependência.
- `class-variance-authority` `^0.7.1` + `clsx` `^2.1.1` + `tailwind-merge` `^2.6.0` — variantes/merge de classes (o `cn()` em `@/lib/utils`).
- `tailwindcss` `^3.4.17` + `tailwindcss-animate` `^1.0.7` + `@tailwindcss/typography` `^0.5.16`.

### Motion / animação
- **`framer-motion` `^12.38.0`** — instalado, mas **uso restrito a 2 componentes** (`academy/CompletionCelebrationModal.tsx`, `academy/ContentNPSForm.tsx`). **A landing NÃO usa.** O motion do app é majoritariamente **CSS** (keyframes Tailwind + classes `.reveal`/IntersectionObserver).
- `canvas-confetti` `^1.9.4` (+ `@types`) — confete (celebração de conclusão na academia).
- **Sem GSAP, sem Lottie, sem Rive, sem Motion.dev (`motion/react`).**

### Componentes especializados (libs por trás de primitivas shadcn)
- `embla-carousel-react` (carousel) · `vaul` (drawer) · `recharts` (chart) · `cmdk` (command) · `input-otp` (input-otp) · `react-resizable-panels` (resizable) · `react-day-picker` (calendar) · `sonner` (toast) · `next-themes` (tema).
- `lucide-react` `^0.462.0` — **biblioteca de ícones** (padrão do projeto).

### Editor / conteúdo
- **TipTap 3.20** (`@tiptap/*`, ~24 pacotes) — editor Notion-like + nodes custom (`src/components/editor/`).
- `dompurify` — sanitização de HTML do editor/blog.

### Formulários / dados / outros
- `react-hook-form` + `@hookform/resolvers` + `zod` — formulários.
- `@tanstack/react-query` — data fetching.
- `@dnd-kit/*` (4) — drag-and-drop (whiteboard/listas).
- `date-fns`, `react-image-crop`, `react-router-dom` (→ migra p/ App Router), `i18next`/`react-i18next`, `@supabase/supabase-js`, `vite-plugin-pwa` (→ migra p/ estratégia PWA Next).

---

## Resumo para a Fase 0.2

- **Tokens batem em 95%**: todas as cores principais de marca, tipografia, raio e `<strong>`/`<em>` conferem. Portar `index.css` + `tailwind.config.ts` **verbatim**.
- **Corrigir nos docs**: `--grid-gray` (valor errado), herança das 4 vars nomeadas no dark, fontes (Google Fonts → alvo `next/font`), `FloatingDice` inexistente, valores HSL das cores semânticas, glow utilities, keyframes e animações CSS não documentadas.
- **Motion real é CSS-first**, não framer-motion. framer-motion fica só em 2 telas da academia. Ícones via `lucide-react`. Símbolo D20 = `DiceIcons.tsx` (SVG paramétrico, cores HSL inline — atenção ao guardrail de tokens).
