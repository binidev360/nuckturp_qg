
-- ═══════════════════════════════════════════════════════════════
-- Rewrite admin_list_users to use pre-computed engagement scores
-- Eliminates ~16 correlated subqueries per user row
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.admin_list_users(text, integer, integer, boolean, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_list_users(
  _search text DEFAULT NULL::text,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0,
  _is_admin boolean DEFAULT NULL::boolean,
  _tag text DEFAULT NULL::text,
  _sort_field text DEFAULT 'ranking'::text,
  _sort_direction text DEFAULT 'desc'::text
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
      (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin')) as is_admin,
      p.created_at,
      p.updated_at,
      p.onboarding_completed,
      p.experience_level,
      p.session_frequency,
      COALESCE(p.tags, '{}') as tags,
      -- Read from pre-computed table instead of subqueries
      COALESCE(es.campaign_count, 0) as campaign_count,
      COALESCE(es.session_count, 0) as session_count,
      COALESCE(es.note_count, 0) as note_count,
      COALESCE(es.whiteboard_count, 0) as whiteboard_count,
      COALESCE(es.player_count, 0) as player_count,
      COALESCE(es.character_count, 0) as character_count,
      COALESCE(es.npc_count, 0) as npc_count,
      COALESCE(es.post_count, 0) as post_count,
      COALESCE(es.ranking_score, 0) as ranking_score,
      COALESCE(es.total_usage, 0) as total_usage
    FROM profiles p
    LEFT JOIN user_engagement_scores es ON es.user_id = p.user_id
    WHERE (_search IS NULL OR p.display_name ILIKE '%' || _search || '%' OR p.nickname ILIKE '%' || _search || '%' OR p.slug ILIKE '%' || _search || '%')
      AND (_is_admin IS NULL OR (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin')) = _is_admin)
      AND (_tag IS NULL OR _tag = ANY(p.tags))
    ORDER BY
      CASE WHEN _sort_direction = 'desc' THEN
        CASE _sort_field
          WHEN 'created_at' THEN EXTRACT(EPOCH FROM p.created_at)
          WHEN 'campaign_count' THEN COALESCE(es.campaign_count, 0)
          WHEN 'session_count' THEN COALESCE(es.session_count, 0)
          WHEN 'note_count' THEN COALESCE(es.note_count, 0)
          WHEN 'whiteboard_count' THEN COALESCE(es.whiteboard_count, 0)
          WHEN 'player_count' THEN COALESCE(es.player_count, 0)
          WHEN 'character_count' THEN COALESCE(es.character_count, 0)
          WHEN 'npc_count' THEN COALESCE(es.npc_count, 0)
          WHEN 'post_count' THEN COALESCE(es.post_count, 0)
          WHEN 'total_usage' THEN COALESCE(es.total_usage, 0)
          ELSE COALESCE(es.ranking_score, 0)
        END
      END DESC NULLS LAST,
      CASE WHEN _sort_direction = 'asc' THEN
        CASE _sort_field
          WHEN 'created_at' THEN EXTRACT(EPOCH FROM p.created_at)
          WHEN 'campaign_count' THEN COALESCE(es.campaign_count, 0)
          WHEN 'session_count' THEN COALESCE(es.session_count, 0)
          WHEN 'note_count' THEN COALESCE(es.note_count, 0)
          WHEN 'whiteboard_count' THEN COALESCE(es.whiteboard_count, 0)
          WHEN 'player_count' THEN COALESCE(es.player_count, 0)
          WHEN 'character_count' THEN COALESCE(es.character_count, 0)
          WHEN 'npc_count' THEN COALESCE(es.npc_count, 0)
          WHEN 'post_count' THEN COALESCE(es.post_count, 0)
          WHEN 'total_usage' THEN COALESCE(es.total_usage, 0)
          ELSE COALESCE(es.ranking_score, 0)
        END
      END ASC NULLS LAST
    LIMIT _limit OFFSET _offset
  ) t;

  RETURN result;
END;
$function$;
