
-- Drop all overloaded versions of admin_list_users
DROP FUNCTION IF EXISTS public.admin_list_users(text, integer, integer);
DROP FUNCTION IF EXISTS public.admin_list_users(text, integer, integer, boolean, text);
DROP FUNCTION IF EXISTS public.admin_list_users(text, integer, integer, boolean, text, text, text);

-- Recreate with new counts: player_count, character_count, npc_count, post_count
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
AS $$
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
      -- Existing counts
      (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)::int as campaign_count,
      (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id)::int as session_count,
      (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id)::int as note_count,
      (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id)::int as whiteboard_count,
      -- New counts
      (SELECT count(*) FROM players pl JOIN memberships m ON m.tenant_id = pl.tenant_id WHERE m.user_id = p.user_id)::int as player_count,
      (SELECT count(*) FROM player_campaigns pc JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id)::int as character_count,
      (SELECT count(*) FROM character_relationships cr JOIN player_campaigns pc ON pc.id = cr.player_campaign_id JOIN campaigns c ON c.id = pc.campaign_id JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id AND cr.entity_type = 'npc')::int as npc_count,
      (SELECT count(*) FROM posts po JOIN blog_authors ba ON ba.id = po.blog_author_id JOIN profiles pr ON pr.id = ba.profile_id WHERE pr.user_id = p.user_id AND po.status = 'published')::int as post_count,
      -- New ranking: camp*5 + sess*4 + players*3 + chars*3 + posts*3 + npcs*2 + notes*2 + wb*1
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
      -- Total usage
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
$$;
