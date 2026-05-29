# ADR-0003 — Hostinger VPS "A" via `output: 'standalone'`

> Portado para o QG em 2026-05-28 — correções aplicadas: hospedagem = VPS "A"; gerenciador = npm. Documento vivo; a fonte original em Nuckturp_2.1 é read-only.

- **Status:** Aceito · **Data:** 2026-05-22 (revisado no mesmo dia após review)

## Contexto
O dono tem plano Node "B" da Hostinger e pode assinar VPS "A". Next.js 16 SSR precisa de runtime Node persistente. O multi-agent review (Constraint Guardian) levantou riscos 🔴 de hosting compartilhado: processo Node morto por idle/OOM, ISR cache em disco efêmero, limites de RAM/processo (LVE), Passenger reciclando. Custo não é prioridade declarada; "prisão" sim.

## Decisão
Hospedar em **VPS "A" da Hostinger** com `output: 'standalone'`. Spec mínima: ≥ 2 GB RAM, ≥ 2 vCPU, Ubuntu LTS, Node 22, PM2/systemd, SSL. Custo um pouco maior em troca de runtime confiável e fim da incerteza pré-código.

## Alternativas consideradas
- **Plano Node "B" compartilhado** — rejeitado após o review: riscos 🔴 de processo não-persistente, cache ISR não-persistente e LVE/RAM imprevisíveis.
- **Vercel/Netlify** — rejeitado: reintroduz dependência de plataforma (contraria o driver de independência).
- **Static export** — rejeitado: mata SSR/ISR necessários ao app autenticado.

## Consequências
- ✅ Runtime Node persistente 24/7 sem amarras; SSL próprio; SSH; observabilidade simples.
- ✅ ISR cache em disco real (não efêmero) — sem regeneração no cada deploy.
- ⚠️ Marco passa a administrar um servidor (segurança, updates, backup do sistema). Compensado por documentação em [ops.md](../ops.md).
- ⚠️ Edge Functions continuam no Supabase (Deno), fora da VPS — ver [ADR-0005](ADR-0005-edge-functions-deno.md).
