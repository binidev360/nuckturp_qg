
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. RLS: only admins can read/manage roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 5. Create has_role function (security definer, no recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Migrate existing admins from profiles.is_admin to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role
FROM public.profiles
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Update is_admin() function to use user_roles instead of profiles
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- 8. Drop the protect_is_admin trigger (no longer needed, is_admin column is deprecated)
DROP TRIGGER IF EXISTS protect_is_admin_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_is_admin();

-- 9. Update admin_list_users to get is_admin from user_roles
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
      AND (_is_admin IS NULL OR (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin')) = _is_admin)
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

-- 10. Update admin_count_users to use user_roles
DROP FUNCTION IF EXISTS public.admin_count_users(text, boolean, text);

CREATE OR REPLACE FUNCTION public.admin_count_users(
  _search text DEFAULT NULL::text,
  _is_admin boolean DEFAULT NULL,
  _tag text DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT count(*)
  FROM profiles p
  WHERE (_search IS NULL OR p.display_name ILIKE '%' || _search || '%' OR p.nickname ILIKE '%' || _search || '%')
    AND (_is_admin IS NULL OR (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin')) = _is_admin)
    AND (_tag IS NULL OR _tag = ANY(p.tags));
$function$;
