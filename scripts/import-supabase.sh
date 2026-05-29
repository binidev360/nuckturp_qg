#!/usr/bin/env bash
# ============================================================================
# import-supabase.sh — Restaura export em um Supabase de destino.
# ----------------------------------------------------------------------------
# Portado para o QG em 2026-05-28. Diferenca vs. versao antiga (Nuckturp_2.1):
# importa o 11-auth-data.sql (usuarios) ANTES dos dados de public — as FKs
# `user_id` de public apontam para auth.users; sem auth antes, o import quebra
# por violacao de chave estrangeira.
# Uso:
#   export TARGET_DB_URL="postgresql://postgres:...@db.<new>.supabase.co:5432/postgres"
#   ./scripts/import-supabase.sh export/20260522T120000Z [--with-data]
# ============================================================================
set -euo pipefail

EXPORT_DIR="${1:?passe o diretorio do export}"
WITH_DATA=0
[[ "${2:-}" == "--with-data" ]] && WITH_DATA=1
: "${TARGET_DB_URL:?defina TARGET_DB_URL}"

echo "→ Importando $EXPORT_DIR para destino"

# Ordem importa: extensoes → schema → funcoes → policies → cron → AUTH → dados public
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$EXPORT_DIR/04-extensions.sql"
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$EXPORT_DIR/01-schema.sql"
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$EXPORT_DIR/03-functions.sql"
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$EXPORT_DIR/02-policies.sql"
[[ -s "$EXPORT_DIR/05-cron.sql" ]] && psql "$TARGET_DB_URL" -f "$EXPORT_DIR/05-cron.sql" || true

# AUTH primeiro (preserva UUIDs + identities; dados de public dependem de auth.users).
if [[ $WITH_DATA -eq 1 && -f "$EXPORT_DIR/11-auth-data.sql" ]]; then
  echo "→ Importando auth (users + identities), preservando UUIDs..."
  psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$EXPORT_DIR/11-auth-data.sql"
fi

if [[ $WITH_DATA -eq 1 && -f "$EXPORT_DIR/06-data.sql" ]]; then
  psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$EXPORT_DIR/06-data.sql"
fi

# Recria buckets via SQL (idempotente)
if [[ -f "$EXPORT_DIR/07-storage-buckets.json" ]]; then
  jq -r '.buckets[] | "INSERT INTO storage.buckets (id,name,public) VALUES (\x27" + .id + "\x27,\x27" + .name + "\x27," + (.public|tostring) + ") ON CONFLICT (id) DO NOTHING;"' \
    "$EXPORT_DIR/07-storage-buckets.json" | psql "$TARGET_DB_URL"
fi

echo "✓ Import concluido. Proximos passos:"
echo "  1. Rode scripts/sync-storage.sh para copiar arquivos"
echo "  2. Reconfigure secrets no novo projeto (lista em 09-secrets-names.txt)"
echo "  3. Deploy edge functions: supabase functions deploy --project-ref NEW"
echo "  4. Reconfigure OAuth redirect URIs (Google etc.)"
