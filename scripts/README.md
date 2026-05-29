# scripts/ — tooling de migração Lovable → Supabase próprio

Portados do projeto antigo (`Nuckturp_2.1`) em 2026-05-28, **com correção do schema `auth`** (a versão antiga só exportava `public`, deixando os usuários de fora). Toda a operação usa connection string Postgres + service-role + Storage API — **nenhum acesso ao painel Lovable é necessário** (o fallback "transfer ownership" só entra se a connection string `Direct` não for liberada — gate do spike 00.2).

## Scripts

| Script | O que faz |
|---|---|
| `export-supabase.sh [--with-data]` | Exporta schema `public` (DDL, RLS, functions, cron, buckets, edge functions, secrets-names) **+ `auth.users` e `auth.identities`** (`11-auth-data.sql`, só com `--with-data`). |
| `import-supabase.sh <export-dir> [--with-data]` | Restaura no destino na ordem correta: extensões → schema → functions → policies → cron → **auth** → dados public → buckets. |
| `sync-storage.sh` | Espelha os buckets de Storage da origem para o destino via Storage API (delta-friendly, pode rodar com o app online). |

## Correção do schema `auth` (por que importa)

`auth.users.encrypted_password` + `auth.identities` são o que preserva **login sem reset de senha** e o **vínculo Google**. O import aplica o `auth` **antes** dos dados de `public` porque as FKs `user_id` apontam para `auth.users`. Preservar os **UUIDs + `email_confirmed_at`** é a regra inquebrável (D8/ADR-0004). Validação real disso = spikes **00.1** (auth) e **00.4** (ensaio de cutover).

## Pré-requisitos (instalar antes de rodar)

`pg_dump`/`psql` (>= 15), `jq`, `curl`. Opcional: `supabase` CLI (deploy de functions), `rclone` (alternativa ao curl no sync-storage). Hoje **ausentes na máquina** — método de instalação a definir com o Marco (scoop/winget/binários).

## Variáveis de ambiente (carregar de `.secrets/`, nunca commitar)

```
# origem (Lovable)
SUPABASE_DB_URL=postgresql://postgres:<senha>@db.<ref>.supabase.co:5432/postgres   # Direct
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role>
SUPABASE_PROJECT_REF=<ref>            # opcional (secrets-names)
SUPABASE_ACCESS_TOKEN=sbp_...         # opcional
# destino
TARGET_DB_URL=postgresql://postgres:<senha>@db.<new>.supabase.co:5432/postgres
# sync-storage
SOURCE_SUPABASE_URL / SOURCE_SERVICE_ROLE_KEY / TARGET_SUPABASE_URL / TARGET_SERVICE_ROLE_KEY
```

## Ressalva — buckets do Storage

O inventário (`docs/inventario/schema.md`) aponta **6 buckets**, mas o `sync-storage.sh` traz um default de 3 (`profile-assets blog-assets public-assets`). **Antes de rodar o sync**, conferir a lista real (do `07-storage-buckets.json` gerado no export) e passar via `BUCKETS="b1 b2 ..."`. TODO: tornar o sync dinâmico lendo o JSON de buckets.

## Saída do export

Versionar `export/` está **bloqueado no git** (`.gitignore`): contém dados de usuários e hashes. Guardar localmente / em cofre privado.
