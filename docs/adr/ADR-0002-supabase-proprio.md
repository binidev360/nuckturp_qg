# ADR-0002 — Supabase próprio (cópia, não transferência)

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

- **Status:** Aceito · **Data:** 2026-05-22

## Contexto
O backend roda em Supabase gerenciado pelo Lovable Cloud — não aparece na conta Supabase do dono, dashboard nativo bloqueado (lock-in). Queremos posse total dos dados.

## Decisão
**Copiar** o backend para um Supabase novo na conta própria, via os scripts do [migration-runbook.md](../migration-runbook.md) (export/import/sync-storage usando connection string + service-role + Storage API). O Lovable permanece intacto como rede de segurança até o descomissionamento.

**Schema entra cedo** (a partir de `supabase/migrations`); **dados + usuários + storage só no cutover** (janela de manutenção).

## Alternativas consideradas
- **Transfer ownership** do projeto Supabase — rejeitado como caminho principal (era só fallback p/ destravar credencial); copiar mantém a origem como backup.
- **Copiar tudo de uma vez no início** — rejeitado: dado envelhece entre cópia e corte.

## Consequências
- ✅ Posse e controle; Lovable como fallback; operação auditável e idempotente.
- ✅ Supabase **Free p/ dev, Pro em produção** (backups + egress) — ver [ADR-0003](ADR-0003-hostinger-standalone.md) e [security.md](../security.md).
- ⚠️ Secrets repostos manualmente no destino (lista em `09-secrets-names.txt`).
