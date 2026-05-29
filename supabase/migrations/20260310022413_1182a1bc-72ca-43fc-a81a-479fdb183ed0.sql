
DROP FUNCTION public.get_feedback_config_by_token(text);

CREATE FUNCTION public.get_feedback_config_by_token(_token text)
RETURNS TABLE(
  id uuid,
  session_id uuid,
  intro_text text,
  cover_url text,
  custom_questions jsonb,
  expected_responses integer,
  thank_you_message text,
  reward_url text,
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
    c.thank_you_message, c.reward_url,
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
