# ADR-0004 — Auth via `@supabase/ssr` + preservação de UUID/identities

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

- **Status:** Aceito (risco validado na Fase 2.2) · **Data:** 2026-05-22

## Contexto
Auth atual usa `@lovable.dev/cloud-auth-js` (lock-in). Migrar para Supabase Auth padrão **sem** desvincular usuários do conteúdo nem forçar reset de senha. Login por e-mail/senha **e** Google OAuth.

## Decisão
Adotar **`@supabase/ssr`**: browser client, server client (`cookies()`), middleware com **`getClaims()`** (sem código entre `createServerClient` e `getClaims`), login/signup via **Server Actions**.

**🔴 Regra inquebrável:** a cópia preserva os **mesmos UUIDs** de `auth.users` **e** a tabela `auth.identities` (vínculo Google). Conteúdo liga-se por `user_id`; preservar UUIDs ⇒ nada desvincula, nenhuma senha reseta. **Nunca** usar CSV manual da Lovable (gera UUIDs novos).

**Google OAuth:** reusar o mesmo `client_id/secret`, apenas **adicionar a nova callback URL** (`https://NOVO_REF.supabase.co/auth/v1/callback`) no Google Cloud, mantendo a antiga por 24h.

## Alternativas consideradas
- **auth-helpers** (legado) — rejeitado: `@supabase/ssr` é o padrão atual.
- **CSV import** — rejeitado: quebra vínculos e força reset.

## Consequências
- ✅ Sessão cookie-based em todo o App Router; migração transparente para o usuário.
- ⚠️ Confirmar na Fase 2.2 se o auth do Lovable é Supabase puro ou wrapper (impacta migração de hash). **Dry-run obrigatório** antes de qualquer compromisso de cutover.
