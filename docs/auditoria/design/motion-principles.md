# Motion — princípios e direção · Nuckturp QG

> Diagnóstico de **motion como decisão estética** (não auditoria técnica de performance — essa é a `motion-audit`). Produzido com a skill `design-motion-principles` nos modos **AUDIT** (revisar o motion atual do app Vite) + **CREATE** (direção para a reescrita Next.js, Fase 5).
>
> **Lente weighting confirmada para Nuckturp:** Primária **Jhey Tompkins** (experimentação criativa — é o produto onde liberdade visual cabe) · Secundária **Emil Kowalski** (restraint no app denso e nas ações de alta frequência) · Seletiva **Jakub Krehel** (polish de produção nos enters/exits que ficam).
>
> **Tensão central a resolver:** o branding prega "sobriedade gamer, sem animações excessivas". Tompkins puro brigaria com isso. A direção abaixo dá ao Tompkins **um único palco** (o D20) e deixa o resto do app sob Kowalski/Jakub. Isso é deliberado, não um meio-termo morno.

---

## 1. Filosofia de motion recomendada

A regra de ouro vale para tudo, inclusive no Tompkins: _"a melhor animação é a que passa despercebida"_. A exceção (onde delight É o objetivo) o Nuckturp **compra de propósito e só uma vez**.

### Mapa: onde cada lente manda

| Zona do produto                                                                                         | Frequência de uso | Lente                        | Por quê                                                                                                                           |
| ------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **App denso** (whiteboard, editor, sidebar, tabelas, dashboard do mestre)                               | Centenas/dia      | **Emil — restraint**         | Ferramenta de trabalho. O mestre está no meio de uma sessão de RPG; motion aqui é fricção. Instantâneo ou ≤180ms.                 |
| **Ações de teclado** (atalhos do editor/whiteboard)                                                     | Constante         | **Emil — nunca animar**      | Regra dura: keyboard-initiated não anima.                                                                                         |
| **Transições de estado que ficam** (modais, popovers, toasts, notificação, troca de ícone, route enter) | Diária            | **Jakub — polish invisível** | Enter com opacity+translateY+blur sutil; exit mais sutil que o enter; spring `bounce: 0`. O usuário sente "liso", não "animação". |
| **Landing / onboarding / momentos raros** (hero, primeira visita, conquista da Academy)                 | Mensal/raro       | **Jhey — expressão**         | Aqui delight é bem-vindo. É a vitrine, não a ferramenta.                                                                          |
| **O momento de marca** (D20)                                                                            | Raro, decorativo  | **Jhey — palco único**       | O "could this become?" do Tompkins, gastado num só lugar (ver §3).                                                                |

**Princípio de governo:** o app inteiro é Kowalski/Jakub por padrão. Tompkins é _opt-in explícito_, restrito à landing/onboarding e a **um** signature moment. Isso preserva a "sobriedade gamer" — o RPG já é o espetáculo; a UI é o tabuleiro, não os dados.

---

## 2. Auditoria do motion atual (app Vite)

Fonte: `docs/inventario/ui-componentes.md` (§ keyframes), `Nuckturp_2.1/.../src/index.css`, tokens extraídos em `designlang/.../nuckturp-com-br-motion-tokens.json`. Motion atual é **majoritariamente CSS** (keyframes Tailwind + `.reveal`/IntersectionObserver); `framer-motion` está instalado mas usado em só 2 componentes da Academy. A landing **não** usa framer-motion.

### 🟢 Manter (faz sentido — funcional ou polish legítimo)

| Item                                                                     | Veredito               | Razão                                                                                                                                                                                                      |
| ------------------------------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fade-up` (opacity+translateY 30px, 0.7s, `cubic-bezier(0.22,1,0.36,1)`) | **Manter, ajustar**    | Recipe Jakub legítimo (enter com easing expo). 30px é um pouco longo e 0.7s é lento para o que é — encurtar para ~18-20px / 0.45-0.5s (ver §4). Falta blur — adicionar opcional.                           |
| `fade-in` (opacity+translateY 8px, 0.4s)                                 | **Manter**             | Sutil, curto, correto. É o enter "discreto" ideal para o app denso.                                                                                                                                        |
| `page-enter` (opacity+translateY 6px, 0.25s)                             | **Manter**             | Transição de rota curta e funcional. Kowalski aprovaria (≤300ms, deslocamento mínimo).                                                                                                                     |
| `slide-up` (translateY 40px, 0.35s, expo `cubic-bezier(0.16,1,0.3,1)`)   | **Manter, vigiar**     | Easing forte e bom. 40px é bastante deslocamento — ok para entrada de painel/sheet, **não** para conteúdo de lista. Reservar para containers, não itens.                                                   |
| `.reveal`/`.scroll-reveal` via IntersectionObserver                      | **Manter o mecanismo** | IntersectionObserver é a fallback correta para scroll-driven (cookbook §14). Migrar para `next/font` + classes equivalentes; **não** trocar por framer-motion `whileInView` em massa (seria stagger-spam). |
| `:active scale(0.97)` em botões (se presente nos componentes shadcn)     | **Manter**             | Feedback tátil Kowalski, recipe §10.                                                                                                                                                                       |

### 🟡 Decorativo gratuito — cortar ou reduzir

| Item                                                               | Veredito                                                   | Razão (anti-checklist)                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`pulse-lime`** (opacity 1↔0.6, **2s infinite**) no badge do hero | **Cortar do app; tolerar 1× na landing com glow estático** | Cai direto na categoria **"Pulsing indicators"** do anti-checklist — heurística: _flag any instance_. Loop infinito de opacity num badge é o fingerprint nº1 de AI-slop e cansa em telas de trabalho. Substituir por **glow estático** (`text-glow-lime` já existe no `globals.css`) ou um único shimmer na primeira pintura. Nunca em elemento do app denso. |
| **`selection-pulse`** (box-shadow loop no whiteboard)              | **Substituir por estado estático**                         | Outro pulse infinito. Seleção não precisa pulsar — um `box-shadow`/`outline` estático no estado selecionado comunica igual, sem loop. Loop contínuo num editor onde o usuário fica horas = fadiga vestibular leve + slop.                                                                                                                                     |
| **`bell-ring`** (rotação amortecida 0.8s no `NotificationBell`)    | **Manter só como trigger pontual, nunca em loop**          | Aceitável **se** dispara uma vez na chegada de notificação (rare event = delight ok, Emil). Vira slop se ficar em loop ou tocar a cada render. Garantir: dispara on-new-notification, uma iteração, respeita reduced-motion.                                                                                                                                  |
| **`scale-up`** (opacity+scale 0.95→1, 0.5s)                        | **Consolidar**                                             | Não é ruim, mas é redundante com `fade-up`/`fade-in`. Manter **uma** família de enter, não três. Se sobreviver, é o enter de card/modal específico — não default de página (senão vira "uniform-fade-in-on-every-element").                                                                                                                                   |
| **`snap-bounce`** (scale 1→1.04→0.98→1 no snap-to-grid)            | **Manter — é exceção legítima**                            | Bounce em ação de produtividade normalmente é flag (anti-checklist "bouncy-springs-on-utility-actions"). **Mas** snap-to-grid é feedback físico de uma ação direta e infrequente — o overshoot comunica "encaixou". Manter curto (≤200ms) e com reduced-motion. É o tipo de micro-delight que o whiteboard pode ter.                                          |

### 🔴 Gaps de motion (mudança de UI sem transição)

| Gap                                                                           | Risco                       | Fix                                                                                                                                                                                                |
| ----------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`prefers-reduced-motion` ausente no `index.css` antigo**                    | Acessibilidade — vestibular | **Já resolvido no novo** `app/globals.css` (bloco `@media` presente). Manter e **expandir** para incluir `transition-duration` e `scroll-behavior` (o bloco atual cobre só `animation-*`; ver §4). |
| Modais/popovers/toasts provavelmente aparecem via Radix sem enter/exit custom | Snap visual                 | Na Fase 5, padronizar enter/exit Jakub via Radix `data-state` + `--radix-*-transform-origin` (origin-aware, Emil §13).                                                                             |
| Troca de ícone (copy→check, loading→done) instantânea                         | "Some" sem o usuário ver    | Recipe Jakub §5 (opacity+scale+blur) onde houver swap contextual.                                                                                                                                  |

> **Veredito geral:** o motion atual é ~70% saudável (enters CSS sóbrios, IntersectionObserver correto). O problema é o cluster de **3 loops infinitos** (`pulse-lime`, `selection-pulse`, e o uso potencial de `bell-ring`) — exatamente o sintoma que o branding "sem animações excessivas" quer evitar. Matar os loops já alinha o produto ao próprio tom.

---

## 3. O momento memorável — o D20 (proposta concreta)

**Contexto:** `FloatingDice` é citado em `design-system.md` e `branding.md` mas **não existe no código**. Em vez de tratar como bug de doc, **trate como vaga aberta**: este é o lugar para gastar o Tompkins. Um D20 (dado de 20 faces, ícone do RPG de mesa) é o único elemento da marca que merece motion expressivo.

### Decisão estética

- **Onde:** hero da landing + estado vazio do dashboard ("nenhuma campanha ainda — role os dados") + ao concluir um marco na Academy. **Em nenhum lugar do app denso.**
- **O que NÃO fazer:** D20 girando em loop infinito no hero (vira `pulse-lime` versão 3D — slop). O dado **descansa** e só reage a evento.
- **O que fazer:** D20 em **idle sutil** (flutuação lenta de ±4px, respiração de 6-8s — quase imperceptível, Jakub) que, **on-hover/on-click/on-load**, dá **uma rolada física** (tumble 3D + assenta numa face) e para. Rolar é raro → delight é permitido (frequency gate de Emil).

### Implementação recomendada (CSS-first, Tompkins puro)

Seguindo o flavor que a stack pede (o motion do app é CSS; framer-motion fica restrito). Recipe combina cookbook §7 (`@property` para path curvo), §8 ("think in cubes" — D20 como SVG/CSS faces) e §2 (`linear()` para o assentar com micro-overshoot).

```css
/* D20 — signature moment. Idle quase imperceptível + tumble on-demand. */
@property --d20-rot-x {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}
@property --d20-rot-y {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

.d20 {
  transform-style: preserve-3d;
  /* idle: respiração lenta, ~imperceptível (lente Jakub) */
  animation: d20-idle 7s ease-in-out infinite;
  will-change: transform; /* targeted, não global */
}

@keyframes d20-idle {
  0%,
  100% {
    transform: translateY(0) rotateX(0deg);
  }
  50% {
    transform: translateY(-4px) rotateX(3deg);
  }
}

/* tumble: dispara via classe .is-rolling (estado, não keyframe puro —
   permite re-trigger limpo, recipe Emil §11). Assenta com micro-overshoot. */
.d20.is-rolling {
  animation: d20-roll 900ms var(--ease-settle) forwards;
}

@keyframes d20-roll {
  0% {
    transform: rotateX(var(--d20-rot-x)) rotateY(var(--d20-rot-y));
  }
  100% {
    transform: rotateX(720deg) rotateY(540deg);
  } /* assenta numa face fixa */
}

/* easing de assentar com micro-bounce (gerado em linear-easing-generator) */
:root {
  --ease-settle: linear(0, 0.063, 0.25, 0.563, 1, 0.891, 0.848, 0.85, 0.891, 1, 0.973, 0.953, 1);
}

/* GUARD de acessibilidade — não-negociável.
   D20 é puramente decorativo → pode ser removido por completo. */
@media (prefers-reduced-motion: reduce) {
  .d20 {
    animation: none;
  } /* sem idle, sem flutuação */
  .d20.is-rolling {
    animation: none;
  } /* clique apenas troca a face exibida, sem tumble */
}
```

```ts
// trigger: rolada é evento raro → delight permitido. Re-trigger limpo.
function rollD20(el: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setFaceInstant(el); // troca o número exibido, zero motion
    return;
  }
  el.classList.remove("is-rolling");
  void el.offsetWidth; // reflow força reinício da animação
  el.classList.add("is-rolling");
}
```

**Por que isso é "sobriedade gamer" e não slop:** um único elemento, motion expressivo só sob ação do usuário, idle abaixo do limiar de percepção, e desligamento total em reduced-motion. O resto do app continua mudo. É o dado que rola — não a interface inteira tremendo.

> **Alternativa de stack:** se a Fase 5 já tiver `motion/react` no bundle da landing, o tumble pode ser um spring (`useSpring`, stiffness ~300 / damping ~22) para interrupção nativa ao clicar repetido. CSS-first é o default por alinhar com o resto do motion do app e zero custo de JS na landing (SEO/perf).

---

## 4. Tokens de motion + catálogo recomendado (Fase 5)

Os tokens extraídos do site atual (`nuckturp-com-br-motion-tokens.json`) trazem durações `100/200/300/500ms`, easing `cubic-bezier(0.4,0,0.2,1)` (Material standard) e `ease`, sem springs, `scrollLinked: true`. Boa base — mas o `ease` cru deve ser banido (Emil: built-in easing "lacks strength") e os easings expo já presentes no `index.css` (`0.22,1,0.36,1` e `0.16,1,0.3,1`) são superiores e devem virar token.

### Tokens propostos (`@theme inline` no `globals.css`)

```css
@theme inline {
  /* ── Durações (alinhadas aos tokens extraídos + Kowalski) ── */
  --duration-instant: 100ms; /* feedback de toque, troca de ícone */
  --duration-fast: 180ms; /* default do app denso — Emil sweet spot */
  --duration-base: 250ms; /* enter/exit padrão (Jakub) */
  --duration-slow: 450ms; /* enter de hero/landing (Jhey/Jakub) */
  --duration-d20: 900ms; /* exclusivo do signature moment */

  /* ── Easings (expo do app atual viram token; banir `ease` cru) ── */
  --ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1); /* enters — chega e assenta */
  --ease-out-strong: cubic-bezier(0.16, 1, 0.3, 1); /* slide de painel/sheet */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1); /* state-change visível (token extraído) */
  --ease-settle: linear(
    0,
    0.063,
    0.25,
    0.563,
    1,
    0.891,
    0.848,
    0.85,
    0.891,
    1,
    0.973,
    0.953,
    1
  ); /* só D20 */

  /* enters existentes — re-tunados (fade-up: 0.7s→0.5s, 30px→18px) */
  --animate-fade-up: fade-up 0.5s var(--ease-out-expo) both;
  --animate-fade-in: fade-in 0.25s var(--ease-out-expo) both;
  --animate-page-enter: page-enter 0.2s var(--ease-out-expo) both;
}
```

### Catálogo recomendado para a nova versão

| Animação                        | Uso                                 | Duração / easing                         | Lente | Notas                                                     |
| ------------------------------- | ----------------------------------- | ---------------------------------------- | ----- | --------------------------------------------------------- |
| `fade-in`                       | enter padrão do app (cards, blocos) | `--duration-base` / `--ease-out-expo`    | Jakub | translateY 8px. O default.                                |
| `fade-up`                       | enter de seção da landing           | `--duration-slow` / `--ease-out-expo`    | Jakub | translateY 18px (era 30) + blur(4px) opcional.            |
| `page-enter`                    | transição de rota (App Router)      | `--duration-fast` / `--ease-out-expo`    | Emil  | curto, deslocamento mínimo.                               |
| `slide-up`                      | sheet/painel/drawer entrando        | `--duration-base` / `--ease-out-strong`  | Jakub | só containers, nunca itens de lista.                      |
| `icon-swap`                     | copy→check, loading→done            | `--duration-instant` / spring `bounce:0` | Jakub | opacity+scale+blur (cookbook §5). **Novo.**               |
| `press`                         | `:active` em botões                 | `100ms`                                  | Emil  | `scale(0.97)`.                                            |
| `snap-bounce`                   | snap-to-grid no whiteboard          | `≤200ms`                                 | Jhey  | exceção legítima; manter overshoot leve.                  |
| `bell-ring`                     | chegada de notificação              | `0.8s`, 1 iteração                       | Emil  | trigger pontual, **nunca** loop.                          |
| `d20-idle` + `d20-roll`         | signature moment                    | `7s` idle / `--duration-d20` roll        | Jhey  | ver §3. Único elemento expressivo.                        |
| `reveal` (IntersectionObserver) | scroll-reveal da landing            | `--duration-slow` / `--ease-out-expo`    | Jakub | manter mecanismo IO; delays escalonados só na landing.    |
| ~~`pulse-lime`~~                | —                                   | **REMOVER**                              | —     | trocar por glow estático (`text-glow-lime`).              |
| ~~`selection-pulse`~~           | —                                   | **REMOVER**                              | —     | trocar por outline/shadow estático no estado selecionado. |

### Endurecer o guard de reduced-motion

O bloco atual no `globals.css` cobre só `animation-*`. Expandir:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important; /* + */
    scroll-behavior: auto !important; /* + */
  }
}
```

---

## 5. Ações priorizadas

1. **🔴 Matar os loops infinitos.** Remover `pulse-lime` e `selection-pulse` do catálogo; substituir por glow/outline estáticos. Garantir que `bell-ring` só dispara on-event, 1 iteração. _Maior ganho de alinhamento ao branding "sem excessos", custo mínimo._
2. **🔴 Endurecer o `prefers-reduced-motion`** no `globals.css` (adicionar `transition-duration` + `scroll-behavior`). Pré-requisito de acessibilidade antes de qualquer motion novo da Fase 5.
3. **🟡 Tokenizar durações/easings** (§4) no `@theme inline` e re-tunar `fade-up` (0.7s→0.5s, 30px→18px). Consolidar `scale-up`/`fade-up`/`fade-in` numa única família de enter.
4. **🟢 Construir o D20** como signature moment (§3) — CSS-first, idle imperceptível + tumble on-demand, guard de reduced-motion que remove tudo. Materializa o `FloatingDice` fantasma e dá ao Tompkins seu palco único.
5. **🟢 Padronizar enter/exit de overlays** (modal/popover/toast) via Radix `data-state` + origin-aware (Jakub/Emil) na Fase 5, fechando os gaps de "snap" do app atual.

---

> **Próximos passos:** (1) decidir com o Marco se o D20 entra como escopo da Fase 5 ou vira spike próprio; (2) se aprovado, rodar `motion-audit` (auditoria _técnica_ de performance) sobre a implementação real depois de codar — este doc é só a decisão estética.
