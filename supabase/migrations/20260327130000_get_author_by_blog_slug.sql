-- Arquitetura limpa: blog routes usam blog_authors.slug como slug canônico,
-- profile routes usam profiles.slug. Essa função é a única fonte de verdade
-- para resolver um autor a partir do slug de blog, sem depender de slugs coincidirem.
--
-- SECURITY DEFINER: contorna RLS de profiles para usuários anônimos,
-- expondo apenas campos públicos necessários para as páginas de blog.

CREATE OR REPLACE FUNCTION public.get_author_by_blog_slug(_slug text)
RETURNS TABLE(
  -- blog_authors fields
  author_id        uuid,
  author_slug      text,
  author_name      text,
  author_avatar_url text,
  author_bio       text,
  blog_title       text,
  blog_banner_url  text,
  blog_banner_position integer,
  blog_accent_color text,
  blog_bg_image_url text,
  blog_title_font  text,
  -- profiles fields (public only)
  profile_id       uuid,
  profile_slug     text,
  profile_display_name text,
  profile_nickname text,
  profile_avatar_url text,
  profile_bio      text,
  profile_banner_url text,
  profile_banner_position integer,
  profile_website  text,
  profile_mesaquest_url text,
  profile_social_links jsonb,
  profile_worldcraft_links jsonb,
  profile_blog_enabled boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ba.id,
    ba.slug,
    ba.name,
    ba.avatar_url,
    ba.bio,
    ba.blog_title,
    ba.blog_banner_url,
    ba.blog_banner_position,
    ba.blog_accent_color,
    ba.blog_bg_image_url,
    ba.blog_title_font,
    p.id,
    p.slug,
    p.display_name,
    p.nickname,
    p.avatar_url,
    p.bio,
    p.banner_url,
    p.banner_position,
    p.website,
    p.mesaquest_url,
    p.social_links,
    p.worldcraft_links,
    p.blog_enabled
  FROM public.blog_authors ba
  LEFT JOIN public.profiles p ON p.id = ba.profile_id
  WHERE ba.slug = _slug
  LIMIT 1;
$$;
