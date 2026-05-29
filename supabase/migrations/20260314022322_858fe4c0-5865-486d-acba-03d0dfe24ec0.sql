
-- Drop and recreate get_public_profile to add profile_accent_color
DROP FUNCTION IF EXISTS public.get_public_profile(text);

CREATE FUNCTION public.get_public_profile(_slug text)
RETURNS TABLE(
  id uuid, display_name text, nickname text, pronoun text, bio text,
  avatar_url text, banner_url text, banner_position integer, website text,
  mesaquest_url text, social_links jsonb, worldcraft_links jsonb, slug text,
  instagram_posts jsonb, youtube_videos jsonb, blog_enabled boolean,
  favorite_systems jsonb, favorite_vtts jsonb, preferred_days jsonb,
  commissioned_master text, subscription_start text, tagline text,
  master_title text, profile_accent_color text
)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    id, display_name, nickname, pronoun, bio,
    avatar_url, banner_url, banner_position, website,
    mesaquest_url, social_links, worldcraft_links, slug,
    instagram_posts, youtube_videos, blog_enabled,
    favorite_systems, favorite_vtts, preferred_days,
    commissioned_master, subscription_start, tagline,
    master_title, profile_accent_color
  FROM public.profiles
  WHERE slug = _slug;
$$;
