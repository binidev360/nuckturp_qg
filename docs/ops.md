# Operação & Deployment — QG do Mestre

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

> CI/CD, ambientes, release/rollback e monitoramento. Cutover detalhado em [migration-runbook.md](migration-runbook.md).

## 1. Ambientes
| Ambiente | Frontend | Backend |
|---|---|---|
| **dev** | local (`npm run dev`) | Supabase local ou projeto Free |
| **staging** | subdomínio (ex.: `staging.nuckturp.com.br`) na VPS Hostinger "A" | Supabase Free/Pro de staging |
| **prod** | `nuckturp.com.br` (VPS Hostinger "A", standalone) | Supabase **Pro** próprio |

## 2. CI/CD
Pipeline (GitHub Actions ou equivalente):
1. **CI** (toda PR): install → lint → typecheck → test → build.
2. **Deploy staging** (merge em `main`): build standalone → publicar na VPS Hostinger "A".
3. **Deploy prod** (tag/manual): mesma build, promovida após QA.
- Edge Functions: `supabase functions deploy --project-ref <prod>`.
- Migrations: `supabase db push` (versionadas em `supabase/migrations`).

## 3. Build de produção
```bash
npm run build                       # output: 'standalone'
# artefato: .next/standalone + .next/static + public
node .next/standalone/server.js     # processo Node na VPS Hostinger "A" (PM2/systemd)
```
A VPS "A" é a hospedagem decidida (D3/ADR-0003); o plano Node "B" foi descartado. O teste de carga da Fase 6 apenas valida a VPS — ver [ADR-0003](adr/ADR-0003-hostinger-standalone.md).

## 4. Release & versão
- **SemVer** + tags git.
- **CHANGELOG** (Keep a Changelog) atualizado em toda PR que muda comportamento.
- Release = tag + deploy prod + nota no CHANGELOG.

## 5. Rollback
- **App:** redeploy do artefato anterior (build imutável por tag).
- **Cutover de dados:** procedimento de rollback no [migration-runbook.md](migration-runbook.md) §8 (reverter env vars, sair do modo manutenção, reconciliar dados órfãos).
- DNS com **TTL baixo (300s)** 24h antes do switch para reverter rápido.

## 6. Monitoramento & alertas
- **Healthcheck:** `GET /api/health` (app) + status do Supabase.
- **Métricas:** Web Vitals reais, erros (logs), uso de IA, filas (email/push), cron jobs.
- **SEO pós-cutover:** Google Search Console (indexação, posições) por ~2 semanas (Fase 8).
- **Runbooks de incidente:** sessão derrubando usuários → checar middleware; webhook Stripe falhando → checar secret/endpoint; push falhando → checar VAPID.
