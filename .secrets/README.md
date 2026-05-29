# .secrets/ — credenciais locais (NUNCA commitar)

Esta pasta guarda segredos usados localmente na migração. **Tudo aqui é gitignored**, exceto este README (`.secrets/*` ignorado, `!.secrets/README.md` reincluído).

## Arquivos esperados (criados sob demanda, nunca versionados)

- **`lovable.env`** — credenciais da ORIGEM (Lovable), para os spikes da Fase 00 e o cutover:
  ```
  SUPABASE_DB_URL="postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres"   # Direct
  SUPABASE_URL="https://<ref>.supabase.co"
  SUPABASE_SERVICE_ROLE_KEY="eyJ..."
  SUPABASE_PROJECT_REF="<ref>"
  SUPABASE_ACCESS_TOKEN="sbp_..."   # opcional (listar secrets)
  ```
- **`dev.env`** — credenciais do Supabase próprio do QG (ref `fciqovzbtasbkxupxidb`, este vira produção). **Modelo em `dev.env.example`** — copiar e preencher. Vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL` (Direct 5432), `SUPABASE_POOLER_URL` (6543), `SUPABASE_ACCESS_TOKEN` (depois).
- **`destino.env`** — credenciais do Supabase de DESTINO descartável (teste do spike).
- **`auth-data.sql`** / dumps — saídas de `pg_dump` do schema `auth`. **Contêm hashes de senha, jamais commitar.**

## Regras

- Nunca colar essas credenciais em texto persistente (chat, commits, docs versionados).
- Dumps de `auth` e `export/` ficam fora do git.
- O Supabase de destino descartável é apagado após validar o spike.
