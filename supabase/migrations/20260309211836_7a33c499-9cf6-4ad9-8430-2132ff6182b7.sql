
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL::text, _limit integer DEFAULT 50, _offset integer DEFAULT 0, _is_admin boolean DEFAULT NULL::boolean, _tag text DEFAULT NULL::text, _sort_field text DEFAULT 'ranking'::text, _sort_direction text DEFAULT 'desc'::text)
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
      (SELECT count(*) FROM players pl JOIN memberships m ON m.tenant_id = pl.tenant_id WHERE m.user_id = p.user_id)::int as player_count,
      (SELECT count(*) FROM player_campaigns pc JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)::int as character_count,
      (SELECT count(*) FROM character_relationships cr JOIN player_campaigns pc ON pc.id = cr.player_campaign_id JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id AND cr.entity_type = 'npc')::int as npc_count,
      (SELECT count(*) FROM posts po JOIN blog_authors ba ON ba.id = po.blog_author_id JOIN profiles pr ON pr.id = ba.profile_id WHERE pr.user_id = p.user_id AND po.status = 'published')::int as post_count,
      (
        (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) * 5 +
        (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) * 4 +
        (SELECT count(*) FROM players pl JOIN memberships m ON m.tenant_id = pl.tenant_id WHERE m.user_id = p.user_id) * 3 +
        (SELECT count(*) FROM player_campaigns pc JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) * 3 +
        (SELECT count(*) FROM posts po JOIN blog_authors ba ON ba.id = po.blog_author_id JOIN profiles pr ON pr.id = ba.profile_id WHERE pr.user_id = p.user_id AND po.status = 'published') * 3 +
        (SELECT count(*) FROM character_relationships cr JOIN player_campaigns pc ON pc.id = cr.player_campaign_id JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id AND cr.entity_type = 'npc') * 2 +
        (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) * 2 +
        (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) * 1
      )::int as ranking_score,
      (
        (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) +
        (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) +
        (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) +
        (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) +
        (SELECT count(*) FROM players pl JOIN memberships m ON m.tenant_id = pl.tenant_id WHERE m.user_id = p.user_id) +
        (SELECT count(*) FROM player_campaigns pc JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) +
        (SELECT count(*) FROM character_relationships cr JOIN player_campaigns pc ON pc.id = cr.player_campaign_id JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)
      )::int as total_usage
    FROM profiles p
    WHERE (_search IS NULL OR p.display_name ILIKE '%' || _search || '%' OR p.nickname ILIKE '%' || _search || '%' OR p.slug ILIKE '%' || _search || '%')
      AND (_is_admin IS NULL OR p.is_admin = _is_admin)
      AND (_tag IS NULL OR _tag = ANY(p.tags))
    ORDER BY
      CASE WHEN _sort_direction = 'desc' THEN
        CASE _sort_field
          WHEN 'created_at' THEN EXTRACT(EPOCH FROM p.created_at)
          WHEN 'campaign_count' THEN (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'session_count' THEN (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'note_count' THEN (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'whiteboard_count' THEN (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'player_count' THEN (SELECT count(*) FROM players pl JOIN memberships m ON m.tenant_id = pl.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'character_count' THEN (SELECT count(*) FROM player_campaigns pc JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'npc_count' THEN (SELECT count(*) FROM character_relationships cr JOIN player_campaigns pc ON pc.id = cr.player_campaign_id JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id AND cr.entity_type = 'npc')
          WHEN 'post_count' THEN (SELECT count(*) FROM posts po JOIN blog_authors ba ON ba.id = po.blog_author_id JOIN profiles pr ON pr.id = ba.profile_id WHERE pr.user_id = p.user_id AND po.status = 'published')
          WHEN 'total_usage' THEN (
            (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM players pl JOIN memberships m ON m.tenant_id = pl.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM player_campaigns pc JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM character_relationships cr JOIN player_campaigns pc ON pc.id = cr.player_campaign_id JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)
          )
          ELSE (
            (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) * 5 +
            (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) * 4 +
            (SELECT count(*) FROM players pl JOIN memberships m ON m.tenant_id = pl.tenant_id WHERE m.user_id = p.user_id) * 3 +
            (SELECT count(*) FROM player_campaigns pc JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) * 3 +
            (SELECT count(*) FROM posts po JOIN blog_authors ba ON ba.id = po.blog_author_id JOIN profiles pr ON pr.id = ba.profile_id WHERE pr.user_id = p.user_id AND po.status = 'published') * 3 +
            (SELECT count(*) FROM character_relationships cr JOIN player_campaigns pc ON pc.id = cr.player_campaign_id JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id AND cr.entity_type = 'npc') * 2 +
            (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) * 2 +
            (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) * 1
          )
        END
      END DESC NULLS LAST,
      CASE WHEN _sort_direction = 'asc' THEN
        CASE _sort_field
          WHEN 'created_at' THEN EXTRACT(EPOCH FROM p.created_at)
          WHEN 'campaign_count' THEN (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'session_count' THEN (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'note_count' THEN (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'whiteboard_count' THEN (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'player_count' THEN (SELECT count(*) FROM players pl JOIN memberships m ON m.tenant_id = pl.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'character_count' THEN (SELECT count(*) FROM player_campaigns pc JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)
          WHEN 'npc_count' THEN (SELECT count(*) FROM character_relationships cr JOIN player_campaigns pc ON pc.id = cr.player_campaign_id JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id AND cr.entity_type = 'npc')
          WHEN 'post_count' THEN (SELECT count(*) FROM posts po JOIN blog_authors ba ON ba.id = po.blog_author_id JOIN profiles pr ON pr.id = ba.profile_id WHERE pr.user_id = p.user_id AND po.status = 'published')
          WHEN 'total_usage' THEN (
            (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM players pl JOIN memberships m ON m.tenant_id = pl.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM player_campaigns pc JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) +
            (SELECT count(*) FROM character_relationships cr JOIN player_campaigns pc ON pc.id = cr.player_campaign_id JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)
          )
          ELSE (
            (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) * 5 +
            (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) * 4 +
            (SELECT count(*) FROM players pl JOIN memberships m ON m.tenant_id = pl.tenant_id WHERE m.user_id = p.user_id) * 3 +
            (SELECT count(*) FROM player_campaigns pc JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) * 3 +
            (SELECT count(*) FROM posts po JOIN blog_authors ba ON ba.id = po.blog_author_id JOIN profiles pr ON pr.id = ba.profile_id WHERE pr.user_id = p.user_id AND po.status = 'published') * 3 +
            (SELECT count(*) FROM character_relationships cr JOIN player_campaigns pc ON pc.id = cr.player_campaign_id JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id AND cr.entity_type = 'npc') * 2 +
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
