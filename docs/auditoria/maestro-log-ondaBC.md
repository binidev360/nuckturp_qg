# Maestro Log — Auditoria Ondas B + C (item 2)

Iniciado: 2026-05-29 · Ambiente: Claude Code (Windows) · Orquestrador: /maestro

## Spec validado

Completar a auditoria preliminar (read-only no projeto antigo) com 2 entregáveis em `docs/auditoria/`, pivot-aware (QG 100% pago, Academia removida, paywall global, tiers, IA metered).
**DoD:** (1) `interconexao.md` (feature→camadas + ≥4 fluxos Mermaid); (2) `codemap-legado.md` (navegação do `src/` por feature, Academia fora); (3) `.claude/INDEX.md` expandido; (4) commit+push, projeto antigo intocado.

## Plano (v1) — 4 steps

[1] Onda B → interconexao.md (subagent) · [2] Onda C → codemap-legado.md (subagent) · [3] CHECK + expandir INDEX · [4] REVIEW + commit.

## Log de execução

- **Step 1 (Onda B):** ✅ `interconexao.md` (182 linhas, 4 fluxos Mermaid, 14 features + 13 serviços). Achado load-bearing: billing antigo SEM webhook Stripe (polling 5min) → paywall global exige webhook + `entitlements`.
- **Step 2 (Onda C):** ✅ `codemap-legado.md` (256 linhas, 13 features ativas + seção "fora do escopo: Academia"). Achado: hooks da Academia compartilhados com Blog/Admin/Notas — não deletar cego.
- **Step 3 (CHECK + INDEX):** ✅ validados (paths/estrutura/Mermaid). INDEX expandido com mapa de navegação + 2 achados. Achados propagados ao `PIVOT-MODELO-PAGO.md` (§8) e TODO.
- **Step 4 (REVIEW + commit):** ver abaixo.

## Decisão autônoma (Regra dos 3 Caminhos) — escopo de "CODEMAP"

Contexto: maestro args pediam "gerar CODEMAP". Opções: (A) rodar `gerar_codemap.py` (Python) no projeto novo — quase vazio, baixo valor agora; (B) CODEMAP do projeto antigo via script — é TS/React, o script é Python-specific, e o antigo é read-only; (C) mapa de navegação hand-built do `src/` antigo por feature, focado em "onde portar".
Sweet spot: **C** — entrega o valor real do item 6 (achar código rápido, economizar token nas fases de port) sem forçar uma ferramenta Python em código TS. CODEMAP por script do projeto NOVO fica para quando o código crescer.

## Review Pass

- DoD1 interconexao.md ✅ (4 fluxos Mermaid) · DoD2 codemap-legado.md ✅ (Academia fora) · DoD3 INDEX expandido ✅ · DoD4 commit+push + antigo intocado ✅.
- Consistência: pivot refletido nos 2 docs; sem em-dash em conteúdo; nomes reais de tabelas/functions.
- Resultado: **APROVADO**.

## Aprendizados

- Reaproveitar os inventários prévios (`docs/inventario/`) tornou as Ondas B/C baratas — síntese > re-exploração.
- Achado recorrente: a lacuna de webhook do billing e a IA sem quota convergem com os requisitos do pivot (paywall + IA metered). Auditoria e produto se encontraram.
