# Segurança & Conformidade — QG do Mestre

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

> Práticas de segurança da reescrita + threat model. Histórico de auditoria: ver [CHANGELOG.md](../CHANGELOG.md) e memória do projeto.

## 1. Gerenciamento de segredos
- Secrets **nunca** no bundle do client. Apenas `NEXT_PUBLIC_*` é público (e mesmo assim, só anon/publishable key).
- `service_role` e chaves de Stripe/Gemini/Resend/VAPID: server-only (env do host) e secrets das Edge Functions.
- `.env*` ignorados no git. Templates sem valores em `.env.example`.

## 2. Pendências herdadas (zerar antes/durante o cutover)
- [ ] **Rotacionar a anon key** do Supabase — vazou no histórico git (commits `91efc759` / `1046cc40`). Na migração, o **novo projeto já nasce com chave nova**; garantir que a antiga não seja reusada.
- [ ] Remover `.env` do histórico git (`git filter-repo`/BFG) ou aceitar risco baixo se repo privado + chave rotacionada.
- [ ] Rate limiting de autenticação (Supabase Auth → Rate Limits).
- [ ] Validar `VAPID_SUBJECT` (`mailto:` ou `https://`) nas Edge Functions.
- [ ] Auditar buckets de Storage (privado vs público) — dados privados nunca em bucket público.
- [ ] CSP header (no servidor Next ou Cloudflare).
- [ ] Revisar CORS das Edge Functions (hoje `Access-Control-Allow-Origin: *`).

## 3. Controle de acesso (multi-tenant)
- **RLS obrigatória** em todas as tabelas de dados de mestre/jogador. 1 mestre = 1 tenant.
- Políticas testadas em integração (ver [testing.md](testing.md)).
- Admin via flag/role, com bypass auditado.

## 4. Threat model (STRIDE resumido)
| Ameaça | Vetor | Mitigação |
|---|---|---|
| Spoofing | sessão roubada | cookies httpOnly/secure, `getClaims()` no middleware |
| Tampering | bypass de RLS | service-role só server; RLS em tudo |
| Repudiation | ações sem rastro | logs de IA/admin/financeiro |
| Information disclosure | secret no bundle / bucket público | secrets server-only; auditoria de Storage |
| DoS | abuso de edge/scraper | rate limiting (`cf-connecting-ip`/`x-real-ip`) |
| Elevation | premium/admin indevido | flags + RLS + webhooks Stripe verificados |

## 5. Privacidade / LGPD
- Dados de jogadores (preferências de segurança, gatilhos) são sensíveis → isolamento por tenant, acesso só do mestre dono.
- Exportação/exclusão de dados a pedido (processo a definir na operação).
- E-mails comportamentais respeitam opt-out.

## 6. Dependências
- Scanning de dependências no CI (audit). Atualizações de segurança priorizadas.
- Revisão de PR inclui checagem de segredo acidental e cor/diálogo nativo.
