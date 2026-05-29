# Diagnóstico de TASTE — QG do Mestre (Nuckturp)

> Lente: **taste-skill** (DESIGN_VARIANCE / MOTION_INTENSITY / VISUAL_DENSITY · anti-emoji · anti-Inter-default · anti-card-overuse · anti-AI-slop).
> Lente criativa de marca: **Tompkins** (experimentação criativa) — espaço para 1-2 momentos memoráveis, sem virar slop.
> Data: 2026-05-29. Evidência: `docs/inventario/designlang/design-extract-output/` (designlang, 615 elementos, score 91/100 grade A) + `docs/inventario/ui-componentes.md` + código antigo READ-ONLY (`Nuckturp_2.1`) + `app/{globals.css,layout.tsx,page.tsx}` do projeto novo.

---

## Nota de leitura da evidência (importante)

O extrator designlang capturou o site no **tema light** (`--primary: 82 85% 38%`, lime escuro/oliva; `--background: 60 10% 96%`, quase branco). **A produção roda dark-first** (`<html class="dark">`): lime vivo `82 100% 65%` (#C4FF4D) sobre Noir Void `0 0% 10%` (#1A1A1A). As screenshots `full-page.png` / `card-default-*` mostram o estado **real dark** — é essa a verdade visual. Onde o `.md` do designlang lista hex oliva (`#77b30f`) ou fundo creme, leia como artefato do snapshot, não como intenção de marca. Os tokens dark do `app/globals.css` novo já estão corretos (lime 65% / void 10%).

---

## 1. Leitura de taste — o que tem personalidade real vs. o que é genérico

### Tem personalidade real (preservar, é o DNA)

- **Paleta disciplinada de marca.** Um único acento de alta saturação (Cyber Lime `#C4FF4D`) + um secundário pontual (Vapor Violet `#BA8CFF`) sobre Noir Void quase-preto. Score de "Color Discipline" 92/100, saturação média 0.254 (baixa no agregado, picos só no acento). Isso é exatamente o que a taste-skill pede: **max 1 acento dominante, neutros profundos, violet como tempero**. O lime sobre void dá 16:1 de contraste (AAA). Não mexer na hierarquia cromática.
- **Hero asimétrico left-aligned.** A `full-page.png` mostra headline gigante alinhada à esquerda ("Pare de / Improvisar / a preparação.") com a foto cinematográfica de mesa (miniaturas + dados sobre mapa de fantasia) à direita, fade graceful pro void. Isso é o **Standard Hero Paradigm** da taste-skill já implementado de fábrica — texto à esquerda, asset relevante à direita, sem texto centralizado sobre imagem. É o ativo de taste mais forte do site.
- **Foto de produto como herói, não ilustração genérica.** A imagem hero (`landing-hero.jpg`) é uma cena real montada — dados de RPG, mapa, miniaturas, velas. Comunica o domínio (RPG de mesa) em 200ms sem dizer uma palavra. Vale ouro contra slop: nenhuma IA "default" escolheria isso; é uma decisão de direção de arte.
- **Pills sobrepostas com rotação (`rotate-2 hover:rotate-0`).** Os badges "CAMPANHAS ILIMITADAS" / "DIÁRIO DO MESTRE" em pill lime/violet flutuando sobre a foto (z-index map confirma `rotate-2` + `backdrop-blur-xl`) são um toque tátil e com atitude — exatamente o tipo de "1 momento memorável" da lente Tompkins.
- **Tipografia de display com caráter.** `Space Grotesk` 900 em 96px com `letter-spacing: -4.8px` (tracking ultra-fechado) nos h1 dá peso editorial e "geometria gamer" que `Inter` jamais entregaria. Esse é o gesto tipográfico assinatura.
- **Copy concreta e com voz.** "9 ferramentas. Zero caos.", "Seu QG. Tudo num relance.", "O Roteiro que Derreteu". Verbos concretos, zero "Elevate/Seamless/Unleash". A taste-skill bane filler words — aqui o copy já passa limpo. Preservar essa voz.
- **D20 como símbolo proprietário.** `DiceIcons.tsx` é um SVG paramétrico (d4→d100) com presets de cor próprios. É o candidato natural ao "momento memorável" da marca (ver Seção 3).

### Genérico / default (oportunidade de elevar)

- **`Inter` como body sem intenção.** 573 elementos em Inter. A taste-skill **bane Inter explicitamente** — é o tell #1 de "stack default". Aqui não é catastrófico (o display Space Grotesk carrega a personalidade), mas Inter no corpo é uma escolha por omissão, não por taste. Ver Seção 3.
- **Feature-cards em grade.** O bloco "9 ferramentas" usa cards `bg-[#1f1f1f] rounded-[16px] border-border/60` repetidos — 9 instances do mesmo card-default. Funcional, mas é o padrão mais previsível de SaaS. A foto-hero e as pills salvam o site de ser "mais um dashboard escuro", mas a grade de features está no piloto-automático.
- **Cards genéricos com sombra quase nula.** `box-shadow` de blur 0px e sombras `rgba(0,0,0,0.05)` praticamente invisíveis — as bordas 1px fazem todo o trabalho de separação. Não é errado (a taste-skill prefere bordas a card overuse), mas a elevação não comunica hierarquia nenhuma: tudo está no mesmo plano. Os cards existem por hábito, não por função.
- **Glows lime difusos.** `box-shadow ... rgba(132,255,0,0.2) 0 0 20px` no CTA e blobs `blur-[120px]`. Em pequena dose num CTA, é assinatura "gamer". Em excesso, vira o "neon glow trap" que a taste-skill bane. Está no limite — ver Seção 2.

### Estado do projeto NOVO (`app/page.tsx`) — atenção

A landing nova (placeholder atual) **regrediu** em taste vs. o site real e acumulou AI-tells que a própria taste-skill proíbe:

- **Hero centralizado** (`items-center justify-center text-center`) — o site real é left-aligned asimétrico. Isto viola o anti-center bias (DESIGN_VARIANCE 8) **e** abandona o melhor ativo de taste da marca.
- **Gradient text no logo-headline** (`bg-gradient-nuckturp bg-clip-text text-transparent` em "Mestre") — a taste-skill bane "Excessive Gradient Text" em headers grandes. O site real **não** usa texto-gradiente no h1; usa lime sólido + glow sutil.
- **Dois glow blobs** (`bg-primary/10 blur-[120px]` + `bg-secondary/10`) — glow trap clássico de hero de IA.
- **Fileira de "cards" pill** com os 4 nomes de ferramenta — placeholder, mas já é o padrão card-overuse.

Isso é placeholder de scaffold, então não é alarme — mas serve de aviso: **a reescrita não deve "limpar" a marca até virar um SaaS-dark-genérico**. O caráter está nos detalhes que a v1 acertou por direção de arte.

---

## 2. Riscos de AI-slop / armadilhas (mapeadas ao contexto Nuckturp)

| Armadilha                        | Risco aqui                                                                                                                                                                            | Veredito                                                                                                                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Glow trap** (neon outer-glow)  | Médio-alto. O brand é "gamer premium" e o lime pede glow. Há glows no CTA (`0 0 20px`) + blobs `blur-[120px]` na page nova. Cruzar a linha transforma "premium" em "RGB gamer chair". | **Conter.** 1 glow funcional por viewport (no CTA primário ou no D20). Banir glow-blobs decorativos múltiplos. Glow só onde comunica "isto é interativo/épico".                                                                               |
| **Card overuse**                 | Médio. A grade "9 ferramentas" e o bloco "Seu QG" empilham muitos cards. Com o port shadcn, o risco é tudo virar `<Card>`.                                                            | **Conter.** Usar `border-t`/`divide-y`/negative space para agrupar features de mesma hierarquia. Card só quando a elevação tem função (item arrastável, item selecionado, modal). Zig-zag 2-col ou bento assimétrico no lugar de 3-col igual. |
| **Inter sem intenção**           | Baixo-médio. Inter no corpo é tell de default, mas Space Grotesk no display segura o caráter.                                                                                         | **Decidir conscientemente.** Manter Inter SE for decisão de legibilidade (corpo de blog longo); senão, considerar `Geist`/`Satoshi` no corpo p/ tirar o "cheiro de template". Mono p/ números/dados (dados de rolagem, stats).                |
| **Glassmorphism gratuito**       | Baixo hoje (`backdrop-filter in use: no` no agregado), mas o header real usa `bg-background/80 backdrop-blur-xl` e as pills usam `backdrop-blur-xl`.                                  | **OK em dose.** Glass só no header sticky e nas pills sobre foto (onde refração faz sentido). Se usar, aplicar a regra da taste-skill: borda interna 1px `border-white/10` + inset shadow, não só blur. Não espalhar para cards de conteúdo.  |
| **Gradient text**                | Médio (já presente na page nova).                                                                                                                                                     | **Banir em h1/headers grandes.** Lime sólido + glow sutil é a assinatura real. Gradiente lime→violet 135° reservar para superfícies/bordas/divisores, não texto display.                                                                      |
| **Emoji**                        | Baixo (ícones via `lucide-react`).                                                                                                                                                    | **Manter zero emoji.** Já conforme. Padronizar `strokeWidth` (1.5 ou 2.0) globalmente no port.                                                                                                                                                |
| **Hero centralizado**            | Alto na page nova; ausente no site real.                                                                                                                                              | **Reverter para left-aligned asimétrico** (o DNA real).                                                                                                                                                                                       |
| **Dados fake / nomes genéricos** | A ser vigiado no port (testimonials, avatares, stats).                                                                                                                                | Usar nomes de mestres realistas, stats orgânicos, avatares plausíveis. Banir "John Doe"/"99.99%".                                                                                                                                             |
| **Cor hardcoded**                | Real. `DiceIcons.tsx` tem HSL inline (presets ember/ice/gold sem token) — viola o guardrail "só tokens" do projeto.                                                                   | **Tokenizar no port.** Criar tokens para os presets de dado ou aceitar como exceção documentada (são cores de "material de dado", não de UI).                                                                                                 |

**Síntese do risco:** o Nuckturp NÃO está em risco de slop genérico hoje — tem direção de arte real (foto-hero, pills, Space Grotesk, paleta disciplinada). O risco é **perder esse caráter na reescrita** por "higienizar" demais (como já começou a acontecer na `page.tsx` placeholder) OU por **exagerar o glow** ao tentar parecer mais "gamer". O fio da navalha é: void + lime contido + 1 gesto memorável.

---

## 3. Recomendações priorizadas para a nova versão

### Dials sugeridos (override do baseline 8/6/4 da skill)

| Dial                 | Baseline skill | **Sugerido p/ Nuckturp**                              | Por quê                                                                                                                                                                                                                                                                                |
| -------------------- | -------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DESIGN_VARIANCE**  | 8              | **6-7** (marketing/landing) · **4-5** (app/dashboard) | A marca pede asimetria (hero left, pills rotacionadas, bento), mas é uma ferramenta de produtividade — não pode virar "artsy chaos". Landing ousa (6-7); telas internas (campanhas, diário, agenda) contêm para legibilidade (4-5).                                                    |
| **MOTION_INTENSITY** | 6              | **5** (landing) · **3** (app)                         | Lente Tompkins permite experimentação, mas o motion real do site é CSS-first (`.reveal` + IntersectionObserver, `fade-up`, `pulse-lime`) — leve e tasteful. Manter isso. O **1 momento cinematográfico** (D20) pode ir a 7-8 isolado. App interno fica em 3 (saúde do foco do mestre). |
| **VISUAL_DENSITY**   | 4              | **4** (landing) · **6-7** (app/dashboard)             | Landing respira (gallery-ish, gaps generosos — já é o caso). Mas o QG é um cockpit de mestre (campanhas, sessões, stats, dados) — densidade 6-7 com `font-mono` em números, separação por linha 1px, sem card-overuse.                                                                 |

### Hierarquia tipográfica (corrigir o tell do Inter)

- **Display (h1-h2):** manter **Space Grotesk** com tracking ultra-fechado (`tracking-tighter`, `leading-none`) — é a assinatura. Resistir à tentação de h1 "que grita": controlar hierarquia com **peso e cor (lime)**, não só escala (a taste-skill alerta contra "Oversized H1s").
- **Corpo:** decisão consciente. Opção A (fiel/seguro): manter **Inter** mas justificar como legibilidade de blog longo. Opção B (mais taste): **Geist** ou **Satoshi** no corpo — tira o cheiro de default sem brigar com Space Grotesk. Recomendo **testar Geist no corpo** num spike visual; se a leitura de blog não melhorar, voltar pro Inter sem culpa.
- **Números/dados/dados-de-rolagem:** introduzir **mono** (`Geist Mono` / `JetBrains Mono`) onde há números (stats do mestre, resultado de rolagem, contadores, datas de agenda). É exigência da taste-skill em densidade alta e combina com a estética "ferramenta técnica de RPG".
- **Strong/em como semântica de marca:** preservar `<strong>` lime 650 / `<em>` violet itálico (já portado). É um toque de identidade no texto corrido — raro e bom.

### Densidade e layout

- **Landing:** preservar hero left-aligned + foto à direita. Substituir grade de feature-cards 3-col por **bento assimétrico** (a taste-skill recomenda bento sobre 3-col igual) OU **zig-zag 2-col** com screenshots reais do produto. As pills rotacionadas viram elemento recorrente de marca.
- **App/QG:** densidade 6-7. Agrupar por **`divide-y`/`border-t`/espaço negativo**, não por card. Card só para: item arrastável (whiteboard), item selecionado, modal/popover, e o "card de sessão" onde elevação = "isto é uma unidade". Números em mono.
- **Bordas > sombras** no dark: as sombras quase não aparecem sobre void; a separação real vem das bordas `0 0% 22%`. Investir em bordas precisas e espaçamento matematicamente limpo, não em elevação fake.

### Onde OUSAR (Tompkins) vs. onde CONTER

- **OUSAR (1-2 momentos):**
  1. **O D20** — o gesto assinatura. Um D20 que reage (rola/flutua/responde ao cursor) no hero ou como easter-egg de "rolar dado". É o lugar para MOTION_INTENSITY 7-8 isolado, em Client Component próprio (memoizado, com `useReducedMotion`). NÃO o blob de glow — o **dado**.
  2. **Pills rotacionadas sobre a foto** — já existem; podem ganhar micro-física (leve tilt no hover) sem custo de taste.
- **CONTER (disciplina):**
  - Glow: 1 por viewport, funcional.
  - Cards: só com função de elevação.
  - Gradient: superfícies/bordas, nunca texto display.
  - Motion no app interno: mínimo (foco do mestre > espetáculo).
  - Cor: 100% tokens (resolver HSL inline do `DiceIcons`).

---

## 4. As 3-5 ações de MAIOR impacto

1. **Reverter o hero da landing para left-aligned asimétrico** (texto à esquerda + foto-hero à direita com fade pro void), removendo o hero centralizado, o gradient-text em "Mestre" e os dois glow-blobs da `app/page.tsx` placeholder. É o ativo de taste #1 da marca e a maior regressão atual. _(Custo baixo, impacto altíssimo.)_

2. **Decidir a fonte de corpo conscientemente** — rodar um spike Geist vs. Inter no corpo + introduzir **mono para números/dados**. Resolve o tell do Inter-default e dá textura técnica coerente com "ferramenta de RPG". _(Custo baixo, impacto médio-alto no "cheiro de premium".)_

3. **Estabelecer a disciplina de glow e card antes de escalar componentes** — escrever a regra no design system do novo projeto: "1 glow funcional por viewport; card só com elevação funcional; agrupar por borda/espaço". Faz isso ANTES de portar 270+ componentes, senão o slop entra por repetição. _(Custo baixo agora, evita dívida enorme depois.)_

4. **Eleger o D20 como o momento Tompkins** — especificar (na Fase 5/motion) um D20 interativo isolado como o único "efeito memorável" de alto motion, em vez de espalhar glows/gradientes. Concentra a ousadia num ativo proprietário em vez de diluir em slop. _(Custo médio, impacto alto na memorabilidade.)_

5. **Trocar a grade de features 3-col por bento assimétrico ou zig-zag 2-col com screenshots reais** do produto — mata o padrão SaaS mais previsível e usa os assets de produto que já existem (`screenshot-*.jpg`, `landing-feature-*.jpg`). _(Custo médio, impacto médio-alto.)_

---

### Resumo de uma linha

Nuckturp **já tem taste real** (hero asimétrico, foto-produto, Space Grotesk, paleta lime+void disciplinada, pills com atitude) — a reescrita deve **proteger esse DNA**, corrigir os tells de default (Inter, e os AI-tells já injetados no placeholder: hero centralizado + gradient-text + glow-blobs), conter glow/card, e concentrar a ousadia Tompkins num único gesto memorável: **o D20**.
