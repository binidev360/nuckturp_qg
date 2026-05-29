# ADR-0001 — Next.js App Router como framework

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

- **Status:** Aceito · **Data:** 2026-05-22

## Contexto
O app atual é uma SPA Vite/React com React Router. SEO é driver principal (tráfego de conteúdo D&D 5e), mas SPA não entrega SSR/SSG. Há lock-in no Lovable que queremos eliminar.

## Decisão
Reescrita idiomática completa em **Next.js 15 (App Router)**: Server Components por padrão, Server Actions para mutações, ISR (`generateStaticParams` + `revalidate`) para conteúdo, `generateMetadata` para SEO, route handlers para webhooks/sitemap/RSS/OG.

## Alternativas consideradas
- **Lift-and-shift** (embrulhar a SPA no Next) — rejeitado: não entrega o SEO idiomático nem a base limpa desejada.
- **Híbrido faseado** — rejeitado: o objetivo declarado é reescrita completa, sem prazo, com foco em qualidade.
- **Manter Vite + SSR custom** — rejeitado: reinventa o que o Next entrega pronto.

## Consequências
- ✅ SSR/SSG/ISR nativos; SEO de primeira; base própria e moderna.
- ✅ Padrões validados via Context7 (RSC, server actions, revalidateTag).
- ⚠️ Esforço alto (445 arquivos) → mitigado pelo faseamento 8×5.
- ⚠️ Curva de Server Components/Actions → convenções em [developer_guide.md](../developer_guide.md).
