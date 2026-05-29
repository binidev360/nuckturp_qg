# Spike de fonte (E2) — Inter × Geist + mono

> Comparativo visual para decidir a fonte de corpo da nova versão. Display segue **Space Grotesk** (não está em jogo). Artefato interativo: `spike-fontes.html` (abrir no navegador, tema dark, julgar no próprio monitor). Data: 2026-05-29.

## O que foi comparado

- **Corpo:** Inter vs Geist (mesmo conteúdo de marca, com `<strong>` lime + `<em>` violet).
- **Números/dados densos** (rolagem d20, CA/PV, KPIs): Inter tabular vs Geist Mono vs JetBrains Mono.

## Leitura

- **Inter** — neutra, battle-tested, excelente em UI densa. Risco: é o "default de SaaS" que a `taste-skill` sinalizou como tell de design genérico.
- **Geist** — levemente mais geométrica e contemporânea, mantém legibilidade alta no corpo. Dá um traço de personalidade sem custar leitura; diferencia do "Inter em tudo".
- **Geist Mono** — monoespaçada limpa e coesa com Geist; ótima para números de dado/KPIs.
- **JetBrains Mono** — excelente legibilidade, porém com cara mais "ferramenta de código".

## Recomendação

**Geist (corpo) + Geist Mono (números), mantendo Space Grotesk no display.** Sistema tipográfico coeso, contemporâneo e sutilmente distintivo, sem perder legibilidade no cockpit denso, e que **evita o tell do Inter-default**. **Inter continua o fallback seguro** se, na leitura longa, Geist parecer geométrico demais.

> Decisão é subjetiva e depende de tela. Abra `spike-fontes.html` e confirme a sua preferência.

## Como aplicar (após a escolha)

- `app/layout.tsx`: trocar `Inter` por `Geist` em `next/font/google` (ou manter Inter) + adicionar `Geist_Mono` (ou `JetBrains_Mono`).
- `app/globals.css` (`@theme`): mapear `--font-sans` (corpo) e adicionar `--font-mono` (números). Usar `font-mono` + `tabular-nums` em dados/dado.
