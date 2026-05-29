
-- Step 2: Update view and function
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_barrier = true)
AS
SELECT
  p.id, p.display_name, p.nickname, p.bio,
  p.avatar_url, p.banner_url, p.banner_position,
  p.website, p.mesaquest_url, p.social_links, p.worldcraft_links,
  p.slug, p.blog_enabled,
  p.favorite_systems, p.favorite_vtts, p.preferred_days
FROM public.profiles p
WHERE p.slug IS NOT NULL;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_public_profile(text);

CREATE FUNCTION public.get_public_profile(_slug text)
RETURNS TABLE(
  id uuid, display_name text, nickname text, pronoun text, bio text,
  avatar_url text, banner_url text, banner_position integer, website text,
  mesaquest_url text, social_links jsonb, worldcraft_links jsonb, slug text,
  instagram_posts jsonb, youtube_videos jsonb,
  favorite_systems jsonb, favorite_vtts jsonb, preferred_days jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id, p.display_name, p.nickname, p.pronoun, p.bio, 
    p.avatar_url, p.banner_url, p.banner_position, p.website, 
    p.mesaquest_url, p.social_links, p.worldcraft_links, p.slug,
    p.instagram_posts, p.youtube_videos,
    p.favorite_systems, p.favorite_vtts, p.preferred_days
  FROM profiles p
  WHERE p.slug = _slug AND p.slug IS NOT NULL
  LIMIT 1;
$$;
