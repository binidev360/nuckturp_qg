# Motion Audit · Nuckturp QG (migração Next 16 + Tailwind v4 + framer-motion)

> Auditoria técnica de **performance** de motion. Foco em código (layout/paint, `transition: all`, `will-change`, reduced-motion, stagger/loop infinito), não em estética.
> Escopo híbrido: o motion **real hoje é CSS-first** (keyframes Tailwind + `.reveal`/IntersectionObserver); framer-motion (`motion/react`) ainda **não existe** no projeto novo. Este doc audita o que existe (legado, fonte de paridade) e define o **sistema de motion performático** para o Next 16.

## Resumo

- **Surface JS-motion no projeto novo (`Nuckturp_QG`)**: **0 arquivos** com `motion/react` ou `framer-motion`. O sistema será construído do zero — oportunidade de nascer correto.
- **Surface CSS-motion auditada**: `app/globals.css` (novo) + `src/index.css` e `tailwind.config.ts` (legado, fonte de verdade) + `useScrollReveal.ts` + 2 componentes legados de framer-motion na academia.
- 🔴 Críticos: **3** (2 keyframes `height` layout-thrashing no legado; reduced-motion incompleto no novo `globals.css`).
- 🟡 Substantivos: **5** (`transition-all` epidêmico ~80+ ocorrências; loops infinitos `pulse-lime`/`animate-pulse`; stagger sem teto; `selection-pulse` anima `box-shadow`; `bell-ring` sem reduced-motion).
- 🟢 Polish: **4** (easing inconsistente CSS vs token; duplicação de fade; falta de tokens de duração/easing como variáveis; `useScrollReveal` não respeita reduced-motion).
- **Postura global de a11y (novo `globals.css`)**: existe `@media (prefers-reduced-motion: reduce)` mas **só zera `animation-*`** — **não cobre `transition`** nem `scroll-behavior`. Cobertura parcial. Detalhe em F3.

---

## 🔴 Crítico — regressão de performance ou bloqueio de a11y

### F1 · `tailwind.config.ts:92-99` (legado) · Keyframes `accordion-down/up` animam `height` (layout reflow por frame)

**Snippet**

```ts
"accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
"accordion-up":   { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
```

**Por que importa**
Animar `height` dispara **layout + paint + composite a cada frame** em toda abertura/fechamento de accordion (Radix). É o padrão clássico de layout-thrashing. Em mobile com vários accordions é jank garantido.
**Correção (Next 16)**
Padrão herdado do shadcn/Radix — aceitável **se** o conteúdo for curto e a abertura rara. Para o app novo, preferir a abordagem moderna: animar via `grid-template-rows: 0fr → 1fr` (compositável o suficiente e sem medir altura por JS) ou, em accordions ricos, usar `motion/react` com a prop `layout` (FLIP — Motion converte para `transform`, sem reflow por frame). Não copiar verbatim sem essa decisão.

### F2 · `src/index.css:634-637` (legado) · `selection-pulse` anima `box-shadow` em loop infinito

**Snippet**

```css
@keyframes selection-pulse {
  0%,
  100% {
    box-shadow: 0 0 12px hsl(var(--primary) / 0.3);
  }
  50% {
    box-shadow: 0 0 20px hsl(var(--primary) / 0.5);
  }
}
```

**Por que importa**
`box-shadow` é **propriedade de paint** (não compositável). Animá-la em **loop infinito** repinta o item selecionado do whiteboard a cada frame. Com N itens selecionados num canvas pesado, multiplica o custo de paint e segura a thread principal durante drag/zoom.
**Correção (Next 16)**
Trocar por um **pseudo-elemento com `opacity`/`transform`**: camada `::after` com o glow estático e animar só `opacity` (compositável). Ou usar `outline`/`box-shadow` estático + `transform: scale` num ring overlay. Nunca animar `box-shadow` em loop.

### F3 · `app/globals.css:194-196` (NOVO) · `prefers-reduced-motion` cobre só `animation`, deixa `transition` e `scroll` livres

**Snippet**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

**Por que importa**
A regra zera **keyframe animations**, mas **não** `transition-*` nem `scroll-behavior`. Todo o motion baseado em `transition` (os `.reveal`/`.scroll-reveal`, e o oceano de `transition-all` que virá na paridade) **continua animando** para usuários que pediram menos movimento — violação de WCAG 2.3.3. E o futuro framer-motion (spring/scroll-linked) **não é alcançável por CSS** de jeito nenhum.
**Correção (Next 16)** — endurecer o bloco global:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

E **obrigar `useReducedMotion()`** em todo componente `motion/react` com spring ou scroll-linked (CSS não desliga esses). Ver F11/F-rec.

---

## 🟡 Substantivo — qualidade e consistência

### F4 · `src/index.css` + ~80 ocorrências em `src/**` (legado) · `transition: all` / `transition-all` epidêmico

**Snippet** (amostras reais)

```
src/index.css:418  transition: color 0.2s, text-decoration-color 0.2s;   ← OK (explícito)
pages/Campaigns.tsx:259  ...transition-all duration-500 ... hover:shadow-[...] hover:-translate-y...
pages/ChecklistLandingPage.tsx:350  transition-all duration-700 hover:scale-[1.03] ... hover:-translate-y-2
```

**Por que importa**
`transition: all` faz o browser **observar TODAS as propriedades** para mudança, incluindo as que disparam layout (`height`, `top`, `margin`, `box-shadow`). Em cards de landing com hover composto (`scale` + `shadow` + `translate`), o `all` arrasta `box-shadow`/`border` (paint) junto do `transform` (composite), perdendo a aceleração de GPU. São **80+ ocorrências** na base legada que vão ser portadas na paridade.
**Correção (Next 16)**
Política de lint/review: **proibir `transition-all`**. Listar explicitamente: `transition-[transform,opacity]` para hovers de card; `transition-colors` para links/botões. Reservar `box-shadow` para transições raras e curtas, nunca combinado com `all`.

### F5 · `tailwind.config.ts:100-103,133` (legado) + `globals.css:181-184,152` (novo) · `pulse-lime` e `animate-pulse` — loops infinitos

**Snippet**

```css
@keyframes pulse-lime {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
} /* 2s infinite */
--animate-pulse-lime: pulse-lime 2s ease-in-out infinite; /* globals.css:152 */
```

**Por que importa**
`pulse-lime` anima **só `opacity`** (✅ compositável — bom), mas é **`infinite`**. Loop infinito = a camada nunca para de compor, mantém `will-change` implícito vivo e **drena bateria** em mobile. Pior: `animate-pulse` (Tailwind default) aparece **30+ vezes** no legado (badges, skeletons, dots) — muitos simultâneos numa tela = N camadas compondo para sempre. O `globals.css` novo já promove `pulse-lime` a token de animação, perpetuando o loop.
**Correção (Next 16)**
(1) Loops infinitos só em **1 elemento por viewport** (ex.: 1 badge "AO VIVO"), nunca em grids de skeleton — para skeleton use shimmer com `transform` ou aceite o pulse mas garanta que o reduced-motion (F3) o congele via `animation-iteration-count: 1`. (2) Para "chamar atenção", preferir pulso **finito** (3 ciclos) disparado por evento, não `infinite` decorativo.

### F6 · `src/index.css:640-645` + `WhiteboardItem.tsx:219` (legado) · `snap-bounce` com easing overshoot inline e sem reduced-motion

**Snippet**

```css
@keyframes snap-bounce { 0%{scale(1)} 40%{scale(1.04)} 70%{scale(0.98)} 100%{scale(1)} }
```

```tsx
isSnapped ? "animate-[snap-bounce_0.3s_cubic-bezier(0.34,1.56,0.64,1)]" : "";
```

**Por que importa**
Anima `transform: scale` (✅ compositável). Problemas: (a) easing **inline arbitrário** no className (`cubic-bezier(0.34,1.56,0.64,1)`) fora de qualquer token — inconsistência; (b) dispara a cada snap durante drag, e como é `animation` é congelado pelo reduced-motion global (ok), **mas** o efeito de bounce é exatamente o tipo de movimento que WCAG 2.3.3 pede para desligar — confirmar que o `animation-iteration-count:1` o neutraliza (neutraliza, pois é finito).
**Correção (Next 16)**
Mover o spring de snap para `motion/react` com `transition={{ type: "spring", stiffness: 320, damping: 30 }}` (já é o `transitions.spring` extraído — ver F9) + guarda `useReducedMotion()`. Tira o cubic-bezier mágico do className.

### F7 · `bell-ring` — `tailwind.config.ts:117-128` + `NotificationBell.tsx:119` (legado) · animação de rotação sem guard explícito

**Snippet**

```tsx
<Bell className={cn("h-5 w-5 origin-top", ringing && "animate-bell-ring")} />
```

**Por que importa**
`bell-ring` anima `transform: rotate` (✅ compositável, 0.8s, finito — tecnicamente são). É coberto pelo reduced-motion global **porque é `animation`** (F3 zera `animation-duration`). Sem ação crítica, mas é o tipo de motion que **deveria respeitar reduced-motion de forma intencional**, não por acidente da regra CSS. Hoje só funciona porque é keyframe; se virar framer-motion (spring), **escapa** da regra CSS.
**Correção (Next 16)**
Se mantido em CSS: ok, está coberto. Se migrar para `motion/react`: usar `useReducedMotion()` e não disparar o ring.

### F8 · `useScrollReveal.ts` + `.reveal`/`.scroll-reveal` (legado, motion principal da landing) · stagger por `transition-delay` fixo, sem teto e dependente de `transition` (não coberto por reduced-motion atual)

**Snippet**

```css
.reveal {
  transition:
    opacity 0.7s ease-out,
    transform 0.7s ease-out;
}
.reveal-delay-1 {
  delay: 0.1s;
}
... .reveal-delay-5 {
  delay: 0.5s;
} /* até 0.5s + 0.7s = ~1.2s total */
```

**Por que importa**
(a) O reveal usa **`transition`**, então o reduced-motion atual do `globals.css` (F3, só `animation`) **NÃO o desliga** — usuário sensível vê os 30px de slide. (b) Stagger por classes `delay-1..5` topa em ~**1.2s** de cascata total (0.5s delay + 0.7s dur) — no limite do aceitável (regra: >1.2s é lento). Acrescentar `delay-6+` estoura.
**Correção (Next 16)**
Com F3 corrigido (incluir `transition-duration` no reduced-motion), o reveal CSS passa a ser desligado corretamente. Manter o teto em 5 delays. No sistema novo, preferir um `<ScrollReveal>` único (framer-motion `whileInView` + `viewport:{once:true}` + `useReducedMotion`) em vez de propagar classes `.reveal-delay-N`.

---

## 🟢 Polish — inconsistências menores e ganhos fáceis

### F9 · Easing inconsistente entre fontes · CSS legado vs tokens designlang vs framer presets

**Evidência**

- `src/index.css`: `.scroll-reveal` usa `cubic-bezier(0.22, 1, 0.36, 1)`; `.reveal` usa `ease-out`; `slide-up` usa `cubic-bezier(0.16, 1, 0.3, 1)`; snap usa `cubic-bezier(0.34,1.56,0.64,1)`.
- `globals.css:150`: `--animate-fade-up` usa `cubic-bezier(0.22, 1, 0.36, 1)`.
- designlang tokens (`*-motion-tokens.json`): easing dominante **`cubic-bezier(0.4, 0, 0.2, 1)`** (57× na página) — o easing real do site live.
- framer presets (`*-motion.framer.js`): `custom1 = [0.4, 0, 0.2, 1]`, `spring = {stiffness:320, damping:30}`.
  **Por que importa**
  Quatro curvas diferentes para "entrada suave". O usuário percebe inconsistência de timing entre landing (CSS) e telas de academia (framer). O easing **canônico medido no site real** é `[0.4, 0, 0.2, 1]` (Material standard), não os `0.22,1,0.36,1` que o `globals.css` portou.
  **Correção (Next 16)**
  Definir **tokens únicos** e referenciá-los em CSS e em JS (ver bloco de recomendações). Decidir com o Marco: manter o `0.22,1,0.36,1` (mais "expo", premium) OU adotar o `0.4,0,0.2,1` extraído do live. Recomendo **um** par (ease padrão + spring) e nada fora dele.

### F10 · Duplicação de padrão fade · `fade-up`/`fade-in`/`scale-up` (Tailwind) vs `slideUp`/`fade`/`scaleIn` (framer presets) vs `.reveal` (CSS)

**Por que importa**
O mesmo "fade + sobe" existe em 3 implementações com durações divergentes: `fade-up` 0.7s, `.reveal` 0.7s, framer `slideUp` 0.3s, `fade-in` 0.4s. Sem fonte única, cada tela escolhe a sua.
**Correção (Next 16)**
Consolidar em primitivas: `<FadeUp>`, `<ScrollReveal>`, `<ScaleIn>` (framer) + utilitários CSS `animate-fade-up`/`animate-fade-in` para o que for puramente declarativo/above-the-fold. Uma duração por intenção.

### F11 · `useScrollReveal.ts` não checa `prefers-reduced-motion` no JS

**Por que importa**
O hook adiciona `.revealed` incondicionalmente. Depende 100% do CSS para respeitar a preferência. Quando o reveal virar framer-motion, a ausência de guard JS reaparece.
**Correção (Next 16)**
No `<ScrollReveal>` novo: `const reduce = useReducedMotion(); if (reduce) return <div>{children}</div>;` (render sem animar).

### F12 · Falta de tokens de motion como variáveis no `globals.css`

**Por que importa**
`globals.css` tem `--animate-fade-up/fade-in/pulse-lime` (bom começo) mas **não** expõe `--duration-*` nem `--ease-*` reutilizáveis para `transition`. Cada `transition-all duration-500` é um número solto.
**Correção (Next 16)**
Adicionar tokens de duração/easing no `@theme` (bloco abaixo) e usá-los tanto no Tailwind quanto nos presets framer.

---

## Recomendações para o sistema de motion (Next 16)

### 1. Regra de ouro: só `transform` + `opacity` (+ `filter` com cautela)

Animar exclusivamente propriedades compositáveis. **Banir** de animações/transitions: `width`, `height`, `top/left/right/bottom`, `margin`, `padding`, `border-width`, `box-shadow` (em loop). Onde a paridade exigir `box-shadow`/`border` no hover, isolar numa transição curta e separada do `transform` (nunca `transition-all`).

### 2. Tokens de duração/easing — fonte única (CSS + JS)

No `app/globals.css`, dentro de `@theme inline`:

```css
@theme inline {
  /* durations (alinhar aos tokens designlang: xs100/sm200/md300/lg500) */
  --duration-fast: 150ms;
  --duration-base: 300ms;
  --duration-slow: 500ms;
  /* easing canônico — DECIDIR: live=[0.4,0,0.2,1] vs premium=[0.22,1,0.36,1] */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-emphasized: cubic-bezier(0.22, 1, 0.36, 1);
}
```

E em TS um único `motion-tokens.ts` (derivado de `*-motion.framer.js`):

```ts
export const ease = { standard: [0.4, 0, 0.2, 1], emphasized: [0.22, 1, 0.36, 1] } as const;
export const duration = { fast: 0.15, base: 0.3, slow: 0.5 } as const;
export const spring = { type: "spring", stiffness: 320, damping: 30 } as const; // dentro do range saudável (50–200? ver nota)
```

> Nota de tuning: o spring extraído tem `stiffness: 320` — **acima** da faixa "natural" típica (50–200). É um spring rápido/responsivo, aceitável para micro-interações (snap, toggle), mas validar a sensação; para entradas de conteúdo, preferir tween com `ease.emphasized`.

### 3. Estratégia framer-motion: `LazyMotion` + `m` (code-split)

O app é grande e o motion JS será pontual (academia, whiteboard, micro-interações). Não importar o `motion` cheio em toda página.

```tsx
// app/providers/motion.tsx
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
export function MotionProvider({ children }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
// uso: import { m } from "motion/react"  →  <m.div .../>  (não <motion.div>)
```

- `LazyMotion + domAnimation` corta o bundle inicial (~feature split; `strict` bloqueia `motion.*` cheio acidental).
- `MotionConfig reducedMotion="user"` faz **todo** componente framer respeitar a preferência automaticamente — resolve F3/F11 no lado JS de uma vez.
- Sempre **named imports** (`import { m, useScroll } from "motion/react"`) — nunca `import * as`.
  > Context7 obrigatório antes de codar: confirmar API de `LazyMotion`/`domAnimation`/`MotionConfig` na versão de `motion` que entrar no Next 16 (a 12.x renomeou o pacote para `motion/react`; validar nomes na versão exata).

### 4. CSS vs framer — onde cada um vive

| Caso                                           | Ferramenta                                                                    | Razão                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Entrada above-the-fold, hovers de card, badges | **CSS** (keyframes/transition + tokens)                                       | Zero JS, sem custo de hidratação, LCP-safe                      |
| Scroll-reveal de seções                        | **framer `whileInView` + `viewport:{once:true}`** OU IntersectionObserver+CSS | `once:true` obrigatório; se CSS, F3 precisa cobrir `transition` |
| Spring/gesto (snap whiteboard, drag, toggle)   | **framer** (`m` + `spring` token)                                             | CSS não faz spring; precisa `useReducedMotion`                  |
| Accordion/list reorder/shared element          | **framer `layout`/`layoutId`**                                                | FLIP evita animar `height` (F1)                                 |

### 5. Scroll-reveal performático

- Hero/LCP: **nunca** `opacity:0` no candidato a LCP. Manter `opacity:1` e animar só `y`/`scale`/`filter:blur` (precedente recomendado pela skill: `HeroEntrance`). Hoje `fade-up`/`fade-in`/`.reveal` começam em `opacity:0` — **não envolver o H1/imagem hero do LCP** nessas classes.
- Seções: `whileInView` **sempre** com `viewport={{ once: true }}` (senão replay a cada scroll-back, F4 da skill). Guard `useReducedMotion`.
- Stagger: `staggerChildren` com **teto** `stagger × nFilhos ≤ 1.2s`. O preset extraído usa `0.075s` — com 16 filhos = 1.2s (no limite). Para listas maiores, cap em ~10 itens animados ou reduzir para 0.05s.

---

## 3–5 ações de maior impacto

1. **Endurecer o `prefers-reduced-motion` global** (`app/globals.css:194`) para incluir `transition-duration` e `scroll-behavior` — hoje deixa todo motion baseado em `transition` (incluindo a landing `.reveal`) escapando da preferência. **WCAG + 1 bloco CSS.** (F3)
2. **Adotar `LazyMotion` + `MotionConfig reducedMotion="user"`** como fundação do framer-motion no Next 16 — resolve a11y de spring/scroll no JS de uma vez e corta bundle. (rec. 3)
3. **Banir `transition-all` na política de paridade** e criar tokens de duração/easing únicos — neutraliza ~80 ocorrências legadas que arrastam `box-shadow`/`border` para fora da GPU e elimina as 4 curvas de easing divergentes. (F4, F9, F12)
4. **Trocar `selection-pulse` (box-shadow infinito) por overlay com `opacity`** e migrar `snap-bounce` para spring framer com guard — tira paint-loop do whiteboard, o componente mais pesado. (F2, F6)
5. **Política de loop infinito**: `pulse-lime`/`animate-pulse` só 1 por viewport, nunca em grids de skeleton; preferir pulso finito por evento. (F5)

---

## Veredito

A superfície JS-motion do projeto novo está **limpa por ser vazia** — é o momento ideal de instituir o sistema certo antes da paridade. O risco real está em **portar verbatim** o legado CSS-first, que carrega 3 problemas estruturais: reduced-motion incompleto, `transition-all` epidêmico e dois paint/box-shadow loops no whiteboard. **Necessária uma decisão de fundação** (tokens únicos + `LazyMotion`/`MotionConfig` + endurecer reduced-motion) **antes de adicionar qualquer motion novo.** Nenhum keyframe novo do `globals.css` é compositavelmente perigoso (todos são `opacity`/`transform`) — o cuidado é com loops infinitos e com o que a paridade vai trazer.
