# Architecture Decision Records (ADR)

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

Registro imutável das decisões arquiteturais. Formato: Contexto → Decisão → Consequências. Decisões superadas viram `Superseded by ADR-XXXX` (não se apaga histórico).

| ADR | Título | Status |
|---|---|---|
| [0001](ADR-0001-nextjs-app-router.md) | Next.js App Router como framework | Aceito |
| [0002](ADR-0002-supabase-proprio.md) | Supabase próprio (cópia, não transfer) | Aceito |
| [0003](ADR-0003-hostinger-standalone.md) | Hostinger VPS "A" via `output: standalone` | Aceito |
| [0004](ADR-0004-auth-supabase-ssr.md) | Auth via `@supabase/ssr` + preservação de UUID | Aceito |
| [0005](ADR-0005-edge-functions-deno.md) | Edge Functions Deno permanecem no Supabase | Aceito |

> Resumo cruzado no Decision Log de [../MIGRACAO-NEXTJS.md](../MIGRACAO-NEXTJS.md).
