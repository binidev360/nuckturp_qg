
-- Onda 1: Adicionar tagline e master_title ao profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tagline text,
ADD COLUMN IF NOT EXISTS master_title text;

COMMENT ON COLUMN public.profiles.tagline IS 'Frase de impacto do mestre (exibida no perfil público)';
COMMENT ON COLUMN public.profiles.master_title IS 'Título do mestre ex: Mestre Lendário, Arquimago Narrativo (exibido no perfil público)';

-- Recriar view public_profiles com novos campos
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
  subscription_start,
  tagline,
  master_title
FROM public.profiles;

-- Recriar get_public_profile com novos campos
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
  subscription_start timestamp with time zone,
  tagline text,
  master_title text
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
    subscription_start,
    tagline,
    master_title
  FROM public.profiles
  WHERE slug = _slug;
$$;
