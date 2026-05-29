
-- Replace admin_list_users to support sort_field and sort_direction
CREATE OR REPLACE FUNCTION public.admin_list_users(
  _search text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0,
  _is_admin boolean DEFAULT NULL,
  _tag text DEFAULT NULL,
  _sort_field text DEFAULT 'ranking',
  _sort_direction text DEFAULT 'desc'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
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
      (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)::int as campaign_count,
      (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id)::int as session_count,
      (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id)::int as note_count,
      (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id)::int as whiteboard_count,
      (
        (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) * 5 +
        (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) * 4 +
        (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) * 2 +
        (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) * 1
      )::int as ranking_score,
      (
        (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) +
        (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) +
        (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) +
        (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id)
      )::int as total_usage
    FROM profiles p
    WHERE (_search IS NULL OR p.display_name ILIKE '%' || _search || '%' OR p.nickname ILIKE '%' || _search || '%')
      AND (_is_admin IS NULL OR p.is_admin = _is_admin)
      AND (_tag IS NULL OR _tag = ANY(p.tags))
    ORDER BY
      CASE WHEN _sort_direction = 'desc' THEN
        CASE _sort_field
          WHEN 'campaign_count' THEN (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'session_count' THEN (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'note_count' THEN (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'whiteboard_count' THEN (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'total_usage' THEN (
            (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id)
          )
          ELSE (
            (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) * 5 +
            (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) * 4 +
            (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) * 2 +
            (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) * 1
          )
        END
      END DESC NULLS LAST,
      CASE WHEN _sort_direction = 'asc' THEN
        CASE _sort_field
          WHEN 'campaign_count' THEN (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'session_count' THEN (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'note_count' THEN (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'whiteboard_count' THEN (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'total_usage' THEN (
            (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id)
          )
          ELSE (
            (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) * 5 +
            (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) * 4 +
            (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) * 2 +
            (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) * 1
          )
        END
      END ASC NULLS LAST,
      p.created_at DESC
    LIMIT _limit OFFSET _offset
  ) t;

  RETURN result;
END;
$function$;

-- Function to get all distinct tags from profiles
CREATE OR REPLACE FUNCTION public.admin_all_tags()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(DISTINCT tag ORDER BY tag), '[]'::json)
  FROM profiles p, unnest(COALESCE(p.tags, '{}')) AS tag
  WHERE tag IS NOT NULL AND tag != '';
$function$;
