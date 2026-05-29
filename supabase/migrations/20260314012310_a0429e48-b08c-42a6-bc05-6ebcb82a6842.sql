-- Add subscription_start field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_start timestamp with time zone;

COMMENT ON COLUMN public.profiles.subscription_start IS 'Data de início da assinatura premium (exibida publicamente)';

-- Drop and recreate public_profiles view
DROP VIEW IF EXISTS public.public_profiles CASCADE;

CREATE VIEW public.public_profiles 
WITH (security_barrier = true) 
AS
SELECT 
  id,
  display_name,
  nickname,
  pronoun,
  bio,
  avatar_url,
  banner_url,
  banner_position,
  website,
  mesaquest_url,
  social_links,
  worldcraft_links,
  slug,
  instagram_posts,
  youtube_videos,
  blog_enabled,
  favorite_systems,
  favorite_vtts,
  preferred_days,
  commissioned_master,
  subscription_start
FROM public.profiles;

-- Drop and recreate get_public_profile function
DROP FUNCTION IF EXISTS public.get_public_profile(text);

CREATE FUNCTION public.get_public_profile(_slug text)
RETURNS TABLE (
  id uuid,
  display_name text,
  nickname text,
  pronoun text,
  bio text,
  avatar_url text,
  banner_url text,
  banner_position int,
  website text,
  mesaquest_url text,
  social_links jsonb,
  worldcraft_links jsonb,
  slug text,
  instagram_posts jsonb,
  youtube_videos jsonb,
  blog_enabled boolean,
  favorite_systems jsonb,
  favorite_vtts jsonb,
  preferred_days jsonb,
  commissioned_master text,
  subscription_start timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    display_name,
    nickname,
    pronoun,
    bio,
    avatar_url,
    banner_url,
    banner_position,
    website,
    mesaquest_url,
    social_links,
    worldcraft_links,
    slug,
    instagram_posts,
    youtube_videos,
    blog_enabled,
    favorite_systems,
    favorite_vtts,
    preferred_days,
    commissioned_master,
    subscription_start
  FROM public.profiles
  WHERE slug = _slug;
$$;