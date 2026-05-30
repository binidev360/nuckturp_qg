# Briefs das 3 landing pages de produto — QG do Mestre (Nuckturp)

> Extraído **verbatim** das páginas do projeto antigo (read-only) em
> `D:\ProjetoAntigravity\Nuckturp_2.1\nuckturp\src\pages\`.
> Fonte para reescrever copy e reconstruir as páginas em Next.js.
> **Não confunda preço/canal com suposições do briefing** — a fonte real diverge em alguns pontos (ver ⚠️).
>
> Fontes:
>
> - `WorldbuildingLandingPage.tsx` (rota `/curso-de-worldbuilding`)
> - `BookLandingPage.tsx` (rota `/o-livro-completo-do-mestre-de-rpg`)
> - `ChecklistLandingPage.tsx` (rota `/checklist-do-mestre-metodico`)
> - Existe ainda uma 4ª página: `WorldbuildingLandingPageForMasters.tsx` (rota `/curso-de-worldbuilding-para-mestres`) — **variante A/B "Human Design"** do curso de worldbuilding, mesmo produto/preço/Hotmart, copy quase idêntica. Considerar consolidar ou manter o teste A/B na migração.
>
> **Todas as 4 rotas estão registradas** em `src/App.tsx` (linhas 201–204) e protegidas em `LegacyRedirect.tsx` (não redirecionar). Footer público (`PublicBlogLayout.tsx`) já linka as 3 principais.

---

## 1. Curso de Worldbuilding para RPG e Escritores

**Rota:** `/curso-de-worldbuilding` · **Arquivo:** `WorldbuildingLandingPage.tsx`
**Framework de copy:** PAISA (Problema → Agitação → Intensidade → Solução → Ação)

### Oferta

- **O que é:** curso online de construção de mundos para mestres de RPG e escritores. 11 módulos + **apostila com exercícios práticos** ("Worldbuilding Workbook").
- **Preço:** **R$ 97** (de ~~R$ 297~~) · "ou 12x R$ 8,08".
- **Canal:** **Hotmart** — `https://pay.hotmart.com/L68313118D?checkoutMode=10`
- **Garantia:** 7 dias incondicional (Hotmart). "Não gostou? Devolvemos seu dinheiro."
- **Entregáveis:** acesso imediato, apostila com exercícios, 11 módulos.

### Promessa / transformação

- **Headline:** "Seus jogadores **esquecem** o mundo que você criou?"
- **Promessa:** "Aprenda a construir universos ricos, coerentes e inesquecíveis, como Tolkien, George R.R. Martin e os grandes mestres fizeram." Termina o curso com **um mundo pronto e documentado**.
- **Tese central:** "O problema não é falta de imaginação. É falta de **estrutura**."

### Dores que ataca (seção "Agitação")

Mundos rasos/genéricos · Paralisia criativa (folha em branco) · Mapas sem lógica geográfica · Culturas genéricas (todos os povos iguais) · Conflitos artificiais (vilão malvado "porque sim") · Mundos abandonados no meio.
Intensidade: mundos fragmentados · zero imersão · desistência.

### Conteúdo (11 módulos)

1. Brincando de Deus (mentalidade de criador)
2. As Bases do Mundo (geografia, clima, rios, fertilidade)
3. Flora, Fauna e Biomas (8 biomas terrestres)
4. O Inexplicável Explicado (origem do mundo, deuses, magia)
5. Pilar: Cultura
6. Pilar: Economia
7. Pilar: Política
8. Pilar: Tecnologia
9. Pilar: Religião
10. Elementos Únicos (bestiário, artefatos, NPCs, panteão)
11. Detalhes Finais (astros, calendário, história, hierarquia)

**Estrutura conceitual paralela — "Os 8 Pilares":** Cultura, Economia, Política, Religião, Geografia, Sistema de Magia, Tecnologia, Monstros e Criaturas.

### Estrutura da página (ordem das seções)

1. Sticky nav (logo + botão "Comprar R$ 97")
2. **Hero (Problema):** rating, badge "Curso + Apostila", H1, promessa, PriceTag, CTA, selo garantia 7 dias
3. **Agitação:** grid de 6 dores
4. **Intensidade:** 3 consequências + citação do Workbook
5. **Os 8 Pilares:** grid de 8 cards
6. **Solução:** texto + imagem, lista dos 11 módulos, badges de sistemas, 4 diferenciais
7. **Comparativo de preço:** 4 alternativas riscadas + PriceTag + CTA
8. **Inspiração:** Terra Média/Westeros/Arrakis/Night City + citação
9. **FAQ:** 7 perguntas
10. **Ação (CTA final):** PriceTag + CTA + selos
11. Footer

### Provas (autoridade / números)

- ⚠️ **PLACEHOLDER:** "(98 avaliações)" + 5 estrelas no `StarRating` — **número inventado, sem fonte**. JSON-LD declara `ratingValue: "5"`, `reviewCount: "98"`. **Risco de rich-snippet falso — remover ou substituir por avaliações reais.**
- Comparativos de preço (livro RPG R$150-250, módulo online R$197-497, pizza+refri R$70-90, streaming R$55-65) — argumentos, não provas.
- Autoridade: instrutor declarado no schema = **Marco Bini** (`/m/bini`), provider Nuckturp.
- Sem depoimentos nominais nesta página.

### CTAs e links externos

- Todos apontam para o **HOTMART_URL** (`L68313118D`).
- Texto dos CTAs: "Quero Criar Meu Mundo por R$ 97" / nav "Comprar R$ 97".

### Imagens (exatas, em `src/assets/`)

- `worldbuilding-hero.jpg` (hero bg)
- `worldbuilding-solution.jpg` (seção solução)
- `worldbuilding-intensity.jpg` (seção intensidade)
- `nuckturp-aventura-logo-white.png` (logo)
- OG: `public/og-worldbuilding.jpg`
- _(não usados aqui, mas existem: `worldbuilding`-_ só estes 3)\*

### Voz / tom

Direto, motivacional-épico, segunda pessoa ("você"). Apela para autores canônicos. Tom de "método vs. caos".
**Tiques a corrigir:** mancheia de "mundos inesquecíveis"/"universos vivos" (repetição). Citações atribuídas ao próprio "Workbook" (autorreferência fraca como prova). Avaliações placeholder (acima).

### ⚠️ Conflitos com o PIVOT

- **Nenhuma menção a Academia / Premium / freemium.** É produto Hotmart independente — sobrevive intacto ao pivot.
- É **página pública de SEO** (driver C2 ✅): permanece **aberta**, fora do paywall.
- Oportunidade pós-pivot: incluir CTA cruzado para o **trial de 21 dias do QG** (a página hoje não menciona o app QG).

---

## 2. O Livro Completo do Mestre de RPG

**Rota:** `/o-livro-completo-do-mestre-de-rpg` · **Arquivo:** `BookLandingPage.tsx`
**Framework de copy:** PAISA. **Dois canais de compra** (Hotmart PDF + Amazon Kindle).

### Oferta

- **O que é:** livro digital "O Livro Completo do Mestre de RPG", 11 capítulos (0–10) + exercícios práticos. ~200+ páginas (número citado no bumper do Checklist).
- **Preço:** **R$ 19,40** (de ~~R$ 97~~, badge "80% off").
- **Canais:**
  - **Hotmart (PDF):** `https://pay.hotmart.com/U57856134V?checkoutMode=10&offDiscount=sou_vip` — ⚠️ **cupom embutido `sou_vip`** no link (desconto VIP no próprio URL).
  - **Amazon (Kindle):** `https://www.amazon.com.br/Livro-Completo-Mestre-RPG-exerc%C3%ADcios-ebook/dp/B09QNJ65W4`
- **Garantia:** 7 dias incondicional **apenas na compra via Hotmart**.
- **Formato:** PDF (Hotmart) e Kindle (Amazon), ambos com exercícios.

### Promessa / transformação

- **Headline:** "Você quer mestrar RPG, mas **não sabe por onde começar?**"
- **Promessa:** "Descubra o método que já formou centenas de mestres confiantes — do primeiro medo ao primeiro 'quando é a próxima sessão?'"
- **Tese:** "O maior desafio não é criatividade. É o **comprometimento**." / "mestrar é uma habilidade construída sessão por sessão."

### Dores que ataca ("Os 7 Medos")

Medo do inesperado · de não improvisar · dos sistemas/regras · do balanceamento (combate) · de perder o ritmo · dos personagens (controle) · de não impactar (começo sem graça).
Intensidade: sem estrutura · jogadores desengajados · burnout do mestre.

### Conteúdo (11 capítulos)

- 0. O que é RPG de Mesa?
- 1. Preparando a Mente do Mestre (os 7 medos)
- 2. Construindo sua Aventura (sessão zero, tipos de aventura)
- 3. Narrando sua Aventura (os 5 sentidos)
- 4. E Agora? Por Onde Começar (roteiro prático)
- 5. Criando Sessões de RPG (estrutura, ritmo, improviso)
- 6. Worldbuilding Avançado
- 7. Narração Avançada (ritmo de cinema, NPCs)
- 8. Combate Avançado
- 9. Liderança Avançada (4 perfis de jogadores)
- 10. O Hábito dos Melhores Mestres

### Estrutura da página (ordem das seções)

1. Sticky nav (logo + "Comprar agora — R$ 19,40")
2. **Hero (Problema):** badge, H1, promessa, **badge clicável Amazon 4,6/5**, PriceTag, CTAs duplos (Hotmart+Amazon), mockup do livro
3. **Agitação (7 Medos):** layout assimétrico
4. **Voz narrativa:** história pessoal do autor ("Marco — autor do livro") como ponte
5. **Intensidade:** 3 consequências + citação do próprio livro
6. **Solução:** texto + imagem, lista dos 11 capítulos, 4 diferenciais
7. **Preço centralizado:** "menos que uma pizza" + CTAs
8. **Social proof:** nota Amazon 4,6/5 + 2 depoimentos
9. **FAQ:** 4 perguntas (accordion)
10. **Ação (CTA final):** PriceTag + CTAs duplos
11. Footer

### Provas

- **Nota Amazon 4,6/5** — apresentada como real, linka para a página real da Amazon (B09QNJ65W4). **Crível, mas confirmar o número atual antes de republicar.**
- **2 depoimentos REAIS** extraídos da Amazon (marcados como tal no código):
  - Charles William — 22/jan/2024 — "review na amazon.com.br"
  - Ander — 17/jun/2022 — "amazon.com.br"
- ⚠️ JSON-LD declara `ratingValue: "4.6"`, **`reviewCount: "127"`** — o "127" não bate com nenhuma fonte exibida; **verificar/alinhar com a contagem real da Amazon** para não emitir schema falso.
- Autoridade: autor "Marco" (história pessoal na seção voz narrativa).

### CTAs e links externos

- Hotmart (`U57856134V`, cupom `sou_vip`) — botão primário "Comprar PDF — R$ 19,40" / "PDF com desconto — R$ 19,40".
- Amazon (`B09QNJ65W4`) — botão secundário "Kindle na Amazon".

### Imagens (exatas, em `src/assets/`)

- `book-landing-hero.jpg` (hero bg)
- `book-landing-solution.jpg` (mockup do livro, hero + solução)
- `book-landing-combat.jpg` (seção intensidade)
- `nuckturp-aventura-logo-white.png` (logo)
- OG: `public/og-book.jpg`
- _(existem mas não usados aqui: `book-landing-d20.png`, `book-landing-gm-screen.jpg`, `book-landing-rpg-table.jpg`, `book-landing-worldbuilding.jpg`)_

### Voz / tom

Mais literário/cinematográfico que o curso (itálicos de ênfase, textura de "papel envelhecido", grão). Storytelling em 1ª pessoa do autor. Forte uso de itálico em destaques.
**Tiques a corrigir:**

- **Inconsistência de capitalização:** title/meta/headlines usam "rpg", "d&d", "amazon" em minúsculas ("mestrar rpg", "nota 4,6/5 na amazon") — provavelmente lowercase forçado por estética, mas **errado para nomes próprios**. Padronizar "RPG", "D&D", "Amazon", "Kindle".
- Repetição de "mestre que todos ficam na fila para jogar".
- `reviewCount` do schema sem fonte (acima).

### ⚠️ Conflitos com o PIVOT

- **Nenhuma menção a Academia / Premium / freemium.** Produto externo (Hotmart/Amazon) — sobrevive ao pivot.
- Página pública de SEO (C2 ✅) → permanece **aberta**, fora do paywall.
- O cupom `sou_vip` no link é só desconto Hotmart do livro — **não** se confunde com o tier "Mestre VIP" do QG. Não tocar, mas documentar para não gerar confusão semântica com o `premium_overrides`/VIP do pivot.
- Oportunidade: CTA cruzado para o **trial do QG**.

---

## 3. Checklist do Mestre Metódico

**Rota:** `/checklist-do-mestre-metodico` · **Arquivo:** `ChecklistLandingPage.tsx`
**Framework de copy:** PAISA + **order bumpers** (upsell no checkout).

### Oferta

- ⚠️ **NÃO É GRÁTIS / NÃO É LEAD MAGNET.** O briefing pediu "lead magnet grátis", mas a fonte real é um **produto pago de R$ 5,37** (de ~~R$ 17,90~~, "70% off"), com checkout Hotmart e garantia de 7 dias. **Decisão necessária do Marco:** manter como tripwire pago ou converter de fato em lead magnet (captura de e-mail) no novo funil.
- **O que é:** checklist de preparação de sessão de RPG. Inclui: **PDF editável** + versão **impressão colorida** + versão **preto e branco** + **bônus "Checklist do Jogador Comprometido"** (PDF para enviar aos jogadores).
- **Preço:** **R$ 5,37** (de ~~R$ 17,90~~).
- **Canal:** **Hotmart** — `https://pay.hotmart.com/U63481101U?checkoutMode=10&offDiscount=INST70` (⚠️ cupom `INST70` embutido no link).
- **Garantia:** 7 dias incondicional (seção dedicada "Garantia incondicional de 7 dias").

### Promessa / transformação

- **Headline:** "Não entre mais em sessões de RPG **despreparado!**"
- **Promessa:** "prepara suas sessões em poucos minutos. Reduzindo o trabalho e aumentando a diversão!" / "economizar de 30 minutos a 2 horas por sessão".
- **Tese:** "O problema não era criatividade. Era método."

### Dores que ataca

Sessões sem direção · horas de preparo perdidas/esquecidas · travamento no improviso · jogadores desengajados · burnout de mestrar · combates genéricos.

### Conteúdo / entregáveis

- PDF explicativo (como usar cada item, antes e depois da sessão)
- Versão impressão colorida (alta resolução)
- Versão impressão p&b (economia de tinta)
- **Bônus:** Checklist do Jogador Comprometido (preparação do jogador, compromisso com a mesa, enviar ao grupo)

### Estrutura da página (ordem das seções)

1. Sticky nav (logo + "Comprar — R$ 5,37")
2. **Hero:** badge, H1, promessa, PriceTag, CTA, selo garantia, mockup
3. **Agitação:** 6 dores (layout assimétrico)
4. **Voz narrativa:** história pessoal ("Mestre Bini — co-criador do Nuckturp")
5. **Solução:** método passo a passo + mockup
6. **Entregáveis:** 3 cards (PDF, impressão colorida, p&b)
7. **Bônus:** Checklist do Jogador Comprometido (seção destacada)
8. **Prova social:** 3 depoimentos
9. **Ação (preço):** "Tudo isso por apenas R$ 5,37"
10. **Bumpers (order bumps):** 3 ofertas exclusivas de checkout
11. **Garantia:** seção editorial 7 dias
12. **FAQ:** 4 perguntas (accordion)
13. **Ação final:** "Pare de improvisar no escuro" + CTA
14. Footer

### Order bumpers (upsells exibidos só no checkout, segundo a copy)

- **O Livro Completo do Mestre de RPG** — R$ 19,00 ("+200 páginas")
- **Curso de Worldbuilding** — R$ 49,00 (de ~~R$ 99~~, 50% off)
- **Crie sua Campanha de RPG** — R$ 10,00 (de ~~R$ 36~~, 72% off) — _4º produto do ecossistema, sem landing própria mapeada_

### Provas

- ⚠️ **TODOS OS 3 DEPOIMENTOS SÃO PLACEHOLDER.** Comentário explícito no código (linha 94): `// TODO: Substitua pelos depoimentos reais dos compradores do checklist`. Nomes fictícios: "Rafael M.", "Ana L.", "Lucas F." — **NÃO publicar como reais.**
- Sem nota/rating agregado no schema (ao contrário das outras duas) — bom, evita rich-snippet falso aqui.
- Autoridade: "Mestre Bini — co-criador do Nuckturp" (história pessoal).
- "Mestres relatam economizar 30min–2h" — claim sem fonte.

### CTAs e links externos

- Todos → **HOTMART_URL** (`U63481101U`, cupom `INST70`).
- Texto: "Comprar agora — R$ 5,37".

### Imagens (exatas)

- `src/assets/checklist-hero-banner.jpg` (hero bg)
- `src/assets/checklist-mockup-main.png` (mockup principal, usado 2x)
- `src/assets/checklist-bonus-jogador.png` (bônus)
- `src/assets/nuckturp-aventura-logo-white.png` (logo)
- ⚠️ `public/Checklist messy table.jpg` — referenciada por **caminho hardcoded com espaços** (`src="/Checklist messy table.jpg"`) na seção voz narrativa. **Renomear para slug sem espaços na migração** (ex.: `checklist-messy-table.jpg`).
- OG: `public/og-checklist.jpg`

### Voz / tom

Igual ao Livro: cinematográfico, itálicos, grão, storytelling 1ª pessoa. Mais "intimista" (história do "Mestre Bini").
**Tiques a corrigir:**

- Mesmo problema de **lowercase em nomes próprios** (title/meta: "rpg", "d&d", "pdf", "npcs", "hora h").
- Depoimentos placeholder (acima) — bloqueante para publicação.
- Classe Tailwind dinâmica suspeita: `delay-${(i % 5) * 100}` (linha ~352) — pode não compilar com purge do Tailwind; revisar na migração.

### ⚠️ Conflitos com o PIVOT

- **Nenhuma menção a Academia / Premium / freemium.**
- **Conflito de premissa de funil:** o briefing trata o checklist como **lead magnet grátis para o trial do QG**, mas hoje ele é um **tripwire pago Hotmart** cujos bumpers vendem outros infoprodutos — **não** aponta para o app QG nem captura e-mail. No modelo pós-pivot (QG 100% pago, trial 21 dias), faz sentido **redesenhar este funil**: ou (a) torná-lo grátis em troca de e-mail → sequência → trial do QG, ou (b) manter pago e adicionar CTA/bumper para o **trial do QG**. **Decisão do Marco pendente.**
- Página pública de SEO (C2 ✅) → permanece aberta, fora do paywall.

---

## Achados transversais (aplicáveis às 3)

1. **Stack atual:** páginas standalone React/Vite (sem AppLayout), SEO via `setMeta`/`injectJsonLd` em `useEffect` (client-side). Na migração Next.js, isso vira **metadata estática/SSR** (`generateMetadata`) e JSON-LD server-rendered — ganho real de SEO (driver do projeto).
2. **Mesmos slugs preservados** (guardrail SEO): as 4 rotas já estão em `LegacyRedirect.tsx` como protegidas. **Manter idênticas.**
3. **Ratings placeholder/inconsistentes no JSON-LD** (Worldbuilding `reviewCount 98`, Livro `127`) — risco de penalização por structured data falso. Auditar antes de republicar.
4. **Lowercase forçado em nomes próprios** (RPG, D&D, Amazon, PDF) nas metas/headlines do Livro e do Checklist — corrigir na reescrita de copy.
5. **Tom de marca:** PAISA + storytelling 1ª pessoa do "Mestre Bini"/"Marco". Worldbuilding é mais épico-direto; Livro e Checklist são mais cinematográficos (grão, papel envelhecido, itálico).
6. **Variante A/B** do Worldbuilding (`/curso-de-worldbuilding-para-mestres`) existe — decidir se migra as duas ou consolida.
7. **Produtos do ecossistema não-paywall:** os 3 (+ "Crie sua Campanha") são infoprodutos Hotmart/Amazon, **fora** do app QG. O pivot (QG pago) **não os afeta** — mas todos são oportunidade de **CTA cruzado para o trial do QG**.
