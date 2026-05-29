
-- ═══════════════════════════════════════════════════════════════
-- Pre-computed engagement scores table
-- Populated daily by cron, eliminates 16+ subqueries per user
-- in admin_list_users.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.user_engagement_scores (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_count int NOT NULL DEFAULT 0,
  session_count int NOT NULL DEFAULT 0,
  note_count int NOT NULL DEFAULT 0,
  whiteboard_count int NOT NULL DEFAULT 0,
  player_count int NOT NULL DEFAULT 0,
  character_count int NOT NULL DEFAULT 0,
  npc_count int NOT NULL DEFAULT 0,
  post_count int NOT NULL DEFAULT 0,
  ranking_score int NOT NULL DEFAULT 0,
  total_usage int NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast ORDER BY ranking_score
CREATE INDEX idx_engagement_ranking ON public.user_engagement_scores (ranking_score DESC);
CREATE INDEX idx_engagement_total ON public.user_engagement_scores (total_usage DESC);

-- RLS: only admins can read
ALTER TABLE public.user_engagement_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read engagement scores"
  ON public.user_engagement_scores
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- Function to recompute all engagement scores
-- Called by cron daily and manually from admin
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_recompute_engagement()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Upsert scores for all users in one batch
  INSERT INTO public.user_engagement_scores (
    user_id, campaign_count, session_count, note_count, whiteboard_count,
    player_count, character_count, npc_count, post_count,
    ranking_score, total_usage, computed_at
  )
  SELECT
    p.user_id,
    COALESCE(cc.cnt, 0)::int,
    COALESCE(sc.cnt, 0)::int,
    COALESCE(nc.cnt, 0)::int,
    COALESCE(wc.cnt, 0)::int,
    COALESCE(plc.cnt, 0)::int,
    COALESCE(chc.cnt, 0)::int,
    COALESCE(npc.cnt, 0)::int,
    COALESCE(poc.cnt, 0)::int,
    -- ranking_score with weights
    (
      COALESCE(cc.cnt, 0) * 5 +
      COALESCE(sc.cnt, 0) * 4 +
      COALESCE(plc.cnt, 0) * 3 +
      COALESCE(chc.cnt, 0) * 3 +
      COALESCE(poc.cnt, 0) * 3 +
      COALESCE(npc.cnt, 0) * 2 +
      COALESCE(nc.cnt, 0) * 2 +
      COALESCE(wc.cnt, 0) * 1
    )::int,
    -- total_usage (sum of all counts)
    (
      COALESCE(cc.cnt, 0) + COALESCE(sc.cnt, 0) + COALESCE(nc.cnt, 0) +
      COALESCE(wc.cnt, 0) + COALESCE(plc.cnt, 0) + COALESCE(chc.cnt, 0) +
      COALESCE(npc.cnt, 0)
    )::int,
    now()
  FROM profiles p
  JOIN memberships m ON m.user_id = p.user_id
  -- Campaigns per user
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM campaigns c WHERE c.tenant_id = m.tenant_id
  ) cc ON true
  -- Sessions per user
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM sessions s WHERE s.tenant_id = m.tenant_id
  ) sc ON true
  -- Notes per user
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM notes n WHERE n.tenant_id = m.tenant_id
  ) nc ON true
  -- Whiteboards per user
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM whiteboards w WHERE w.tenant_id = m.tenant_id
  ) wc ON true
  -- Players per user
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM players pl WHERE pl.tenant_id = m.tenant_id
  ) plc ON true
  -- Characters (player_campaigns) per user
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM player_campaigns pc
    JOIN campaigns c ON c.id = pc.campaign_id
    WHERE c.tenant_id = m.tenant_id
  ) chc ON true
  -- NPCs per user
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM character_relationships cr
    JOIN player_campaigns pc ON pc.id = cr.player_campaign_id
    JOIN campaigns c ON c.id = pc.campaign_id
    WHERE c.tenant_id = m.tenant_id AND cr.entity_type = 'npc'
  ) npc ON true
  -- Published posts per user
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM posts po
    JOIN blog_authors ba ON ba.id = po.blog_author_id
    JOIN profiles pr ON pr.id = ba.profile_id
    WHERE pr.user_id = p.user_id AND po.status = 'published'
  ) poc ON true
  ON CONFLICT (user_id) DO UPDATE SET
    campaign_count = EXCLUDED.campaign_count,
    session_count = EXCLUDED.session_count,
    note_count = EXCLUDED.note_count,
    whiteboard_count = EXCLUDED.whiteboard_count,
    player_count = EXCLUDED.player_count,
    character_count = EXCLUDED.character_count,
    npc_count = EXCLUDED.npc_count,
    post_count = EXCLUDED.post_count,
    ranking_score = EXCLUDED.ranking_score,
    total_usage = EXCLUDED.total_usage,
    computed_at = EXCLUDED.computed_at;

  GET DIAGNOSTICS affected = ROW_COUNT;

  -- Clean up users that no longer exist in profiles
  DELETE FROM public.user_engagement_scores
  WHERE user_id NOT IN (SELECT user_id FROM profiles);

  RETURN json_build_object('updated', affected, 'computed_at', now());
END;
$function$;
