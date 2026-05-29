# 🔀 PIVOT — QG do Mestre 100% pago (2026-05-29)

> Ajuste de rota declarado pelo Marco. **SUPERSEDE** o modelo freemium do PRD (§3 e §4.8) e remove a Academia da parte interna.
> A abordagem **técnica** de migração (plano-mestre `MIGRACAO-NEXTJS.md`) segue válida — o que muda é a **camada de produto/negócio**.
> Este documento é a fonte de verdade do modelo de negócio até o PRD ser revisado.

## 1. A virada

- **QG do Mestre passa a ser 100% PAGO.** O modelo **Premium/freemium MORRE** — acaba o "ferramentas grátis + Premium opcional".
- **Preço: R$ 29** _(assumido /mês — confirmar C1)_.
- O QG é uma **mega-ferramenta**: a proposta de valor é a ferramenta inteira, paga.

## 2. O que SAI

- ❌ **Modelo freemium** (PRD §3) — obsoleto.
- ❌ **Academia de Mestres na parte interna** (PRD §4.8 · módulo `academy/` · rotas `/journey/*`). O QG é só ferramenta.
- ⚠️ Decisão **D-A** (Academy RLS) → **MOOT** (Academia removida do app interno).

## 3. Tiers / formas de acesso

| #   | Tier                                | Acesso                    | Observações                                                                                                                                      |
| --- | ----------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Pago direto**                     | R$ 29[/mês]               | QG completo.                                                                                                                                     |
| 2   | **Assinante WorldCraft**            | **100% grátis**           | Cross-entitlement. Acesso direto + **badge no header: 🔓 cadeado destravado + "assinante worldcraft"** (deixar claro que o benefício vem de lá). |
| 3   | **Mestre MesaQuest**                | **Cupom de desconto**     | Não é grátis — desconto.                                                                                                                         |
| 4   | **Usuários atuais (grandfathered)** | **Mestre VIP**, grátis    | Via `premium_overrides` (mecanismo VIP já existe no schema). Limpeza gradual de inativos + revogação.                                            |
| 5   | **Add-on de IA**                    | Pago, sobre qualquer tier | Requisições extras de IA.                                                                                                                        |

## 4. Cross-product (⭐ anotado a pedido explícito)

- **Cruzar dados com o Stripe OU o banco do WorldCraft** para identificar assinantes WorldCraft → **100% de desconto no QG**.
- **Mecanismo a definir (C3):** match por e-mail no Stripe? query no DB do WorldCraft? identidade/SSO compartilhada?
- **Header (requisito de UI):** para o assinante WorldCraft, exibir **símbolo de cadeado destravado + texto "assinante worldcraft"** — para o usuário saber que veio de lá e que o benefício vem de lá.
- **MesaQuest:** cupom de desconto (Stripe coupons). Emissão/validação a definir (C7).
- Ecossistema Nuckturp: QG ↔ WorldCraft ↔ MesaQuest interligados (perfil do QG já tinha links MesaQuest/WorldCraft).

## 5. IA limitada + add-on pago

- **Uso de IA agora é LIMITADO.** Repensar as requisições/quotas das functions de IA: `generate-adventure`, `session-prep-check`, `seo-specialist`, `finance-extract-receipt`.
- Quem quiser mais → **assina requisições extras de IA** (upsell metered).
- **A definir (C4):** quota base, estrutura/preço do add-on, se a quota varia por tier (ex.: MesaQuest cupom vs WorldCraft grátis vs pago direto).
- Conecta com o achado **S8** da Onda A (functions de IA sem rate-limit/quota próprios) — agora vira requisito de produto, não só de segurança.

## 6. Página de vendas (nova home)

- A **home passa a ser uma PÁGINA DE VENDAS** (conversão). Substitui a landing atual.
- Construir com **`/copy-basic`** (copy de conversão) na Fase 3.
- ⚠️ **Esclarecer (C2 — crítico):** "100% pago" **mantém as páginas públicas de SEO abertas?** Assumo **SIM** — o motor de SEO (driver C) depende do blog (`/novidades`), dicionário (`/dicionario`), perfis públicos (`/m/:slug`) e notas públicas (`/n/:token`) seguirem acessíveis. O **paywall é sobre o APP/ferramentas**, não sobre o conteúdo público de marketing/SEO. **Confirmar.**

## 7. Grandfathering no cutover

- No cutover, **todos os usuários migrados recebem "Mestre VIP"** (`premium_overrides`) → não pagam, não perdem acesso.
- **Limpeza:** revogar VIP de inativos "aos poucos" — definir **regra de inatividade (C5)**.
- Entra no runbook de cutover (Fase 7) como passo: marcar todos como VIP no import.

## 8. Impactos em cascata (no plano e nas decisões)

- 📝 **PRD precisa de revisão** (§3 modelo, §4.8 Academia, §6 métricas Free→Premium, monetização).
- ⬇️ **Módulo Academy** (alta complexidade, ~20 componentes) **sai do escopo de port** → reduz trabalho da Fase 4.5.
- 🔗 **Rotas `/journey/*`:** decidir destino — redirect/410 (tensão com o guardrail "preservar slugs", mas Academia era horizonte e tem pouco SEO). Ver C6.
- 💳 **Billing (edge function):** passa a **gatear o app inteiro** (paywall no nível do app), não só features premium.
- 🆕 **Novo a construir:** entitlement cross-product (WorldCraft), sistema de cupom (MesaQuest), metering de IA + add-on, badge de header WorldCraft.
- 🗝️ **`premium_overrides`/VIP:** vira mecanismo central (não mais exceção).

## 9. Confirmações pendentes (NÃO bloqueiam a anotação — resolver em rodada futura)

- **C1** — R$ 29 é /mês? Há período de trial/teste grátis?
- **C2** _(crítico)_ — Público de SEO segue aberto (só o app é pago)?
- **C3** — Mecanismo do cross-entitlement WorldCraft (Stripe email-match vs DB WorldCraft vs SSO)?
- **C4** — Quota base de IA + estrutura/preço do add-on; varia por tier?
- **C5** — Regra de inatividade para revogar o VIP grandfathered.
- **C6** — Academy: dropar as tabelas `academy_*` ou só remover UI/rotas?
- **C7** — MesaQuest: % do cupom e como é emitido/validado.

---

_Documento de pivot. Atualizar conforme as confirmações C1–C7 forem resolvidas. Ao revisar o PRD, refletir tudo isto._
