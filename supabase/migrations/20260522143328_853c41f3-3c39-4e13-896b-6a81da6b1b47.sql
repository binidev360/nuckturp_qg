
-- ============================================================================
-- Limpeza de base 2026-05-22 — usuários inativos sem conteúdo
-- Critérios (deletar):
--   A) onboarding_completed != true  E  zero conteúdo
--   B) onboarding completo, zero conteúdo, último login >= 30 dias (ou nunca)
-- Preservar SEMPRE:
--   - Premium ativo (subscription_start ou premium_overrides)
--   - Admins
--   - Qualquer um com 1+ campanha/nota/sessão/quadro/player/post/favorito/
--     pasta/template/anotação academia/progresso curso/NPS/follow/uso IA
--   - Onboarding completo + login últimos 30 dias (mesmo sem conteúdo)
-- Snapshot retido por 90 dias em _purge_backup_20260522
-- ============================================================================

-- 1. Backup table (snapshot completo antes da deleção)
CREATE TABLE IF NOT EXISTS public._purge_backup_20260522 (
  user_id uuid PRIMARY KEY,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb,
  profile jsonb,
  memberships jsonb,
  bucket text,
  purged_at timestamptz DEFAULT now(),
  drop_after timestamptz DEFAULT (now() + interval '90 days')
);

ALTER TABLE public._purge_backup_20260522 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only_purge_backup" ON public._purge_backup_20260522;
CREATE POLICY "admin_only_purge_backup" ON public._purge_backup_20260522
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. CTEs de identificação + snapshot + delete (tudo em uma transação)
WITH content_tenants AS (
  SELECT tenant_id FROM campaigns WHERE tenant_id IS NOT NULL
  UNION SELECT tenant_id FROM notes WHERE tenant_id IS NOT NULL
  UNION SELECT tenant_id FROM sessions WHERE tenant_id IS NOT NULL
  UNION SELECT tenant_id FROM whiteboards WHERE tenant_id IS NOT NULL
  UNION SELECT tenant_id FROM players WHERE tenant_id IS NOT NULL
  UNION SELECT tenant_id FROM folders WHERE tenant_id IS NOT NULL
),
content_users AS (
  SELECT DISTINCT m.user_id FROM memberships m WHERE m.tenant_id IN (SELECT tenant_id FROM content_tenants)
  UNION SELECT user_id FROM favorites WHERE user_id IS NOT NULL
  UNION SELECT user_id FROM content_templates WHERE user_id IS NOT NULL
  UNION SELECT user_id FROM academy_annotations WHERE user_id IS NOT NULL
  UNION SELECT user_id FROM academy_course_progress WHERE user_id IS NOT NULL
  UNION SELECT user_id FROM academy_content_nps WHERE user_id IS NOT NULL
  UNION SELECT user_id FROM author_follows WHERE user_id IS NOT NULL
  UNION SELECT user_id FROM ai_usage_logs WHERE user_id IS NOT NULL
  UNION SELECT author_id FROM posts WHERE author_id IS NOT NULL
),
premium_users AS (
  SELECT user_id FROM profiles WHERE subscription_start IS NOT NULL
  UNION SELECT user_id FROM premium_overrides WHERE ends_at IS NULL OR ends_at > now()
),
admin_users AS (
  SELECT user_id FROM user_roles WHERE role = 'admin'
),
targets AS (
  SELECT u.id AS user_id, u.email, u.created_at, u.last_sign_in_at,
         u.raw_user_meta_data, u.raw_app_meta_data,
         CASE
           WHEN p.onboarding_completed IS NOT TRUE THEN 'A_no_onboarding'
           ELSE 'B_inactive_empty_done'
         END AS bucket
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  WHERE u.id NOT IN (SELECT user_id FROM content_users WHERE user_id IS NOT NULL)
    AND u.id NOT IN (SELECT user_id FROM premium_users WHERE user_id IS NOT NULL)
    AND u.id NOT IN (SELECT user_id FROM admin_users)
    AND (
      p.onboarding_completed IS NOT TRUE
      OR (u.last_sign_in_at IS NULL OR u.last_sign_in_at < now() - interval '30 days')
    )
)
INSERT INTO public._purge_backup_20260522
  (user_id, email, created_at, last_sign_in_at, raw_user_meta_data, raw_app_meta_data, profile, memberships, bucket)
SELECT
  t.user_id, t.email, t.created_at, t.last_sign_in_at,
  t.raw_user_meta_data, t.raw_app_meta_data,
  to_jsonb(p.*),
  (SELECT jsonb_agg(to_jsonb(m.*)) FROM memberships m WHERE m.user_id = t.user_id),
  t.bucket
FROM targets t
LEFT JOIN profiles p ON p.user_id = t.user_id
ON CONFLICT (user_id) DO NOTHING;

-- 3. Delete: auth.users → cascade para profiles, memberships, etc.
DELETE FROM auth.users WHERE id IN (SELECT user_id FROM public._purge_backup_20260522);

-- 4. Job para dropar a tabela de backup automaticamente após 90 dias
-- (manual cleanup via cron job já existente ou drop manual em 2026-08-20)
COMMENT ON TABLE public._purge_backup_20260522 IS
  'Snapshot da limpeza de base 2026-05-22. Dropar manualmente após 2026-08-20.';
