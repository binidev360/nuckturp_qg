
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL::text, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)::int as campaign_count,
      (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id)::int as session_count,
      (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id)::int as note_count,
      (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id)::int as whiteboard_count,
      (
        (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) * 5 +
        (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) * 4 +
        (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) * 2 +
        (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) * 1
      )::int as ranking_score
    FROM profiles p
    WHERE (_search IS NULL OR p.display_name ILIKE '%' || _search || '%' OR p.nickname ILIKE '%' || _search || '%')
    ORDER BY ranking_score DESC, p.created_at DESC
    LIMIT _limit OFFSET _offset
  ) t;
$function$;
