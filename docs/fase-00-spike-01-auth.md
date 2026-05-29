# Plano de execução — Spike 00.1 (Auth / senha)

> **Gate crítico:** NO-GO aqui aborta/replaneja o projeto inteiro. Nenhuma linha de Next.js antes de fechar a Fase 00.
> Referência: `MIGRACAO-NEXTJS.md` §3 (Fase 00) + ADR-0004 + `migration-runbook.md` (projeto antigo, read-only).

## 1. Objetivo

Provar que dá para migrar os ~134 usuários do Lovable para um Supabase próprio **sem reset de senha** e **sem desvincular** usuário↔conteúdo. Concretamente: ler `auth.users` (incl. `encrypted_password`) + `auth.identities` da origem, confirmar que o hash é bcrypt GoTrue padrão, importar num Supabase descartável **preservando UUIDs** e logar de verdade.

## 2. Critério GO / NO-GO

**GO** exige os três:
1. Conseguimos **ler** `auth.users.encrypted_password` + `auth.identities` com a credencial disponível.
2. O hash é **bcrypt GoTrue padrão** (prefixo `$2a$` / `$2b$` / `$2y$`) — não um formato proprietário do wrapper `@lovable.dev/cloud-auth-js`.
3. Após import no destino preservando UUID: **login funciona** para (a) e-mail/senha, (b) Google, (c) **usuário com identidade dupla** (mesmo UUID com e-mail + Google).

**NO-GO** (qualquer um): hash proprietário/irreconhecível · credencial não lê o schema `auth` · login falha após import. → replanejar auth (pior caso: reset de senha em massa, que **quebra** uma premissa central) antes de qualquer código.

## 3. Pré-requisitos

| Item | Origem | Status |
|---|---|---|
| Connection string `Direct` da origem (Lovable) | Marco — Connector Lovable → Database → `Direct` | ⏳ pendente |
| `service_role` key da origem | Marco — Connector → API Keys | ⏳ pendente |
| Supabase de **destino descartável** (free) | Marco cria, ou me autoriza a criar | ⏳ pendente |
| 2–3 **usuários de teste reais** do Lovable com senha conhecida + 1 com Google + 1 com identidade dupla | Marco | ⏳ pendente |
| `pg_dump`/`psql` 15+, `jq`, `supabase` CLI | instalar na máquina (hoje **ausentes**; só `curl` presente) | ⏳ a instalar |

> ⚠️ **Gate 00.2 embutido:** se o Lovable **não expuser** a connection string `Direct` sem "Transfer ownership", **PARAR** — vira decisão do Marco (perder o Lovable como rede de segurança vs. alternativa). Não seguir em silêncio.

## 4. Achado: lacuna nos scripts atuais

O `scripts/export-supabase.sh` do projeto antigo faz `pg_dump --schema=public` apenas — **o schema `auth` (usuários) não é exportado** por nenhum script existente, nem entra no `06-data.sql`. O spike usa um dump dedicado do `auth`; e a versão do script de export que viver no QG **precisará incluir o schema `auth`** para o cutover real.

## 5. Procedimento

Credenciais carregadas de `.secrets/lovable.env` (gitignored). Nunca colar em texto persistente, nunca commitar dumps de `auth`.

1. **Instalar ferramentas** (pg_dump/psql/jq/supabase CLI) e validar versões.
2. **Conectividade:** `psql "$SRC_DB_URL" -c "select 1"` — confirma acesso ao banco da origem.
3. **Inspeção do `auth` (sem expor senha em claro — só o prefixo do hash):**
   - `select count(*) from auth.users;` — confirma leitura.
   - `select id, email, (encrypted_password is not null) as has_pw, left(encrypted_password,4) as hash_prefix, email_confirmed_at, created_at from auth.users limit 10;` — checa prefixo bcrypt (`$2a/$2b/$2y`) e `email_confirmed_at`.
   - `select provider, count(*) from auth.identities group by provider;` — distribuição e-mail/google.
   - Identidade dupla: `select user_id, count(*) from auth.identities group by user_id having count(*) > 1;`.
4. **Dump focado do auth:** `pg_dump "$SRC_DB_URL" --schema=auth --data-only --no-owner -f .secrets/auth-data.sql` (ou `COPY` só de `auth.users` + `auth.identities`).
5. **Destino descartável:** aplicar o schema (reconstruído das 209 migrations) e importar os dados de `auth` **preservando UUIDs** + `email_confirmed_at`.
6. **Teste de login no destino:**
   - E-mail/senha via Auth API: `POST /auth/v1/token?grant_type=password` com usuário de teste.
   - Google: configurar provider no destino + logar (caso de identidade dupla).
   - Confirmar `UUID logado == UUID original`.
7. **Documentar resultado** no Decision Log (POC validado vs aposta) → consolidar em 00.5.

## 6. Riscos

- **Hash proprietário** (wrapper Lovable) → NO-GO direto.
- **`service_role`/role da origem sem permissão no schema `auth`** → leitura bloqueada; testar no passo 3 logo de cara.
- **Identidade dupla** é o caso mais frágil (merge e-mail+Google sob um UUID) — testar explicitamente.

## 7. Segurança

- Credenciais e dumps de `auth` só em `.secrets/` (gitignored). Dump de `auth` contém hashes — **nunca** vai para o git.
- Supabase de destino descartável **apagado** após o spike.
