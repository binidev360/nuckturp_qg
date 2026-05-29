# Diagnóstico de copy/voz — QG do Mestre (Nuckturp)

> Lente aplicada: skill **humanizer** (Wikipedia: Signs of AI writing). Objetivo: definir a voz da nova versão Next.js (microcopy de UI, headlines, vazios/erros, e-mails) e cortar padrões "AI/corporativo".
>
> Fontes lidas (todas READ-ONLY exceto o doc novo):
>
> - Voz extraída: `docs/inventario/designlang/design-extract-output/nuckturp-com-br-voice.json`
> - Landing real (Vite): `Nuckturp_2.1/nuckturp/src/components/landing/*`
> - Microcopy/i18n: `Nuckturp_2.1/nuckturp/src/i18n/locales/pt-BR.ts`, fluxo `pages/Auth.tsx`
> - Meu texto novo (avaliado criticamente): `app/page.tsx` e `app/layout.tsx`

---

## 1. Leitura da voz atual

A voz do QG já tem personalidade de mestre de RPG. Quando funciona, ela é curta, provocadora e usa o vocabulário da mesa sem pedir licença. Quando falha, escorrega para o modo "landing page de SaaS motivacional" — exatamente o registro que o humanizer foi feito para pegar.

### O que soa autêntico (manter)

- **Hero principal**: "Pare de / Improvisar / a preparação." Imperativo seco, com uma piada interna (improvisar é o trabalho do mestre na mesa, não na prep). É a melhor linha do site.
- **Headline de features**: "9 ferramentas. Zero caos." Número concreto + contraste afiado. Soa como alguém falando, não como brochure.
- **Nomes de produto com sabor**: "Diário do Mestre", "Quadro de Ideias", "QG do Mestre", "seu segundo cérebro para RPG". O nicho está no vocabulário, não enfeitado por cima dele.
- **Microcopy de erro/UI direto** (o i18n é o ponto mais sólido do projeto): "E-mail ou senha incorretos.", "Nenhuma campanha ainda. Crie sua primeira!", "Essa ação é irreversível.", "Toque nos dados acima para montar sua rolagem". Curtos, humanos, acionáveis. Esse é o padrão-ouro a replicar.
- **Empatia específica nas dores**: "Notas espalhadas entre 5 apps diferentes", "Esquece detalhes entre uma sessão e outra". O número (5 apps) e o cenário concreto vendem mais que qualquer adjetivo.

### O que soa AI / corporativo / genérico (corrigir)

- **Inflação épica**: "criar momentos épicos", "preparação épica", "Seus jogadores merecem o melhor de você", "para mestres que querem dominar a arte". É o registro "significância e legado" do humanizer — emoção genérica que poderia estar em qualquer LP.
- **Tique do "Zero \_\_\_"**: "Zero caos" (features) e "Zero bagunça" (showcase) e "sem planilhas, sem caos" (CTA). Uma vez é afiado. Três vezes vira fórmula de marca, e o humanizer marca isso como tailing negation repetida.
- **Em-dash decorativo** espalhado: "preparar, narrar e documentar — num só lugar", "lore — tudo categorizado", "trabalhe junto com você, não contra." Padrão #14. Em pt-BR natural quase nenhum desses precisa de travessão.
- **Negative parallelism**: "uma ferramenta que trabalhe junto com você, não contra." Padrão #9.
- **Rule of three** forçado: "preparar, narrar e documentar", "ganchos, encontros e NPCs", e (no meu texto) "campanhas, sessões e mundos". Nem todo conjunto precisa ser trinca.
- **Subtítulo de plano vago**: "Para mestres que querem dominar a arte" — conclusão genericamente positiva, diz nada de concreto.

---

## 2. Padrões AI detectados (com exemplos do texto real)

### No projeto antigo (landing Vite)

| Padrão (humanizer)           | Trecho real                                                                      | Por que é tell                                                  |
| ---------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| #14 Em-dash decorativo       | "Tudo que o mestre precisa para preparar, narrar e documentar — num só lugar."   | Travessão substitui uma vírgula/ponto que ficaria mais natural. |
| #9 Negative parallelism      | "uma ferramenta que trabalhe junto com você, não contra."                        | Construção "X, não Y" empacotada como punchline.                |
| #1 Inflação de significância | "Cada sessão mal preparada é uma oportunidade perdida de criar momentos épicos." | "momentos épicos" = emoção genérica, sem imagem concreta.       |
| #25 Conclusão positiva vazia | "Para mestres que querem dominar a arte" (plano premium)                         | Não promete nada verificável.                                   |
| #10 Rule of three            | "Gere ganchos, encontros e NPCs em segundos"                                     | Trinca por reflexo (o serviço gera mais que três coisas).       |
| Tailing negation repetida    | "Zero caos" / "Zero bagunça" / "sem planilhas, sem caos"                         | Bom 1x, vira fórmula 3x.                                        |

### No JSON de voz extraído

O `nuckturp-com-br-voice.json` reporta `"tone": "neutral"`, `"pronoun": "third-person"` e `"headingStyle": "Title Case"`. **Isso é leitura errada do extrator, não a voz real.** O site usa 2ª pessoa ("você", "seu QG", "junte-se") e o tom é provocador, não neutro. O Title Case detectado ("Gestão de Campanhas", "Diário do Mestre") é título de produto, aceitável; mas headlines de seção devem ficar em sentence case. Não tratar esse JSON como fonte de verdade da voz — ele descreve a superfície HTML, não a intenção.

### No meu texto novo (`app/page.tsx` + `app/layout.tsx`) — autocrítica

```tsx
// page.tsx
<p>
  O hub do mestre de RPG. Organize <strong>campanhas</strong>, documente
  <em>sessões</em> e crie mundos — num só lugar.
</p>
```

- **#10 Rule of three + #8 verbo de catálogo**: "Organize campanhas, documente sessões e crie mundos" é a trinca paralela clássica de SaaS. Três verbos imperativos em sequência perfeita = ritmo de robô.
- **#14 Em-dash**: "crie mundos — num só lugar." Mesmo tique do projeto antigo, herdado.
- **"O hub do mestre de RPG"**: "hub" é anglicismo morno e genérico. O próprio produto já tem um nome melhor para isso: **QG**. Usar "hub" joga fora o ativo de marca.

```tsx
// layout.tsx (metadata)
description: "O hub do mestre de RPG: organize campanhas, documente sessões,
  crie mundos e evolua como narrador. Plataforma Nuckturp.",
```

- Mesma trinca (agora quarteto: organize/documente/crie/evolua) + "evolua como narrador" beirando a inflação de significância. Para SEO a description está ok em tamanho, mas a voz é intercambiável com qualquer concorrente.
- "Plataforma Nuckturp." no fim é redundante (já está no `siteName`/template).

Veredito do meu texto: tecnicamente limpo, sem erro, mas **sem pulso**. É a "escrita sem alma" que a própria skill alerta — paralelismo perfeito, zero opinião, zero imagem concreta. Está mais AI-genérico que o melhor da landing antiga ("Pare de Improvisar").

---

## 3. Diretriz de voz para a nova versão

**Persona**: um mestre veterano de mesa brasileiro que já passou pela dor da prep bagunçada e construiu a ferramenta que queria ter. Fala de igual para igual com outro mestre, não de cima de um palco de marketing.

### Tom

- Confiante e direto. Frase curta vence frase elaborada.
- Provocador na medida (o hero "Pare de Improvisar" é o teto de ousadia; não precisa subir).
- Cúmplice nas dores — descreve o cenário real (5 apps, detalhe esquecido entre sessões), não a emoção abstrata.
- Microcopy de sistema (erros/vazios/toasts) = sóbrio e útil. A personalidade mora nas headlines e nos vazios, **não** nas mensagens de erro. Erro com piada irrita quem está travado.

### Pessoa e tratamento

- **2ª pessoa, "você"** (informal, sem "tu"). Confirmado pelo uso real: "seu QG", "junte-se aos mestres", "Crie sua primeira!".
- Tratar o usuário como **Mestre** (maiúsculo, quando for vocativo: "Bem-vindo, Mestre!"). É o cargo dele no nicho — usar isso é um carinho de marca barato e eficaz.
- Corrigir o JSON extraído na cabeça: a voz **não** é third-person/neutral.

### Vocabulário do nicho (usar com naturalidade, sem explicar)

mestre, mesa, sessão, campanha, aventura, arco narrativo, prep/preparação, ficha, NPC, lore, worldbuilding, gancho, encontro, rolagem, ficha, jogador, QG (sempre QG, nunca "hub"/"dashboard" no copy de marca).

### Sentence case

Headlines de seção e CTAs em **sentence case** ("Sua próxima sessão merece preparação séria", não "Sua Próxima Sessão..."). Title Case só em nomes próprios de produto ("Diário do Mestre", "Quadro de Ideias").

### O que evitar (checklist anti-AI específico do QG)

1. **Travessão decorativo** — trocar por vírgula, ponto ou parênteses. Quase nunca é necessário em pt-BR.
2. **Trinca por reflexo** — antes de escrever "X, Y e Z", perguntar se a lista é mesmo três. Se não for, não force.
3. **"Zero **_" / "sem _**, sem \_\_\_"** — no máximo uma vez no site inteiro.
4. **"épico", "dominar a arte", "leve seu jogo a outro nível", "merecem o melhor"** — banir. Inflação vazia.
5. **"hub", "solução", "plataforma definitiva", "experiência"** — anglicismos/genéricos de SaaS. Usar "QG", "ferramenta", nomes concretos.
6. **Emoji em headline/CTA** — fora. (Há "🎉/✨" no i18n de planos; manter só onde for celebração pontual e contida, nunca em erro/CTA.)
7. **Negative parallelism** ("não é X, é Y") — usar afirmação direta.
8. **Conclusão genérica positiva** em subtítulos de plano/feature — substituir por benefício concreto.

---

## 4. Reescritas-exemplo (trechos-chave)

### 4.1 Hero (subtítulo) — `app/page.tsx`

**Antes (meu texto):**

> O hub do mestre de RPG. Organize **campanhas**, documente _sessões_ e crie mundos — num só lugar.

**Depois:**

> Seu QG de mestre de RPG. Toda a campanha, as notas de sessão e o seu mundo param de viver espalhados em cinco apps.

Por quê: tira "hub", mata a trinca de verbos e o em-dash, e troca emoção genérica por uma imagem concreta (cinco apps) que já provou funcionar na landing antiga. A headline "QG do Mestre" continua acima; o subtítulo agora complementa em vez de repetir o padrão SaaS.

### 4.2 Metadata description — `app/layout.tsx`

**Antes:**

> O hub do mestre de RPG: organize campanhas, documente sessões, crie mundos e evolua como narrador. Plataforma Nuckturp.

**Depois:**

> O QG do mestre de RPG: suas campanhas, sessões, notas e mundo num lugar só, em vez de espalhados por planilhas e apps soltos.

Por quê: mantém as keywords de SEO (mestre, RPG, campanhas, sessões), corta o quarteto de verbos e a inflação ("evolua como narrador"), remove o "Plataforma Nuckturp." redundante. Continua dentro do limite de description.

### 4.3 CTA final — `LandingCtaSection.tsx`

**Antes:**

> **Sua próxima sessão merece preparação épica**
> Junte-se aos mestres que já centralizaram toda a preparação num único lugar. Sem planilhas, sem caos — só foco na história.

**Depois:**

> **Sua próxima sessão merece uma prep que aguenta a mesa**
> Os mestres que entraram pararam de caçar nota em quatro abas abertas. Aqui a campanha inteira fica num lugar só, e você chega na mesa sabendo onde parou.

Por quê: troca "épica" por um benefício concreto e com voz de mesa; elimina o "sem planilhas, sem caos —" (tailing negation + em-dash) e o reaproveitamento do "num único lugar". Mantém a prova social, mas em cenário concreto.

### 4.4 Empty state (já bom — refinar consistência) — i18n

**Antes (já decente):**

> Nenhuma campanha ainda. Crie sua primeira!

**Depois (padronizar tom em todos os vazios):**

> Nenhuma campanha por aqui ainda. Crie a primeira e comece a montar sua mesa.

Por quê: o atual já está no caminho certo. O ajuste só dá um respiro de voz ("montar sua mesa") sem inflar, e padroniza a fórmula para todos os vazios do app (nota/aventura/sessão/quadro), que hoje variam entre "Crie a primeira!" e "Crie sua primeira!". Definir um padrão único: **"Nenhum(a) \_\_\_ por aqui ainda. [ação concreta]."**

### 4.5 Mensagem de erro — `pages/Auth.tsx` / i18n

**Antes:**

> "Erro ao enviar e-mail de recuperação." / "Não foi possível criar a conta. Tente novamente."

**Depois:**

> "Não conseguimos enviar o e-mail de recuperação. Tente de novo em alguns instantes." / "Não deu para criar a conta agora. Confira o e-mail e tente de novo."

Por quê: erro é o único lugar onde a voz fica sóbria, mas ainda humana. "Erro ao \_\_\_" é telegrafês de sistema; a versão em 1ª pessoa do plural ("não conseguimos") soa como gente assumindo a falha, dá um próximo passo, e nunca tenta ser engraçada com quem está travado.

### 4.6 Bônus — e-mail transacional (não existe ainda; semente de voz)

Para o e-mail de confirmação/boas-vindas da nova versão, evitar o template SaaS ("Welcome aboard! We're thrilled..."). Semente:

> **Assunto:** Seu QG está pronto, Mestre
>
> Sua conta no QG do Mestre está ativa. Crie sua primeira campanha e jogue a primeira nota lá dentro, daquele NPC que você inventou no chuveiro e ia esquecer até a próxima sessão. É pra isso que o QG existe.
>
> [Abrir meu QG]

Por quê: vocativo "Mestre", imagem concreta (NPC no chuveiro), zero "thrilled/excited", CTA com posse ("meu QG"). Define o registro dos demais transacionais.

---

## Próximos passos

1. Aplicar 4.1 e 4.2 já no `app/page.tsx` e `app/layout.tsx` (são meu texto, baixo risco) — quando o Marco aprovar a direção de voz.
2. Transformar a seção 3 num bloco "Voz e tom" curto no design system da nova versão, para o copy de UI nascer alinhado.
3. Ao portar o i18n, padronizar os empty states pela fórmula da 4.4 e revisar os erros pela 4.5 (regra: erro sóbrio, vazio com voz, headline provocadora).
