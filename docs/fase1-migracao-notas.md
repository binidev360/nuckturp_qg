# Fase 1 — Notas da reconstrução do schema (2026-05-29)

> Schema do app antigo reconstruído no Supabase próprio (ref `fciqovzbtasbkxupxidb`) via `supabase db push` pelo **session pooler** (IPv4). Projeto antigo intocado.

## Resultado

- **209/209 migrations aplicadas.**
- **85 tabelas** públicas (reconcilia o "56 vs 85" do inventário → o número real é **85**), **4 views**, **80 funções**.
- **0 tabelas sem RLS** (RLS em 100%, confirma a Onda A).
- Extensões já presentes no projeto (pg_net, pg_cron, supabase_vault) — NOTICEs de "already exists" inofensivos.
- Tabelas-chave confirmadas: `profiles`, `user_roles`, `premium_overrides`, `campaigns`, `posts`, `players`.
- Types TS regenerados do banco: `lib/supabase/database.types.ts`.

## Correções aplicadas (2 migrations do Lovable estavam bugadas — ambas da Academia, feature cortada no pivot)

1. **`20260326000002_nps_retention_logic.sql`** — a view `view_academy_retention_risk` referenciava `profiles.full_name` e `profiles.email`, colunas que **não existem** (bug do Lovable; `full_name` só existe como chave em `raw_user_meta_data`). Nenhuma migration posterior corrigia. **Fix:** removidas as duas colunas e o join com `profiles`; view mantida válida (Academia, tabelas preservadas por C6).

2. **`20260327101808_...2cafe617....sql`** — re-criava `academy_courses/course_modules/lessons/course_progress` que **já existiam** (criadas por migrations anteriores); falhava com "relation already exists". **Fix:** neutralizada (no-op documentado); as tabelas e policies já existem.

> Ambas são da **Academia**, que o pivot remove do app (tabelas mantidas, C6). O core (campanhas, diário, jogadores, blog, etc.) aplicou limpo. As correções ficam versionadas nas migrations do QG; não afetam o import de dados reais no cutover.

## Conexão usada

- Migrations/`db push`/`gen types` → **session pooler 5432** (`SUPABASE_DB_URL`). Direct (IPv6) não resolve em IPv4 nesta máquina.
- `gen types` rodou via `--project-id` + access token (Management API), não via `--db-url`.

## Pendente na Fase 1

- 0.3: camada `@supabase/ssr` (`lib/supabase/{client,server,middleware,admin}`) + `.env.local`.
- 1.4: deploy das 26 Edge Functions (precisa repor secrets) + saída do lock-in.
- 1.5: seed sintético.
