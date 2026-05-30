# Migração via Dev Bridge — resultado da validação (2026-05-30)

> Ponte HTTP **read-only** do QG antigo (Lovable Cloud, projeto `nhygqpnhumgxslpoachu`)
> que expõe banco + storage + auth sem `service_role` nem connection string.
> Cliente: `scripts/dev-bridge-pull.mjs`. Credenciais em `.secrets/dev.env` (gitignored).
> Dumps em `export/` (gitignored). **Nada é escrito no banco novo** nesta fase.

## O que a ponte resolve

- **Dados** (tabelas da allowlist) via cursor pagination (`/table/:name?order=&after=`).
- **Storage** (listagem + signed URL de 1h por arquivo).
- **Auth** (id/UUID, email, `email_confirmed_at`, metadata) — preserva a identidade p/ FKs.

## O que NÃO resolve (gap conhecido)

- **Senhas (`encrypted_password`) e `auth.identities`** não são expostos. Para um cutover
  transparente (guardrail #3: mesmos UUIDs + identities + email_confirmed, sem reset),
  precisaremos no cutover de um dump do schema `auth` do projeto antigo (connection string /
  `pg_dump`). É a Fase 00.1/2.2 do plano. A ponte cobre todo o resto.

## Snapshot puxado (validação, 2026-05-30)

### Tabelas (30/32 OK) — `export/db/*.jsonl`, contagens em `export/_counts.json`

| Tabela            | Linhas |     | Tabela                     |  Linhas |
| ----------------- | -----: | --- | -------------------------- | ------: |
| profiles          |    353 |     | sessions                   |     277 |
| tenants           |    353 |     | session_feedback_configs   |      64 |
| user_roles        |      2 |     | session_feedback_responses |     103 |
| blog_authors      |     44 |     | feedback_view_events       |     348 |
| posts             |    512 |     | players                    |     149 |
| post_categories   |     98 |     | player_campaigns           |     299 |
| post_reactions    |    202 |     | character_relationships    |      32 |
| author_follows    |     28 |     | consent_links              |      37 |
| campaigns         |    305 |     | notes                      |     174 |
| campaign_shares   |      4 |     | note_shares                |       8 |
| featured_links    |      7 |     | notifications              |  94.428 |
| premium_overrides | **14** |     | user_notifications         | 184.867 |
| academy_courses   |      1 |     | academy_course_modules     |       2 |
| academy_lessons   |      3 |     | academy_settings           |       1 |
| academy_cards     |      1 |     | academy_annotations        |       3 |

- **premium_overrides (14)** = base do tier "Mestre VIP" no pivot.
- **notifications / user_notifications (~279k)** = logs históricos; **descartáveis** na re-hidratação.
- **posts = 512** (mais que os 478 públicos do espelhamento anterior; inclui rascunhos/privados).

### Auth — `export/auth-users.json`

- **353 usuários, todos com `email_confirmed_at`.** Migração de identidade viável (sem hash; ver gap).

### Storage (listagem) — `export/storage/*.json`

- **profile-assets: 463 arquivos** (avatares, 1 pasta por UUID de usuário).
- **blog-assets: 1.498 arquivos** — `content≈1000` (⚠️ truncado, ver bug #4), `covers=481`,
  `featured=5`, `academy=4`, `blog-custom=6`, `notifications=2`.
- **Download ainda NÃO executado** (use `node scripts/dev-bridge-pull.mjs storage --download`).

## ⚠️ Bugs na edge function da ponte (reportar ao dev externo)

1. **`GET /schema`** → HTTP 500 `{"error":"internal_error","message":"[object Object]"}`.
2. **`GET /table/blog_categories`** → HTTP 500 (mesmo erro, em qualquer `order`).
3. **`GET /table/tags`** → HTTP 500 (idem). São tabelas de referência pequenas.
4. **Storage list ignora `offset`** (offset=0 e offset=3 retornam itens idênticos). Como o
   `limit` máx. trava a página, pastas com >1000 objetos (ex.: `blog-assets/content`) não são
   enumeráveis inteiras. **Pedir:** suporte a offset/paginação na listagem de storage, OU
   liberar `blog_categories`/`tags` por outra rota, OU subdividir por sub-prefixo.

## Plano em 2 fases

- **Fase A (feita):** dump read-only → `export/`. Substitui o "seed sintético" da Fase 1.5 por
  **dado real**. Não escreve no banco novo (evita conflito de FK e o trigger `handle_new_user`).
- **Fase B (cutover):** dump do schema `auth` (senhas) → inserir `auth.users` + `auth.identities`
  preservando UUID → reidratar tabelas na ordem de FK (tenants → profiles → campaigns → …),
  pulando os logs de notificação → religar `posts.blog_author_id` (importados antes com nulo) →
  baixar storage e re-subir nos buckets do projeto novo.

## Como rodar

```
node scripts/dev-bridge-pull.mjs ping
node scripts/dev-bridge-pull.mjs pull [tabela ...]      # default: allowlist
node scripts/dev-bridge-pull.mjs auth
node scripts/dev-bridge-pull.mjs storage [--download]
node scripts/dev-bridge-pull.mjs raw /caminho k=v       # diagnóstico
```
