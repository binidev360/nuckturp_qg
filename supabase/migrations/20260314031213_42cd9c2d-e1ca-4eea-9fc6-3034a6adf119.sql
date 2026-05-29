-- Fix: get_public_profile must be SECURITY DEFINER so anonymous users can access public profiles
-- Currently SECURITY INVOKER, which fails because anon has no SELECT policy on profiles table

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
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.display_name, p.nickname, p.pronoun, p.bio,
    p.avatar_url, p.banner_url, p.banner_position, p.website,
    p.mesaquest_url, p.social_links, p.worldcraft_links, p.slug,
    p.instagram_posts, p.youtube_videos, p.blog_enabled,
    p.favorite_systems, p.favorite_vtts, p.preferred_days,
    p.commissioned_master, p.subscription_start, p.tagline,
    p.master_title, p.profile_accent_color
  FROM public.profiles p
  WHERE p.slug = _slug;
$$;