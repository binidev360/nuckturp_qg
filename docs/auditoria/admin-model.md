# Modelo de Admin — atual + design "decoy + real" (Nuckturp QG)

> Onda A da auditoria de segurança. Evidência detalhada em [auth-admin-secrets.md](auth-admin-secrets.md).
> Decisão do Marco (2026-05-29): **projetar decoy + admin real** para a versão nova.

## 1. Modelo atual (projeto antigo)

- **Fonte de verdade da role:** linha em `public.user_roles` com `role = 'admin'` (enum `app_role`: `admin`/`moderator`/`user`). Coluna legada `profiles.is_admin` ainda coexiste (🟠 fonte dupla — eliminar na reescrita).
- **Enforcement server-side (sólido, 3 camadas):**
  1. Edge `admin-users`: `getUser(token)` → consulta `user_roles` → **403 antes de qualquer ação** (usa `service_role` só depois de provar admin).
  2. RLS em `user_roles` com `WITH CHECK (is_admin(auth.uid()))` → **anti-auto-promoção** (usuário comum não insere a própria role).
  3. RPCs `SECURITY DEFINER` com `has_role()`.
- **Gating de rota no client = COSMÉTICO:** `ProtectedRoute` só checa sessão+onboarding; cada página admin faz `<Navigate>` decorativo. **Não é barreira de segurança** — e é justamente o que valida adotar o padrão decoy.
- **Lacunas:** sem guard de "último admin"/auto-rebaixamento; sem MFA no admin; CORS `*`.

## 2. Princípio do design (ler antes de tudo)

> **Obscuridade não é segurança — é um redutor de velocidade.** A barreira real é SEMPRE server-side (role verificada no servidor + RLS no banco). O decoy e a rota obscura são camadas de **engano e detecção** POR CIMA da autorização real, nunca em vez dela. Mesmo que o atacante descubra a rota real, ele esbarra em role-check server-side + RLS.

## 3. O decoy — `/admin` (honeypot)

- Rota "óbvia" que todo scanner/atacante tenta primeiro. Hospeda um **login de admin falso, convincente** (usa o design da marca; parece o painel real).
- **Nunca autentica.** Qualquer credencial → "credenciais inválidas" após delay **constante** (evita timing oracle). Não há backend de auth real aqui.
- **Loga toda tentativa** em `admin_honeypot_log` (IP, user-agent, timestamp, username submetido, rota). **NUNCA armazenar a senha submetida** (risco/ético/legal). Tabela com RLS deny-all a clientes; escrita só via service-role server-side.
- **Reação:** rate-limit/soft-ban de IP que martela; **alerta** (e-mail/push) ao admin real em repetição. Opcional: usuário logado-não-admin que acessa `/admin` também é logado (curiosidade) e tratado com 404 educado.
- O honeypot **não pode ser explorável** (sem SSRF/injeção via campos logados; sanitizar e limitar tamanho; cap de crescimento da tabela).

## 4. O admin real

- Vive em **rota não-óbvia e não-linkada** — ex.: `/qg-interno/[segredo]`, com o segmento resolvido de um **secret server-side** (NUNCA hardcoded no bundle client, nem em sitemap/robots/analytics/referrer).
- **A obscuridade NÃO é a segurança** (ver §2). É um redutor de ruído contra varredura automatizada.
- **Decisão de design (404, não 403):** para sessão não-admin, a rota real responde **404 / not-found** (rewrite), nunca 403. Um 403 confirmaria "tem algo aqui"; o 404 não revela nada — o atacante não distingue de uma rota inexistente.
- **Requisitos de acesso:** sessão válida **+** `role = admin` verificada server-side **+ MFA/TOTP** (superfície de maior privilégio merece segundo fator).

## 5. Camadas (defense in depth) — ordem de verificação

1. **Middleware** (`@supabase/ssr` + `getClaims`): no prefixo da rota real, se não-admin → **rewrite para 404**. Não revela.
2. **Server Component / Server Action:** re-checa `role=admin` server-side (nunca confia só no middleware).
3. **RLS no Postgres:** toda tabela/operação admin exige `is_admin(auth.uid())`. **É a fronteira final** — mesmo um bug nas camadas acima não vaza dados.
4. **Route Handlers / "admin-users":** re-verifica admin do JWT antes de qualquer operação privilegiada (porta o padrão atual).
5. **Honeypot log + alerta** no `/admin` decoy.
6. **Guard de "último admin":** impede remover/rebaixar o último admin (lockout) e auto-rebaixamento — lacuna do legado.

## 6. Novo no schema/infra (a criar na reescrita)

- Tabela `admin_honeypot_log` (service-role write, RLS deny-all client).
- MFA/TOTP para admin (Supabase Auth MFA).
- Função/guard de "último admin".
- Secret do segmento da rota real (env server-only).
- Eliminar `profiles.is_admin` legado → fonte única `user_roles`.

## 7. Anti-padrões a evitar

- ❌ Confiar em qualquer checagem client-side como barreira.
- ❌ Vazar a rota real (sitemap, robots, bundle, log de analytics, header referrer).
- ❌ Responder 403 na rota real (use 404).
- ❌ Guardar senha submetida no honeypot.
- ❌ Tratar a obscuridade como substituta da role-check/RLS.

## 8. Próximos passos

1. Marco valida este design (especialmente: formato da rota real e se quer MFA já no MVP do admin).
2. Vira spec da camada de auth/admin da Fase 2 (não bloqueia o restante).
3. `admin_honeypot_log` + guard de último admin entram no schema novo (Fase 1/2).
