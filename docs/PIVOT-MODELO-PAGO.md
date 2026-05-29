# 🔀 PIVOT — QG do Mestre 100% pago (2026-05-29)

> Ajuste de rota declarado pelo Marco. **SUPERSEDE** o modelo freemium do PRD (§3 e §4.8) e remove a Academia da parte interna.
> A abordagem **técnica** de migração (plano-mestre `MIGRACAO-NEXTJS.md`) segue válida — o que muda é a **camada de produto/negócio**.
> Este documento é a fonte de verdade do modelo de negócio até o PRD ser revisado.

## 1. A virada

- **QG do Mestre passa a ser 100% PAGO.** O modelo **Premium/freemium MORRE** — acaba o "ferramentas grátis + Premium opcional".
- **Preço: R$ 29/mês + trial grátis de 21 dias** (C1 confirmado).
- O QG é uma **mega-ferramenta**: a proposta de valor é a ferramenta inteira, paga.

## 2. O que SAI

- ❌ **Modelo freemium** (PRD §3) — obsoleto.
- ❌ **Academia de Mestres na parte interna** (PRD §4.8 · módulo `academy/` · rotas `/journey/*`). O QG é só ferramenta.
- ⚠️ Decisão **D-A** (Academy RLS) → **MOOT** (Academia removida do app interno).

## 3. Tiers / formas de acesso

| #   | Tier                                | Acesso                    | Observações                                                                                                                                      |
| --- | ----------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Pago direto**                     | R$ 29/mês (trial 21 dias) | QG completo.                                                                                                                                     |
| 2   | **Assinante WorldCraft**            | **100% grátis**           | Cross-entitlement. Acesso direto + **badge no header: 🔓 cadeado destravado + "assinante worldcraft"** (deixar claro que o benefício vem de lá). |
| 3   | **Mestre MesaQuest**                | **Cupom de desconto**     | Não é grátis — desconto.                                                                                                                         |
| 4   | **Usuários atuais (grandfathered)** | **Mestre VIP**, grátis    | Via `premium_overrides` (mecanismo VIP já existe no schema). Limpeza gradual de inativos + revogação.                                            |
| 5   | **Add-on de IA**                    | Pago, sobre qualquer tier | Requisições extras de IA.                                                                                                                        |

## 4. Cross-product (⭐ anotado a pedido explícito)

- **Cruzar dados com o Stripe OU o banco do WorldCraft** para identificar assinantes WorldCraft → **100% de desconto no QG**.
- **Mecanismo (C3 confirmado):** **Stripe como fonte de verdade** (mesmo account → assinatura WorldCraft ativa = entitlement no QG, match por customer/e-mail). Desacopla os bancos. _Pré-requisito: confirmar que WorldCraft cobra no mesmo Stripe account._
- **Header (requisito de UI):** para o assinante WorldCraft, exibir **símbolo de cadeado destravado + texto "assinante worldcraft"** — para o usuário saber que veio de lá e que o benefício vem de lá.
- **MesaQuest:** cupom de desconto (Stripe coupons). Emissão/validação a definir (C7).
- Ecossistema Nuckturp: QG ↔ WorldCraft ↔ MesaQuest interligados (perfil do QG já tinha links MesaQuest/WorldCraft).

## 5. IA limitada + add-on pago

- **Uso de IA agora é LIMITADO.** Repensar as requisições/quotas das functions de IA: `generate-adventure`, `session-prep-check`, `seo-specialist`, `finance-extract-receipt`.
- Quem quiser mais → **assina requisições extras de IA** (upsell metered).
- **Estrutura (C4 confirmada):** quota base mensal **uniforme** para todos os tiers + **add-on avulso pago** para quem quer mais. Números (limite mensal e preço do pacote) ficam para uma rodada de pricing dedicada.
- Conecta com o achado **S8** da Onda A (functions de IA sem rate-limit/quota próprios) — agora vira requisito de produto, não só de segurança.

## 6. Página de vendas (nova home)

- A **home passa a ser uma PÁGINA DE VENDAS** (conversão). Substitui a landing atual.
- Construir com **`/copy-basic`** (copy de conversão) na Fase 3.
- ✅ **C2 confirmado:** as páginas públicas de SEO seguem **abertas** (blog `/novidades`, dicionário `/dicionario`, perfis `/m/:slug`, notas `/n/:token`). O **paywall é só sobre o APP/ferramentas autenticadas**. Preserva o driver C (metade do motivo da migração).

## 7. Grandfathering no cutover

- No cutover, **todos os usuários migrados recebem "Mestre VIP"** (`premium_overrides`) → não pagam, não perdem acesso.
- **Limpeza (C5 confirmada):** **90 dias sem login** → aviso por e-mail; se não voltar, revoga o VIP e cai no paywall. Automatizável (cron + e-mail).
- Entra no runbook de cutover (Fase 7) como passo: marcar todos como VIP no import.

## 8. Impactos em cascata (no plano e nas decisões)

- 📝 **PRD precisa de revisão** (§3 modelo, §4.8 Academia, §6 métricas Free→Premium, monetização).
- ⬇️ **Módulo Academy** (alta complexidade, ~20 componentes) **sai do escopo de port** → reduz trabalho da Fase 4.5.
- 🔗 **Rotas `/journey/*`:** decidir destino — redirect/410 (tensão com o guardrail "preservar slugs", mas Academia era horizonte e tem pouco SEO). Ver C6.
- 💳 **Billing (edge function):** passa a **gatear o app inteiro** (paywall no nível do app), não só features premium. ⚠️ **Achado da Onda B:** o billing antigo **não tem webhook Stripe** — o entitlement é resolvido por **polling de 5min** (`useSubscription`). Para o paywall global confiável, **construir webhook Stripe → tabela `entitlements`** (em vez de manter o check on-demand). É o principal "novo a construir" do paywall.
- 🧹 **Remoção da Academia — cuidado (achado da Onda C):** alguns hooks são **compartilhados** com Blog/Admin/Notas (`useReadingProgress`, `useRetentionReminders`, `useNPSAdminData`, `paragraphIndexer`). Ao remover a Academia, **não deletar cego** — grep de uso antes; manter os compartilhados.
- 🆕 **Novo a construir:** entitlement cross-product (WorldCraft), sistema de cupom (MesaQuest), metering de IA + add-on, badge de header WorldCraft.
- 🗝️ **`premium_overrides`/VIP:** vira mecanismo central (não mais exceção).

## 9. Confirmações (rodada 2026-05-29) ✅

- **C1 ✅** — **R$ 29/mês + trial grátis de 21 dias.**
- **C2 ✅** _(crítico)_ — Público de SEO segue **aberto**; paywall só no app/ferramentas.
- **C3 ✅** — Entitlement WorldCraft via **Stripe** (mesmo account = fonte de verdade). _Pré-req: confirmar mesmo Stripe account._
- **C4 ✅** — IA: **quota base mensal uniforme + add-on avulso pago**; números (limite/preço) em rodada de pricing.
- **C5 ✅** — VIP: revogar após **90 dias sem login** (aviso por e-mail antes).
- **C6 ✅** — Academia: **manter tabelas `academy_*`**, remover só UI/rotas do escopo de port (hooks compartilhados — não dropar).
- **C7 ⏳** — MesaQuest: **mecanismo e % a definir** (única confirmação adiada). Default provável: cupom Stripe.

### Pendências derivadas (resolver na fase certa)

- **Pricing**: números da quota de IA + preço do add-on (C4).
- **MesaQuest**: mecanismo (cupom Stripe vs verificação automática) + % (C7).
- **Pré-requisito C3**: confirmar que WorldCraft e QG usam o mesmo Stripe account.

---

_Documento de pivot. Atualizar conforme as confirmações C1–C7 forem resolvidas. Ao revisar o PRD, refletir tudo isto._
