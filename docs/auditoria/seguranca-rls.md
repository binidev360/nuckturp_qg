# Auditoria de Segurança & RLS — consolidado (Nuckturp QG)

> Onda A da auditoria preliminar (antes de portar). Evidência detalhada:
> [rls-policies.md](rls-policies.md) · [edge-seguranca.md](edge-seguranca.md) · [auth-admin-secrets.md](auth-admin-secrets.md) · design do admin em [admin-model.md](admin-model.md).
> Read-only no projeto antigo. Data: 2026-05-29.

## 1. Sumário executivo

Postura **boa para um app gerado em low-code**, melhor que o esperado:

- **RLS habilitada em 100% das tabelas-base** versionadas; **0 sem RLS** no schema das migrations.
- Helpers de autorização (`get_user_tenant_id`, `is_admin`, `has_role`) são `SECURITY DEFINER` com `search_path` fixo — **sem brecha de search_path**.
- `user_roles` protegida contra **auto-promoção**; enforcement de admin é **server-side real** (não só client).
- Nenhum `service_role`/secret no bundle client.

Mas há achados que **devem ser resolvidos antes/durante o port** (não herdar dívida):

## 2. Registro de achados priorizados

| ID  | Área        | Sev | Achado                                                                                                                                                                             | Ação                                                                                                                                                   | Quando             |
| --- | ----------- | :-: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| S1  | RLS/LGPD    | 🔴  | `consent_links` (PII de consentimento de jogador) existe no `types.ts` mas **não está nas migrations** — só em `manual-scripts/`. Risco de não ser portada ou portada **sem RLS**. | Inventariar `supabase/manual-scripts/`; versionar `consent_links` + RPCs de consentimento como migration **com RLS** antes do port.                    | Pré-port (Fase 1)  |
| S2  | Edge/SSRF   | 🔴  | `instagram-thumbnail` e `fetch-og-image` são **públicas, sem auth**, seguem redirects → podem atingir IPs internos/metadata (SSRF).                                                | Allowlist de host + bloquear IPs privados/metadata + não seguir redirects p/ rede interna; ou exigir auth.                                             | Pré-port / 6.3     |
| S3  | Segredo     | 🔴  | Chave IndexNow **hardcoded** `nuckturp2026indexnow` em `ping-search-engines`.                                                                                                      | Mover p/ secret; rotacionar a chave.                                                                                                                   | Port               |
| S4  | Auth legado | 🔴  | Anon key **vazou no histórico git** (commits `91efc759`/`1046cc40`).                                                                                                               | **Invalidar a chave antiga no projeto Lovable** (não basta "nascer nova" no novo); scrub do histórico ou aceite formal. Incluir no runbook de cutover. | Cutover (6.3/7)    |
| S5  | RLS         | 🟠  | `post_reactions` com `FOR DELETE USING (true)` — qualquer um deleta reaction de qualquer um.                                                                                       | Restringir delete ao dono (`user_id = auth.uid()`).                                                                                                    | Port               |
| S6  | Roles       | 🟠  | Fonte dupla de role: `profiles.is_admin` (legado) coexiste com `user_roles`.                                                                                                       | Fonte única `user_roles`; remover `is_admin` na reescrita.                                                                                             | Port               |
| S7  | CORS        | 🟠  | `Access-Control-Allow-Origin: *` em **100%** das 26 edge functions.                                                                                                                | Travar p/ `nuckturp.com.br`; público só onde necessário (sitemap/rss/og).                                                                              | 6.3                |
| S8  | Custo/DoS   | 🟠  | Funções de IA/OCR (`generate-adventure`, `finance-extract-receipt`, `session-prep-check`) **sem rate-limit/quota** próprios.                                                       | Rate-limit persistente + quota por usuário/tenant.                                                                                                     | 6.3                |
| S9  | RLS         | 🟡  | Catálogo Academy (`academy_courses/modules/lessons`) com `USING (true)` sobreposto → expõe **rascunhos** a qualquer logado.                                                        | Definir modelo de acesso (ver Decisão D-A).                                                                                                            | Pré-port (decisão) |
| S10 | RLS         | 🟡  | Tabelas de e-mail confiam em `auth.role()='service_role'` no `USING` em vez de **deny-by-default + revoke**.                                                                       | Padronizar deny-by-default + grants explícitos.                                                                                                        | 6.3                |
| S11 | Admin       | 🟡  | Sem guard de "último admin"/auto-rebaixamento; sem MFA no admin.                                                                                                                   | Guard de último admin + MFA (ver [admin-model.md](admin-model.md)).                                                                                    | Fase 2             |
| S12 | Config      | 🟡  | `config.toml` lista só 15 das 26 functions (2 órfãs) e não reflete o `--no-verify-jwt` real do deploy.                                                                             | Reconstruir `config.toml` completo e fiel no port.                                                                                                     | Fase 1.4           |

## 3. Postura RLS (resumo)

- Tabelas-base com RLS: **todas as versionadas**. ⚠️ Reconciliar contagem: a auditoria RLS contou ~85 tabelas-base no `types.ts`; o inventário de schema contou 56+3 views. O banco (após push) é a fonte autoritativa — reconciliar na Fase 1.
- Isolamento multi-tenant via `get_user_tenant_id(auth.uid())` + `user_id`. Consistente na maioria; exceções nos achados S5/S9/S10.
- **Boas práticas a preservar** (edge): `process-email-queue` exige claim service_role; `finance-extract-receipt` valida ownership de `storage_path`; `auth-email-hook` usa HMAC; `scraper` tem allowlist de host; `analyze-feedback` tem quota mensal.

## 4. Decisões necessárias do Marco (antes de portar as policies)

- **D-A · Modelo de acesso do catálogo Academy:** aberto a qualquer logado? só itens publicados? gate Premium **no banco** (RLS) ou só na UI? Isso muda as policies de `academy_*` (achado S9).
- **D-B · `consent_links` / consentimento (S1):** confirmar que está em `manual-scripts/`; aprovar versionar como migration com RLS antes do port (PII/LGPD — prioridade).
- **D-C · `instagram-thumbnail` / `fetch-og-image` (S2):** seguem públicas (com allowlist anti-SSRF) ou viram autenticadas?

## 5. Roadmap de remediação por fase

- **Pré-port (Fase 1):** S1 (consent_links + RLS), S9 (decisão Academy), S12 (config.toml fiel). Decisões D-A/D-B/D-C.
- **No port:** S3 (IndexNow), S5 (post_reactions), S6 (fonte única de role).
- **Fase 2 (auth):** S11 (MFA + guard último admin) + decoy/real ([admin-model.md](admin-model.md)).
- **Fase 6.3 (hardening):** S2 (SSRF — antecipável), S7 (CORS), S8 (rate-limit), S10 (deny-by-default e-mail), auditoria total de `pg_policies` no banco real.
- **Cutover (Fase 7):** S4 (invalidar anon key antiga + scrub histórico).
