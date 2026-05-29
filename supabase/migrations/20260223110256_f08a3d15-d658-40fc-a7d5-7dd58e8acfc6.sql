
-- Update admin_list_users to include tags
CREATE OR REPLACE FUNCTION public.admin_list_users(
  _search text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      p.user_id,
      p.display_name,
      p.nickname,
      p.slug,
      p.avatar_url,
      p.is_admin,
      p.created_at,
      p.updated_at,
      p.onboarding_completed,
      p.experience_level,
      p.session_frequency,
      COALESCE(p.tags, '{}') as tags,
      (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) as campaign_count,
      (SELECT count(*) FROM adventures a JOIN memberships m ON m.tenant_id = a.tenant_id WHERE m.user_id = p.user_id) as adventure_count,
      (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) as session_count,
      (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) as note_count,
      (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) as whiteboard_count
    FROM profiles p
    WHERE (_search IS NULL OR p.display_name ILIKE '%' || _search || '%' OR p.nickname ILIKE '%' || _search || '%')
    ORDER BY p.created_at DESC
    LIMIT _limit OFFSET _offset
  ) t;
$$;
