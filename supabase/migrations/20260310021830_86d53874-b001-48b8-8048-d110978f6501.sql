
-- Session feedback configs (one per session, created by the GM)
CREATE TABLE public.session_feedback_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  active boolean NOT NULL DEFAULT true,
  intro_text text NOT NULL DEFAULT 'Olá! Sua opinião é muito importante para que eu possa melhorar como mestre. Este formulário é totalmente anônimo — suas respostas não serão identificadas. Responda com sinceridade!',
  cover_url text,
  custom_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  thank_you_message text,
  reward_url text,
  reward_type text DEFAULT 'none',
  expected_responses integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id),
  UNIQUE(token)
);

ALTER TABLE public.session_feedback_configs ENABLE ROW LEVEL SECURITY;

-- Owner can manage their feedback configs
CREATE POLICY "Owner can manage feedback configs" ON public.session_feedback_configs
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Public can read active configs by token (for the form)
CREATE POLICY "Anyone can read active config by token" ON public.session_feedback_configs
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- Session feedback responses (anonymous, from players)
CREATE TABLE public.session_feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.session_feedback_configs(id) ON DELETE CASCADE,
  email text NOT NULL,
  nps_score integer NOT NULL CHECK (nps_score >= 0 AND nps_score <= 10),
  liked_chips text[] NOT NULL DEFAULT '{}',
  liked_detail text,
  improve_chips text[] NOT NULL DEFAULT '{}',
  improve_detail text,
  highlight text,
  custom_answers jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(config_id, email)
);

ALTER TABLE public.session_feedback_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can insert responses (public form, no auth required)
CREATE POLICY "Anyone can insert feedback responses" ON public.session_feedback_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Owner can read responses (but email is hidden via a view)
-- We use a SECURITY DEFINER function to strip emails
CREATE OR REPLACE FUNCTION public.get_feedback_responses(_config_id uuid)
RETURNS TABLE(
  id uuid,
  config_id uuid,
  nps_score integer,
  liked_chips text[],
  liked_detail text,
  improve_chips text[],
  improve_detail text,
  highlight text,
  custom_answers jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id, r.config_id, r.nps_score,
    r.liked_chips, r.liked_detail,
    r.improve_chips, r.improve_detail,
    r.highlight, r.custom_answers, r.created_at
  FROM session_feedback_responses r
  JOIN session_feedback_configs c ON c.id = r.config_id
  WHERE r.config_id = _config_id
    AND c.tenant_id = get_user_tenant_id(auth.uid());
$$;

-- Count responses (public, for showing progress)
CREATE OR REPLACE FUNCTION public.count_feedback_responses(_config_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM session_feedback_responses WHERE config_id = _config_id;
$$;

-- Check if email already responded
CREATE OR REPLACE FUNCTION public.check_feedback_email(_config_id uuid, _email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM session_feedback_responses
    WHERE config_id = _config_id AND email = _email
  );
$$;

-- AI analysis results
CREATE TABLE public.session_feedback_ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.session_feedback_configs(id) ON DELETE CASCADE,
  analysis_type text NOT NULL DEFAULT 'session',
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_feedback_ai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage AI analyses" ON public.session_feedback_ai_analyses
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM session_feedback_configs c
    WHERE c.id = session_feedback_ai_analyses.config_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM session_feedback_configs c
    WHERE c.id = session_feedback_ai_analyses.config_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

-- Admin master notes (for admin overview)
CREATE TABLE public.admin_master_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_master_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage master notes" ON public.admin_master_notes
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Get public feedback config by token (for the form page)
CREATE OR REPLACE FUNCTION public.get_feedback_config_by_token(_token text)
RETURNS TABLE(
  id uuid,
  session_id uuid,
  intro_text text,
  cover_url text,
  custom_questions jsonb,
  expected_responses integer,
  session_name text,
  campaign_name text,
  campaign_cover_url text,
  master_name text,
  master_avatar text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.session_id, c.intro_text, c.cover_url,
    c.custom_questions, c.expected_responses,
    s.name AS session_name,
    ca.name AS campaign_name,
    COALESCE(c.cover_url, ca.cover_url) AS campaign_cover_url,
    p.display_name AS master_name,
    p.avatar_url AS master_avatar
  FROM session_feedback_configs c
  JOIN sessions s ON s.id = c.session_id
  JOIN campaigns ca ON ca.id = s.campaign_id
  JOIN tenants t ON t.id = c.tenant_id
  JOIN profiles p ON p.user_id = t.owner_id
  WHERE c.token = _token AND c.active = true;
$$;
