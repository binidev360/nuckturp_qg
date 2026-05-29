# ADR-0005 — Edge Functions Deno permanecem no Supabase

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

- **Status:** Aceito · **Data:** 2026-05-22

## Contexto
Existem ~26 Edge Functions (Deno) cobrindo Stripe, IA (Gemini), e-mail, OCR de recibo, scraping, sitemap, RSS, push, import WordPress, OG images etc. Reescrevê-las como route handlers do Next seria esforço alto e desnecessário.

## Decisão
As Edge Functions **permanecem em Deno no Supabase próprio**, migradas **como estão** (deploy via `supabase functions deploy`). Refatoração apenas **oportunista**. Onde fizer sentido (ex.: webhooks acoplados ao app), pode-se mover pontualmente para route handlers do Next, caso a caso.

## Alternativas consideradas
- **Migrar tudo para route handlers Next** — rejeitado: esforço alto, sem ganho claro, e algumas dependem de cron/Storage do Supabase.
- **Manter no Lovable** — impossível: o objetivo é sair do Lovable.

## Consequências
- ✅ Minimiza superfície de reescrita; funções já testadas continuam valendo.
- ✅ Backend lógico co-localizado com o Postgres/RLS/Storage.
- ⚠️ Secrets das functions repostos no destino; cron (`pg_cron`) e realtime publication recriados (checklist do [migration-runbook.md](../migration-runbook.md) §7).
