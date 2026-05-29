# Auditoria de Design — QG do Mestre (Nuckturp)

> Lente: skill **impeccable**, modo **extract/audit**. Foco em frontend distintivo e production-grade.
> Fontes: artefatos designlang (`docs/inventario/designlang/design-extract-output/`), 4 screenshots-chave (`full-page`, `card-default-xl-0`, `card-default-sm-0`, `button-outline-medium-2`), `docs/inventario/ui-componentes.md`, código antigo (`Nuckturp_2.1/.../src/index.css` + `landing/LandingHeroSection.tsx`), código novo (`app/{globals.css,layout.tsx,page.tsx}`).
> Data: 2026-05-29. Projeto antigo é READ-ONLY (referência de paridade).

## Cena física (theme não é default)

O usuário é um mestre de RPG, em casa, à noite, à luz baixa do quarto/escritório, preparando uma sessão ou anotando no meio dela enquanto a mesa rola. Tela longa exposta, foco prolongado, registro contínuo. **O dark-first não é "ferramenta fica legal escura": é a ambiência correta do uso** (noite, imersão, fadiga ocular num app de texto denso). O `#1A1A1A` quase-neutro + lime elétrico está coerente com a cena. Mantida a decisão.

---

## Veredito Anti-Patterns (começar por aqui)

**Parcial — não passa limpo, mas está longe da "AI slop gallery".** O sistema visual tem uma assinatura real (lime ácido `#beff4d` sobre noir + violeta vaporwave como segunda voz, display Space Grotesk pesadíssimo); isso não é o reflexo de treino "RPG → marrom pergaminho/serifa medieval", então o **first-order reflex foi evitado de propósito**. Mas há tells concretos a eliminar. Lista honesta:

- **Gradient text no hero novo (BAN absoluto).** `app/page.tsx` linhas 27-31: `<span className="bg-gradient-nuckturp bg-clip-text text-transparent">Mestre</span>`. É exatamente o `background-clip: text` + gradiente que a skill proíbe. Curiosamente o app **antigo não fazia isso** no H1 — usava `text-glow-lime` (cor sólida + glow), que é a escolha distintiva. O port introduziu o tell que o original não tinha. **Regressão de craft.**
- **Glassmorphism decorativo.** Hero antigo (`LandingHeroSection.tsx` l.108): `bg-card/50 backdrop-blur-xl ... rotate-2`. designlang confirma `backdrop-blur-xl` no header e no card flutuante. É o "glass card + rotate + float tag" que assina época (2022-2023). Usar com parcimônia ou aposentar.
- **Identical card grid.** `card-default-sm-0.png` mostra o padrão clássico: grade de cards iguais, cada um ícone-quadrado + heading + parágrafo de 3 linhas, repetido 9× ("9 ferramentas"). designlang detectou "card — 9 instances, 1 variant". É a grade-clichê que a skill marca. O conteúdo (9 ferramentas) é legítimo, mas a **expressão** é template.
- **Side-stripe borders (BAN absoluto) no conteúdo editorial.** `index.css` antigo: `.notion-editor blockquote` e `.blog-content blockquote` usam `border-left: 3px solid hsl(var(--primary)/.5)`. Blockquote com barra lateral colorida é o tell editorial. Reescrever no port (full border + tint, ou aspas tipográficas).
- **`transition: all`** aparece no designlang (l.320). Tell de implementação preguiçosa (anima layout + paint indiscriminadamente).

O que **salva** do veredito "feito por IA sem dúvida": a paleta é uma aposta (lime tóxico não é seguro), a tipografia tem contraste de personalidade real (Space Grotesk black 900 no display vs Inter no corpo), e os micro-componentes de marca (`DiceIcon` paramétrico d4–d100, `pulse-lime`, `bell-ring`, scrollbar violeta) são autorais. Isso é capital distintivo a preservar.

---

## 1. O que torna (ou não) este design distintivo

### Distintivo — preservar verbatim

- **Sistema de cor com aposta.** Lime ácido `82 100% 65%` (#beff4d) como primária sobre noir `0 0% 10%` é a decisão de marca. 16.07:1 de contraste lime-sobre-preto (AAA). Violeta vaporwave `268 100% 77%` como segunda voz semântica (`<em>`, scrollbar, divisores) é incomum e memorável. **Não diluir para "verde corporativo".**
- **Tipografia bicéfala com intenção.** Display Space Grotesk até weight 900 / line-height 0.95 / tracking negativo (o hero "Pare de Improvisar" em black tighter é a assinatura) + corpo Inter. O contraste de família + peso é o que separa de template flat. O port já porta isso (`layout.tsx` via `next/font`).
- **Léxico de marca em microdetalhe.** `<strong>` = lime peso 650, `<em>` = violeta itálico (aplicado global em `globals.css` l.168-169 e no editor/blog). É um detalhe de craft que a maioria dos apps não tem. Mantido no novo. Bom.
- **D20 como símbolo + componente paramétrico.** `DiceIcons.tsx` (d4/d6/d8/d10/d12/d20/d100 com presets de cor). Identidade própria, não stock icon.
- **Glow lime como linguagem de elevação.** Sombras de marca (`rgba(132,255,0,0.2) 0 0 20px` no CTA, hover sobe pra 0.4) substituem drop-shadow genérico. designlang classificou material como `flat` + `soft shadow`; o glow é o que dá profundidade sem cair em neumorfismo.

### Não-distintivo — risco de cair em template

- **Cards.** Hoje são `bg-card border rounded-2xl` homogêneos (23 instâncias, raio 16px). O `card-default-xl-0.png` (o card "hero" com a foto de miniaturas + map + dados sobre a mesa, tags flutuantes lime/violet rotacionadas) é **muito mais memorável** que a grade de features. A assinatura está no card rico; a grade de 9 features é o elo fraco.
- **Botões.** designlang achou **4 variantes de botão divergentes** no mesmo fluxo (raios 12px e 9999px misturados, pesos 500 e 700, paddings 12/20/40px). Inconsistência de vocabulário = tell de produto não-curado (ver §3).
- **Densidade tipográfica do designlang vs. tokens reais.** O designlang leu `body 12px / h1 96px` (range gritante) porque inspecionou DOM compilado; os tokens-fonte são saudáveis. Atenção: não tratar o output do designlang como spec — ele reflete o build, não a intenção.

---

## 2. Sinais de "AI slop" e mediocridade de produção a eliminar

Por prioridade de dano à percepção:

1. **[P1] Gradient text no H1 do app novo** (`app/page.tsx:27-31`). BAN absoluto + regressão vs. original. **Trocar por cor sólida lime + `text-glow-lime`** (utility já portada em `globals.css:190`). O glow é a assinatura; o gradient-clip é o clichê.
2. **[P1] Blockquote com `border-left` colorido** (`index.css` antigo, editor + blog). BAN absoluto. No port: full border 1px + `bg-card/40` + tint, ou marca de aspas em Space Grotesk. Atinge editor (TipTap) e blog — alto volume de páginas SEO.
3. **[P2] Glassmorphism decorativo** (header `backdrop-blur-xl`, card flutuante `bg-card/50 backdrop-blur-xl rotate-2`). Manter blur só onde há sobreposição real de conteúdo (header sticky sobre scroll); aposentar no card decorativo.
4. **[P2] Grade de cards idênticos** ("9 ferramentas. Zero caos."). Quebrar o ritmo: variar tamanho/peso (1 card mestre + satélites, ou bento assimétrico), não 3×3 uniforme. O conteúdo é forte; a forma é genérica.
5. **[P2] `transition: all`** (designlang l.320). Trocar por transições de propriedade explícita (`color, background-color, box-shadow`). Já há precedente bom no `index.css` (transições nomeadas no editor).
6. **[P3] Dois sistemas de toast coexistindo** (`sonner` + `toast/toaster/use-toast`). Não é visual, mas é dívida de sistema que vaza em inconsistência de feedback. Consolidar no port.
7. **[P3] `48 !important` + 90% de CSS não usado + 2410 declarações duplicadas** (designlang "Issues"). Herança do build Vite/Lovable. O port em Tailwind v4 + tokens limpos já resolve a maior parte; medir de novo após Fase 0.

---

## 3. Oportunidades de craft de alto nível

Detalhes que separam "funciona" de "impecável". Ordenados por alavancagem.

### Estados de componente (a maior lacuna de produção)

O register é **product** (app autenticado, denso): a barra é "familiaridade ganha". Hoje os botões têm **hover/focus** documentados (designlang capturou focus ring duplo bonito: `0 0 0 1.84px noir + 0 0 0 3.68px lime/.92`), mas falta padronizar **disabled / loading / active / selected** em todo o vocabulário. Especificar o set completo (default→hover→focus→active→disabled→loading→error) uma vez, como tokens de estado, e aplicar a 100% dos interativos. Esse focus ring lime-sobre-noir é uma assinatura — promover a token e reusar.

### Unificar o vocabulário de botão

designlang achou 4 variantes divergentes. Definir, no design system do port: **um raio por intenção** (ex.: 12px para ações em superfície, full-pill só para chips/tags), **um peso de label** (500 para secundário, 700 só no CTA primário lime), **paddings em escala** (não 12/20/40 ad hoc). O CVA do shadcn (`button.tsx`) é o lugar; portar com variantes explícitas, não copiar as 4 instâncias soltas.

### Bordas e elevação como sistema, não acaso

- designlang viu `border #383838` em **595 elementos** com opacidades ad hoc (`/.2 /.3 /.4 /.6`). Padronizar 2-3 níveis: borda-sutil (`border/40`), borda-padrão (`border`), borda-foco (lime). Hoje a opacidade é arbitrária por componente.
- Elevação: codificar 3 degraus (flat / card-glow-sutil / hover-glow) em vez de 6 box-shadows quase-iguais que o designlang listou. O glow lime é o degrau premium — reservar para CTA e estados ativos, não espalhar.

### Raio consistente

Tokens já bons (`--radius .75rem` + escala sm/md/lg/xl no `globals.css:145`). designlang viu 12/16/24px + full coexistindo em cards. Mapear cada superfície a um degrau da escala e remover raios soltos (o `rounded-2xl`/`rounded-3xl` ad hoc no hero).

### Motion: state-driven, sem orquestração de página em superfícies de produto

- **Landing (brand)**: o `.reveal` + IntersectionObserver staggered é apropriado e barato. Manter. A curva `cubic-bezier(0.22,1,0.36,1)` (ease-out-quint) já bate a regra da skill (ease-out exponencial, sem bounce). Bom.
- **App (product)**: a regra é 150–250ms, motion = estado, **sem sequência de page-load**. `page-enter` 0.25s está ok. Garantir que `fade-up 0.7s` da landing **não** vaze para telas autenticadas (0.7s é longo demais para fluxo de trabalho). Já há `prefers-reduced-motion` no `globals.css:194` — manter e estender ao catálogo da Fase 5.
- `bell-ring`, `pulse-lime`, `selection-pulse`, `snap-bounce` são autorais e ligados a estado real (notificação, badge, seleção no whiteboard). Preservar; auditar performance na Fase 5 com `motion-audit`.

### Empty states e skeletons (product permission)

Há `SkeletonCards.tsx` no antigo. No port, garantir **skeleton no lugar de spinner** e **empty states que ensinam** (campanhas/diário/quadro vazios devem orientar, não dizer "nada aqui"). É onde um app de produtividade ganha confiança. Recomendado `/impeccable onboard` nas telas de primeira sessão.

### Consistência de ícone

designlang: 19 SVGs `outlined` + `currentColor`, padrão `lucide-react`. Coeso. Manter família única; não misturar com filled exceto o `Zap fill-current` do CTA (que é proposital, marca energia). Documentar essa exceção.

---

## 4. Recomendações priorizadas + ações de maior impacto

### Tabela de saúde (estimativa por evidência — não houve runtime)

| #         | Dimensão       | Score     | Achado-chave                                                                                      |
| --------- | -------------- | --------- | ------------------------------------------------------------------------------------------------- |
| 1         | Acessibilidade | 3/4       | Contraste AAA na marca; falta auditar muted-foreground 55% sobre card e foco em todos interativos |
| 2         | Performance    | 2/4       | `transition: all`, glow/blur sem `will-change`, 90% CSS morto no build antigo (port resolve)      |
| 3         | Theming        | 4/4       | Token system completo, dark-first correto, port verbatim fiel (`globals.css`)                     |
| 4         | Responsivo     | 3/4       | Breakpoints definidos; H1 96px→36px coerente; sem hamburger em mobile (nav some) a revisar        |
| 5         | Anti-Patterns  | 2/4       | Gradient text (novo), side-stripe blockquote, glass decorativo, grade de cards idêntica           |
| **Total** |                | **14/20** | **Good — corrigir Anti-Patterns e Performance**                                                   |

### As 5 ações de maior impacto para a nova versão

1. **[P1] Matar o gradient text do H1 e restaurar a assinatura sólida + glow.** `app/page.tsx` → trocar `bg-gradient-nuckturp bg-clip-text text-transparent` por `text-primary text-glow-lime`. Corrige um BAN absoluto e recupera a identidade que o original tinha. Comando: `/impeccable typeset`.
2. **[P1] Definir o sistema de estados + unificar o botão antes de portar features.** Um set canônico (default→hover→focus→active→disabled→loading→error) com o focus-ring lime promovido a token; CVA do botão com variantes explícitas (raio/peso/padding por intenção). Trava a consistência antes de 270+ componentes entrarem. Comando: `/impeccable shape` + `/impeccable harden`.
3. **[P1] Reescrever blockquotes do editor/blog sem `border-left` colorido.** Alto volume (todo o conteúdo SEO TipTap + blog). Full border + tint + (opcional) aspa tipográfica em Space Grotesk. Comando: `/impeccable polish` no `.notion-editor`/`.blog-content`.
4. **[P2] Quebrar a grade "9 ferramentas" em layout assimétrico.** Card mestre (o rico, estilo `card-default-xl-0`) + satélites menores, em vez de 3×3 uniforme. Mantém o conteúdo, elimina o tell de grade-clichê. Comando: `/impeccable layout` + `/impeccable bolder` na seção de features.
5. **[P2] Codificar elevação/borda/raio como 3 degraus e podar `transition: all` + glass decorativo.** Borda em 2-3 níveis (não 4 opacidades ad hoc), elevação em flat/glow-sutil/glow-ativo, transições por propriedade. Reserva o glow lime para CTA e estados ativos. Comando: `/impeccable extract` (tokens) + `/impeccable optimize`.

**Princípios de motion por projeto (do CLAUDE.md global): Nuckturp = lente Tompkins** (liberdade criativa). Vale para a **landing/marketing**; nas **telas de produto** aplicar restraint Kowalski (150–250ms, state-only). Não deixar o motion da landing vazar para o app autenticado.

Fechar com `/impeccable polish` após as correções e re-rodar `/impeccable audit` para medir a subida de score.
