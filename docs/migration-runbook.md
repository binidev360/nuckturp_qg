# Runbook de Migração — Lovable Cloud → Supabase próprio / Next.js

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

Este documento descreve como sair do Lovable Cloud sem perder dados nem
depender de nenhum recurso bloqueado do painel. Toda a operação roda com
**connection string Postgres + service-role key + Storage API** — nenhum acesso
ao dashboard do provedor é necessário.

---

## ⚠️ Gap conhecido: schema `auth` não é exportado

O `scripts/export-supabase.sh` **atual** (herdado do projeto antigo) só faz
`pg_dump --schema=public` — ou seja, **NÃO exporta o schema `auth`**. Sem o
schema `auth`, **os usuários não migram**: `auth.users` e `auth.identities`
ficam de fora, e qualquer import recria contas do zero (UUIDs novos) → quebra o
vínculo usuário↔conteúdo e força reset de senha em massa. Isso viola a regra
inquebrável (preservar UUIDs + `email_confirmed_at`).

**Correção obrigatória para a versão do script que viver no QG:** incluir um
dump dedicado do schema `auth` com `--data-only`, cobrindo no mínimo as tabelas
`auth.users` e `auth.identities`, para migrar usuários **preservando
UUIDs + `email_confirmed_at`** (e o hash bcrypt de senha + o vínculo Google das
identities). Esboço do que precisa ser adicionado:

```bash
# além do dump de public, exportar os dados do schema auth (usuários + identidades)
pg_dump "$SUPABASE_DB_URL" \
  --schema=auth --data-only \
  --table=auth.users \
  --table=auth.identities \
  --no-owner --no-privileges \
  -f "$OUTDIR/06b-auth-data.sql"
```

> O hash de senha (`auth.users.encrypted_password`) só serve se for bcrypt
> GoTrue padrão — isso é exatamente o que o **spike 00.1** valida (NO-GO aborta).
> Preservar `auth.identities` é o que mantém o login Google funcionando para
> usuários com identidade dupla.

A nota da §1 sobre **"Transfer ownership"** permanece válida como **fallback**:
é o gate do **spike 00.2** — se a connection string `Direct` + `service_role`
não forem obteníveis sem transfer, há PAUSA e decisão explícita do Marco.

---

## 1. Pré-requisitos

| Item | Onde obter |
|---|---|
| `SUPABASE_DB_URL` (origem) | Connector Lovable Cloud → Database → Connection string (modo `Direct`) |
| `SUPABASE_SERVICE_ROLE_KEY` (origem) | Connector → API Keys → `service_role` |
| `SUPABASE_ACCESS_TOKEN` (opcional, p/ listar secrets) | https://supabase.com/dashboard/account/tokens |
| Projeto Supabase de destino criado | https://supabase.com/dashboard (free tier serve para validar) |
| `pg_dump` 15+, `psql`, `jq`, `curl`, `bash` | `brew install postgresql@15 jq` |

> **Nota:** caso o painel Lovable não exponha a connection string direta, peça
> "Transfer ownership" para mover o projeto Supabase para sua conta — isso
> destrava 100% das credenciais sem mover dados.

---

## 2. Export (sem downtime, pode rodar quantas vezes quiser)

```bash
export SUPABASE_DB_URL="postgresql://postgres:...@db.nhygqpnhumgxslpoachu.supabase.co:5432/postgres"
export SUPABASE_URL="https://nhygqpnhumgxslpoachu.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
export SUPABASE_ACCESS_TOKEN="sbp_..."   # opcional
export SUPABASE_PROJECT_REF="nhygqpnhumgxslpoachu"

./scripts/export-supabase.sh --with-data
```

Saída em `export/<timestamp>/`:

```
01-schema.sql           02-policies.sql        03-functions.sql
04-extensions.sql       05-cron.sql            06-data.sql
07-storage-buckets.json 08-edge-functions/     09-secrets-names.txt
10-config.toml          manifest.json
```

Versionar `export/` em repo privado para ter histórico.

---

## 3. Provisionar destino

```bash
export TARGET_DB_URL="postgresql://postgres:...@db.NOVO_REF.supabase.co:5432/postgres"
./scripts/import-supabase.sh export/20260522T120000Z --with-data
```

Reconfigurar secrets no novo projeto (a lista de nomes está em
`09-secrets-names.txt`) — os **valores** devem ser repostos manualmente
(Stripe, OpenAI, Resend, VAPID...).

Deploy das edge functions:

```bash
supabase link --project-ref NOVO_REF
supabase functions deploy --project-ref NOVO_REF
```

---

## 4. Sync de Storage (delta antes do cutover)

```bash
export SOURCE_SUPABASE_URL="https://nhygqpnhumgxslpoachu.supabase.co"
export SOURCE_SERVICE_ROLE_KEY="eyJ..."
export TARGET_SUPABASE_URL="https://NOVO_REF.supabase.co"
export TARGET_SERVICE_ROLE_KEY="eyJ..."

./scripts/sync-storage.sh
```

Pode rodar **enquanto o app continua online** — rerun antes do cutover só
copia o delta.

---

## 5. Cutover (≈5 min de downtime)

1. **Freeze writes** — coloca o app em modo manutenção (banner + 503).
2. **Dump final** — `./scripts/export-supabase.sh --with-data` (delta de dados).
3. **Restore** — `./scripts/import-supabase.sh export/<latest> --with-data`.
4. **Sync storage final** — `./scripts/sync-storage.sh`.
5. **Troca env vars**:
   - Frontend: `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` → novo URL.
   - Cloudflare Worker (`cloudflare-worker.js`): troca origem.
   - Google OAuth: adiciona novo `redirect_uri` em
     `console.cloud.google.com/apis/credentials` (mantém o antigo por 24h).
6. **Smoke test** — login Google + login email + upload + post novo.
7. **Unfreeze** — remove banner.

---

## 6. Migração Vite → Next.js (independente do passo 5)

O app já usa exclusivamente:

- `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
- Connection string padrão Supabase (`createClient(url, key)`)

Em Next.js, basta:

1. Trocar todos os `import { supabase } from "@/integrations/supabase/client"`
   por `import { supabase } from "@/integrations/supabase/portable"`
   (ver `src/integrations/supabase/portable.ts`).
2. Renomear variáveis: `VITE_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`.
   O `portable.ts` aceita ambos os prefixos automaticamente.
3. Server-side: usar `createServerClient({ serviceRole: true })` para
   bypass de RLS em route handlers / server actions.

---

## 7. Checklist de lock-in residual (zerar antes do cutover)

- [ ] Secrets reconfigurados no destino (lista em `09-secrets-names.txt`)
- [ ] OAuth redirect URIs atualizados (Google)
- [ ] Webhooks Stripe apontando para nova edge function
- [ ] Cron jobs ativos no destino (`SELECT * FROM cron.job`)
- [ ] Realtime publication recriado (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`)
- [ ] CDN Cloudflare apontando para novo Storage origin
- [ ] DNS `nuckturp.com.br` mantém TTL baixo (300s) 24h antes do switch

---

## 8. Rollback

Se algo quebrar no cutover:

1. Reverter env vars do frontend (origem voltou a ser fonte de verdade).
2. Tirar app do modo manutenção.
3. Investigar; dados gravados no destino durante a janela ficam órfãos —
   exportar com `./scripts/export-supabase.sh --with-data` do destino e
   reaplicar no origem (raro, mas documentado).

---

> **Princípio**: tudo aqui usa APIs públicas Supabase/Postgres. Nenhum passo
> exige o painel Lovable, dashboard `app.supabase.com`, ou qualquer ferramenta
> proprietária. Auditável, versionável, idempotente.
