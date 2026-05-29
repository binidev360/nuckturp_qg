
DROP FUNCTION public.get_feedback_config_by_token(text);
CREATE FUNCTION public.get_feedback_config_by_token(_token text)
RETURNS TABLE(
  id uuid, session_id uuid, intro_text text, cover_url text,
  cover_position integer,
  header_type text, header_logo_url text, header_text text,
  custom_questions jsonb, expected_responses integer,
  thank_you_message text, reward_url text,
  session_name text, campaign_name text, campaign_cover_url text,
  master_name text, master_avatar text,
  master_nickname text, master_slug text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT c.id, c.session_id, c.intro_text, c.cover_url, c.cover_position,
    c.header_type, c.header_logo_url, c.header_text,
    c.custom_questions, c.expected_responses, c.thank_you_message, c.reward_url,
    s.name, ca.name, COALESCE(c.cover_url, ca.cover_url),
    p.display_name, p.avatar_url, p.nickname, p.slug
  FROM session_feedback_configs c
  JOIN sessions s ON s.id = c.session_id
  JOIN campaigns ca ON ca.id = s.campaign_id
  JOIN tenants t ON t.id = c.tenant_id
  JOIN profiles p ON p.user_id = t.owner_id
  WHERE c.token = _token AND c.active = true;
$$;
