# Diagnóstico de Design consolidado — Nuckturp QG (Onda D)

> Síntese de 6 lentes independentes. Docs-fonte em `docs/auditoria/design/`:
> [taste.md](design/taste.md) · [impeccable.md](design/impeccable.md) · [ui-ux.md](design/ui-ux.md) · [motion-principles.md](design/motion-principles.md) · [motion-audit.md](design/motion-audit.md) · [humanizer-copy.md](design/humanizer-copy.md)
> Escopo: site no ar (via designlang) + código antigo → spec para a versão nova. Data: 2026-05-29.

## 1. Veredito

O design **tem alma real** — não é AI-slop genérico. Assinatura: hero assimétrico left-aligned, Space Grotesk 900 com tracking fechado, paleta disciplinada (1 lime ácido vivo + violet pontual sobre Noir Void), `<strong>`/`<em>` coloridos por marca, D20 paramétrico. Score impeccable ~14/20 ("Good"). **Isso deve ser preservado verbatim, não "higienizado".**

A ameaça nº 1 não é o app antigo — **é a nova versão regredir para o template genérico.** O placeholder que construí (`app/page.tsx`) já introduziu 3 dos tells que as próprias skills banem.

## 2. Convergências (onde 6 lentes concordam)

1. 🔴 **A `page.tsx` nova regrediu** (taste + impeccable + humanizer): gradient-text no H1 (o site real usa cor sólida + glow), hero **centralizado** (o real é left-aligned/assimétrico), 2 glow-blobs `blur-[120px]`, e copy sem pulso ("hub" joga fora o ativo "QG"; trinca de verbos paralela; em-dash). **Corrigir já.**
2. **Preservar o DNA distintivo** — assimetria, Space Grotesk 900, disciplina de cor, D20. Não sanitizar.
3. **Unificar o sistema ANTES de portar 270+ componentes** (impeccable + ui-ux): botão canônico (hoje 4 variantes divergentes), sistema de estados (empty/loading/error), escala de borda/elevação/raio em 3 degraus, 1 sistema de toast (hoje sonner + shadcn coexistem).
4. **App mobile-first tem gaps** (ui-ux): falta bottom-nav persistente (zona do polegar; `pb-16` já reservado e vazio), alvos de toque a 36px (< 44px), ícones sem `aria-label`, `muted-foreground/40–60` falha contraste AA no dark.
5. **Disciplina de motion** (motion-principles + motion-audit): matar loops infinitos (`pulse-lime`, `selection-pulse`, `bell-ring` em loop); só `transform`/`opacity`; o bloco `prefers-reduced-motion` do `globals.css` está **incompleto** (cobre `animation`, deixa `transition` e `scroll-behavior` escaparem — WCAG 2.3.3).
6. **Voz = mestre de RPG, 2ª pessoa** (humanizer): tratar o usuário como "Mestre", vocabulário de mesa sem explicar, headline provocadora, sentence case. Eliminar inflação épica e tiques AI.

## 3. Tensão reconciliada (a decisão estética central)

As lentes **discordam por design**: taste/Tompkins pede ousadia/experimentação; impeccable/Kowalski e o branding ("sobriedade gamer") pedem restraint. **Síntese (as próprias skills convergiram nela):**

> **Concentrar a ousadia em UM ativo proprietário — o D20 — e conter o resto.** Landing = mais latitude (Tompkins, VARIANCE 6-7, MOTION 5). App/cockpit = restraint (Kowalski, VARIANCE 4-5, MOTION 3, DENSITY 6-7). Regra de ouro: **1 glow funcional por viewport**, card só com elevação funcional, zero loop infinito decorativo. O "momento memorável" não são glows espalhados — é o D20.

## 4. Plano de ação priorizado

**P0 — imediato (nosso código, baixo risco, alto valor):**

- Reescrever `app/page.tsx`: H1 cor sólida + `text-glow-lime` (sem gradient-text), hero assimétrico left-aligned, remover/reduzir glow-blobs, **copy reescrita** (2ª pessoa, "Mestre", recuperar "QG", sem em-dash/trinca robótica — reescritas prontas em `humanizer-copy.md`).
- Corrigir `globals.css`: bloco `prefers-reduced-motion` cobrindo `transition` + `scroll-behavior` (fix WCAG, 1 bloco).

**P1 — fundação de sistema (antes de portar features):**

- Botão canônico + sistema de estados (empty/loading/error) + escala borda/elevação/raio (3 degraus) + 1 sistema de toast.
- `motion-tokens` único (CSS+JS): durações + easing canônico, só transform/opacity.
- Casca de navegação mobile: **bottom-nav persistente** (thumb zone), toque ≥44px, `aria-label` nos ícones, contraste AA (revisar `muted-foreground`).

**P2 — Fase 5 (motion & polish):**

- **D20 como o momento Tompkins**: materializar o `FloatingDice` fantasma — idle imperceptível + tumble físico on-demand (CSS `@property` + `linear()`), guard de reduced-motion. (Decidir: Fase 5 normal ou spike próprio.)
- `LazyMotion` + `MotionConfig reducedMotion="user"`; scroll-reveal com `viewport:{once:true}` + `useReducedMotion`; matar `transition: all` (~80 ocorrências no legado).

## 5. Decisões abertas (Marco)

- **E1 · Easing canônico:** o site no ar usa `[0.4, 0, 0.2, 1]` (Material standard); portei `[0.22, 1, 0.36, 1]` (ease-out-expo "premium"). Qual vira o token único?
- **E2 · Fonte de corpo:** manter **Inter**, ou spike **Geist** + uma **mono** para números de rolagem/dados?
- **E3 · D20 animado:** Fase 5 normal, ou spike próprio antes (é o diferencial de marca)?
- **E4 · Bottom-nav:** quais 4-5 jornadas merecem slot fixo (idealmente validar com analytics do admin).
- **E5:** aplico os **P0** já na nossa base agora?

## 6. Nota sobre os artefatos

O designlang capturou o **tema light** do site (lime oliva, fundo creme) — a produção é **dark-first** (lime `#C4FF4D` sobre void `#1A1A1A`). Os tokens dark já portados em `app/globals.css` estão corretos; ao usar os artefatos designlang, lembrar dessa inversão.
