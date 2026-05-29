# Design System — QG do Mestre (Nuckturp)

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

> Fonte da identidade visual elogiada do produto. Os tokens migram **verbatim** para o Next.js. Este documento promove e expande o [branding.md](branding.md) com a camada de **motion**.

## 1. Filosofia
**"Gamer Premium"** — dark-first, minimalista com personalidade forte. Fundo escuro dominante (Noir Void), destaques pontuais (Cyber Lime / Vapor Violet), glassmorphism sutil, sombras profundas, mobile-first.

## 2. Cores (tokens HSL — dark é produção)

| Token | Dark | Light (`:root`) | Uso |
|---|---|---|---|
| **Cyber Lime** (primary) | `82 100% 65%` (#C4FF4D) | `82 85% 38%` | CTAs, links, `<strong>`, accent |
| **Vapor Violet** (secondary) | `268 100% 77%` (#BA8CFF) | `268 60% 55%` | Ênfase, badges, `<em>` |
| **Noir Void** (background) | `0 0% 10%` | `60 10% 96%` | Fundo base |
| foreground | `80 100% 95%` | `0 0% 12%` | Texto |
| card | `0 0% 12%` | `60 10% 99%` | Cards/painéis |
| muted / muted-foreground | `0 0% 18%` / `0 0% 55%` | — | Áreas sutis, legendas |
| border | `0 0% 22%` | `60 5% 85%` | Bordas/divisores |
| Semânticos | warning · success · info · caution · destructive | — | Status (nunca hardcode amber/green/blue) |

**Regras:** sempre tokens (`bg-primary`, `text-foreground`), nunca cor hardcoded. Opacidade via Tailwind (`text-primary/50`). Tudo HSL para o sistema de temas. Dark-first.

## 3. Tipografia
- **Space Grotesk** (`font-display`, 400–700) — headings h1–h6, branding. Via `next/font`.
- **Inter** (`font-sans`, 300–900) — corpo, UI, formulários.
- `<strong>` → Cyber Lime, peso 650. `<em>` → Vapor Violet, itálico.

## 4. Forma & espaço
- `--radius` 0.75rem (12px); cards `rounded-xl`/`rounded-2xl`.
- Espaçamento base 8pt. Áreas de toque ≥ 44px (acessibilidade mobile).
- Gradientes de marca (lime/violet/void) em banners e capas.

## 5. Símbolo
Dado **D20** é o ícone central — favicon, splash/loading, `FloatingDice` na landing, referência visual em componentes de RPG.

## 6. Motion (camada nova — Fase 5)

> O branding atual prega "sobriedade gamer, sem animações excessivas". A camada de motion **respeita** isso: movimento com propósito, nunca decorativo gratuito.

### Tokens de motion
| Token | Valor | Uso |
|---|---|---|
| `--motion-fast` | 150ms | Hover, toggles |
| `--motion-base` | 300ms | Entradas de painel, toasts |
| `--motion-slow` | 600ms | Transições de página, scroll-reveal |
| Easing padrão | `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out expo) | Sensação premium |

### Catálogo
- **Transições de página/rota** (App Router) — fade + leve translateY (reaproveitar `fade-up`/`fade-in`).
- **Micro-interações** — botões (scale 0.98 no press), cards (elevação no hover), bell (`bell-ring` existente), dados rolando.
- **Scroll-reveal** — entradas progressivas na landing e listas longas.
- **D20 com física** — `FloatingDice` repensado (framer-motion / leve física), sem custo de performance.
- **Respeitar `prefers-reduced-motion`** — desligar/atenuar para acessibilidade.

### Ferramentas
framer-motion (já no projeto) como base; GSAP só se um efeito específico exigir. Keyframes Tailwind existentes (`fade-up`, `fade-in`, `scale-up`, `pulse-lime`, `bell-ring`) são o ponto de partida.

## 7. Componentes de marca
- **Botões sobre imagem:** fundo `black/80–85` + `backdrop-blur-lg`, borda colorida translúcida, sombra forte.
- **Banner/cover:** 1500×500 (3:1), WebP 90%, posição vertical ajustável.
- **Avatar:** 400×400, WebP.

## 8. Nomenclatura
Produto: **QG do Mestre** · Marca: **Nuckturp** · Completo: **QG do Mestre — Nuckturp** · URL: `nuckturp.com.br`.
