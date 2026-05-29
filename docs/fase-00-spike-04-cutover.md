# Plano de execução — Spike 00.4 (Ensaio de cutover cronometrado)

> Spike da Fase 00. Não aborta o projeto, mas **calibra a janela de manutenção real** e valida o procedimento de corte + rollback de ponta a ponta, antes de qualquer compromisso de data com os usuários.
> Referência: `migration-runbook.md` (§5 cutover, §8 rollback) + `MIGRACAO-NEXTJS.md` Fase 7. Depende de acesso ao Supabase (bloqueado até liberar).

## 1. Objetivo

Ensaiar o cutover **completo** (`export → import → sync-storage`) com **volume real** (DB ~231 MB + Storage ~408 MB) e **executar o rollback de verdade** (não só ler o runbook). Saída concreta: o **tempo real da janela** (provavelmente dezenas de minutos, não os "≈5 min" otimistas do runbook), que passa a calibrar a comunicação aos usuários (e-mail 48h/2h + banner read-only).

## 2. Critério de saída

1. Janela **cronometrada** etapa a etapa (dump, import, sync-storage, troca de env, smoke).
2. **Rollback do runbook §8 executado de fato** e validado (reverter env, sair do modo manutenção, reconciliar órfãos).
3. **Checksum de paridade**: contagem de linhas por tabela crítica (`auth.users`, `auth.identities`, posts, campaigns, players, notes) bate origem × destino; contagem/volume de objetos no Storage idem.

## 3. Pré-requisitos (todos dependem de acesso — pedir ao Marco)

| Item | Observação |
|---|---|
| Origem (Lovable) acessível | connection string `Direct` + `service_role` (mesmo gate do spike 00.2). |
| Supabase de **destino descartável** | free serve para cronometrar; storage do free pode limitar os 408 MB — validar. |
| **Scripts corrigidos** (incluir schema `auth`) | ⚠️ ver §4 — o export atual não cobre `auth`. |
| Ferramentas instaladas | `pg_dump`/`psql` 15+, `jq`, `supabase` CLI, `curl` (hoje só `curl` presente). |

## 4. ⚠️ Pré-condição: corrigir o export (gap do schema `auth`)

O `scripts/export-supabase.sh` atual faz `pg_dump --schema=public` apenas. **Sem incluir o schema `auth`, o ensaio mediria um cutover incompleto** (usuários não migram). Antes do ensaio, a versão do script no QG precisa adicionar o dump de `auth.users` + `auth.identities` (`--schema=auth --data-only`) e o import correspondente preservando **UUIDs + `email_confirmed_at`**. Esse spike e o 00.1 compartilham essa correção.

## 5. Procedimento

1. **Provisionar destino:** aplicar o schema reconstruído das 209 migrations (RLS, triggers, functions, extensões, cron, buckets).
2. **Export cronometrado** (`export-supabase.sh --with-data` + dump do `auth`): registrar duração e tamanho de cada artefato.
3. **Import cronometrado** (`import-supabase.sh`): registrar duração; validar idempotência (rodar 2×).
4. **Sync-storage cronometrado** (`sync-storage.sh`, 408 MB): medir throughput da Storage API; testar rerun (só delta).
5. **Troca de env/secrets** (simulada): cronometrar o checklist do runbook §7.
6. **Validação de paridade:** rodar os checksums do critério §2.
7. **Rollback real (runbook §8):** reverter env, sair de manutenção, reconciliar dados órfãos gravados na janela. Cronometrar.
8. **Consolidar números** → ajustar a estimativa da janela e a comunicação (Fase 7), e registrar em 00.5 (POC validado vs aposta).

## 6. Riscos

- **Janela muito maior que o estimado** (sync de 408 MB de Storage costuma dominar o tempo) → reavaliar horário/comunicação.
- **Storage do destino free insuficiente** para 408 MB → usar Pro temporário ou subset representativo + extrapolar.
- **Import não-idempotente** → repetições sujam o destino; validar `ON CONFLICT`/truncate-reload.
- **Órfãos no rollback** → dados escritos durante a janela; exercitar a reconciliação do §8.

## 7. Relação com os outros spikes da Fase 00

- **00.1 (auth)** e **00.4** compartilham a correção do export do `auth` (§4) e o acesso à origem (gate **00.2**).
- **00.3** (runtime) está resolvido (VPS "A"); resta só o checklist de spec da VPS.
- **00.5** consolida 00.1+00.2+00.4 em GO/NO-GO documentado antes da Fase 0.
