#!/usr/bin/env bash
# ============================================================================
# export-supabase.sh — Export completo do projeto Supabase (anti lock-in)
# ----------------------------------------------------------------------------
# Portado para o QG em 2026-05-28. Diferenca vs. versao antiga (Nuckturp_2.1):
# agora exporta TAMBEM o schema `auth` (auth.users + auth.identities). Sem isso
# os USUARIOS nao migram — a versao antiga so cobria o schema `public`, deixando
# de fora a tabela mais critica do cutover (preservar UUIDs + identities).
#
# Gera, em ./export/<timestamp>/:
#   01-schema.sql           — DDL public (tabelas, types, indices)
#   02-policies.sql         — RLS policies, grants
#   03-functions.sql        — funcoes, triggers, views (public)
#   04-extensions.sql       — extensoes instaladas
#   05-cron.sql             — jobs do pg_cron
#   06-data.sql             — dados public (opcional, --with-data)
#   07-storage-buckets.json — buckets + policies
#   08-edge-functions/      — codigo das edge functions
#   09-secrets-names.txt    — nomes (NAO valores) das secrets
#   10-config.toml          — supabase/config.toml atual
#   11-auth-data.sql        — auth.users + auth.identities (--with-data) — preserva UUIDs
#   manifest.json
#
# Requisitos: psql, pg_dump (>=15), jq. Opcional: supabase CLI.
# Uso:
#   export SUPABASE_DB_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres"  # Direct
#   export SUPABASE_URL="https://<ref>.supabase.co"
#   export SUPABASE_SERVICE_ROLE_KEY="..."
#   ./scripts/export-supabase.sh [--with-data]
# ============================================================================
set -euo pipefail

WITH_DATA=0
[[ "${1:-}" == "--with-data" ]] && WITH_DATA=1

: "${SUPABASE_DB_URL:?defina SUPABASE_DB_URL (postgresql://...)}"
: "${SUPABASE_URL:?defina SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?defina SUPABASE_SERVICE_ROLE_KEY}"

TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="export/${TS}"
mkdir -p "$OUT/08-edge-functions"

echo "→ Exportando para $OUT"

# 01. Schema public (estrutura, sem dados)
pg_dump "$SUPABASE_DB_URL" \
  --schema=public --schema-only --no-owner --no-privileges \
  --exclude-table-data='*' \
  -f "$OUT/01-schema.sql"

# 02. Policies + grants (extraido via pg_dump completo, filtrado)
pg_dump "$SUPABASE_DB_URL" --schema=public --schema-only --no-owner \
  | grep -E '^(CREATE POLICY|ALTER TABLE.*ENABLE ROW|GRANT |REVOKE )' \
  > "$OUT/02-policies.sql" || true

# 03. Funcoes, triggers e views (public)
psql "$SUPABASE_DB_URL" -At -o "$OUT/03-functions.sql" <<'SQL'
SELECT pg_get_functiondef(p.oid) || E';\n'
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;
SQL

# 04. Extensoes
psql "$SUPABASE_DB_URL" -At -o "$OUT/04-extensions.sql" <<'SQL'
SELECT 'CREATE EXTENSION IF NOT EXISTS "' || extname || '";'
FROM pg_extension WHERE extname NOT IN ('plpgsql');
SQL

# 05. Cron jobs
psql "$SUPABASE_DB_URL" -At -o "$OUT/05-cron.sql" <<'SQL' || echo "-- pg_cron nao disponivel" > "$OUT/05-cron.sql"
SELECT format('SELECT cron.schedule(%L, %L, %L);', jobname, schedule, command)
FROM cron.job ORDER BY jobid;
SQL

# 06. Dados public (opcional)
if [[ $WITH_DATA -eq 1 ]]; then
  echo "→ Dumping public data..."
  pg_dump "$SUPABASE_DB_URL" --schema=public --data-only \
    --no-owner --disable-triggers \
    -f "$OUT/06-data.sql"
fi

# 07. Storage buckets + policies
psql "$SUPABASE_DB_URL" -At <<'SQL' > "$OUT/07-storage-buckets.json"
SELECT json_build_object(
  'buckets', (SELECT json_agg(row_to_json(b)) FROM storage.buckets b),
  'policies', (
    SELECT json_agg(json_build_object(
      'policy', polname, 'table', 'storage.' || c.relname,
      'cmd', polcmd::text, 'roles', polroles::text,
      'using', pg_get_expr(polqual, polrelid),
      'check', pg_get_expr(polwithcheck, polrelid)
    ))
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage'
  )
);
SQL

# 08. Edge functions (copia do projeto)
if [[ -d supabase/functions ]]; then
  cp -r supabase/functions/* "$OUT/08-edge-functions/" 2>/dev/null || true
fi

# 09. Nomes das secrets (Supabase Management API; falha silenciosa se sem token)
if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" && -n "${SUPABASE_PROJECT_REF:-}" ]]; then
  curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/secrets" \
    | jq -r '.[].name' > "$OUT/09-secrets-names.txt" || true
else
  echo "# Configure SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF p/ listar secrets" \
    > "$OUT/09-secrets-names.txt"
fi

# 10. Config TOML
[[ -f supabase/config.toml ]] && cp supabase/config.toml "$OUT/10-config.toml"

# 11. AUTH (usuarios + identities) — CRITICO: preserva UUIDs + email_confirmed_at.
#     Schema `auth` ja existe no destino (criado pelo GoTrue); copiamos so os DADOS.
#     --disable-triggers evita o disparo de hooks do GoTrue durante o restore.
if [[ $WITH_DATA -eq 1 ]]; then
  echo "→ Dumping auth (users + identities)..."
  pg_dump "$SUPABASE_DB_URL" \
    --data-only --no-owner --disable-triggers \
    --table=auth.users --table=auth.identities \
    -f "$OUT/11-auth-data.sql"
fi

# Manifest
cat > "$OUT/manifest.json" <<JSON
{
  "exported_at": "$TS",
  "source_url": "$SUPABASE_URL",
  "with_data": $([ $WITH_DATA -eq 1 ] && echo true || echo false),
  "files": $(ls -1 "$OUT" | jq -R . | jq -s .),
  "table_count": $(psql "$SUPABASE_DB_URL" -At -c "SELECT count(*) FROM pg_tables WHERE schemaname='public'"),
  "function_count": $(psql "$SUPABASE_DB_URL" -At -c "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'"),
  "policy_count": $(psql "$SUPABASE_DB_URL" -At -c "SELECT count(*) FROM pg_policy"),
  "auth_user_count": $(psql "$SUPABASE_DB_URL" -At -c "SELECT count(*) FROM auth.users")
}
JSON

echo "✓ Export concluido em $OUT"
ls -lh "$OUT"
