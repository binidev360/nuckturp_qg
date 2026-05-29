#!/usr/bin/env bash
# ============================================================================
# sync-storage.sh — Espelha buckets Supabase Storage entre dois projetos.
# ----------------------------------------------------------------------------
# Usa a Storage API (S3-compatible) via rclone OU curl direto.
# Recomendado: rclone com remotes S3 (endpoint Supabase Storage).
#
# Pré-requisitos:
#   - rclone instalado (brew install rclone | apt install rclone)
#   - Source: SOURCE_SUPABASE_URL, SOURCE_SERVICE_ROLE_KEY
#   - Target: TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY
#   - Lista de buckets em $BUCKETS (default: profile-assets blog-assets public-assets)
#
# Uso:
#   ./scripts/sync-storage.sh
# ============================================================================
set -euo pipefail

: "${SOURCE_SUPABASE_URL:?}"; : "${SOURCE_SERVICE_ROLE_KEY:?}"
: "${TARGET_SUPABASE_URL:?}"; : "${TARGET_SERVICE_ROLE_KEY:?}"
BUCKETS="${BUCKETS:-profile-assets blog-assets public-assets}"

WORK="$(mktemp -d)"
echo "→ Workdir: $WORK"

for B in $BUCKETS; do
  echo "─── bucket: $B ───"
  mkdir -p "$WORK/$B"

  # Lista objetos via API
  curl -s -H "Authorization: Bearer $SOURCE_SERVICE_ROLE_KEY" \
    -H "apikey: $SOURCE_SERVICE_ROLE_KEY" \
    -X POST "$SOURCE_SUPABASE_URL/storage/v1/object/list/$B" \
    -H "Content-Type: application/json" \
    -d '{"limit":10000,"offset":0}' \
    | jq -r '.[].name' > "$WORK/$B.list"

  TOTAL=$(wc -l < "$WORK/$B.list")
  echo "  $TOTAL arquivos a copiar"

  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    # Download
    curl -s -H "Authorization: Bearer $SOURCE_SERVICE_ROLE_KEY" \
      "$SOURCE_SUPABASE_URL/storage/v1/object/$B/$path" \
      -o "$WORK/$B/$(basename "$path")"
    # Upload (preserva path)
    curl -s -X POST \
      -H "Authorization: Bearer $TARGET_SERVICE_ROLE_KEY" \
      -H "apikey: $TARGET_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/octet-stream" \
      --data-binary "@$WORK/$B/$(basename "$path")" \
      "$TARGET_SUPABASE_URL/storage/v1/object/$B/$path" > /dev/null
    rm -f "$WORK/$B/$(basename "$path")"
  done < "$WORK/$B.list"

  echo "  ✓ $B sincronizado"
done

rm -rf "$WORK"
echo "✓ Storage sync concluído"
