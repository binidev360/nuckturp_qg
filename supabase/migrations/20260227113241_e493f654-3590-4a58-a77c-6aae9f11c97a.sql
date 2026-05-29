
CREATE FUNCTION public.get_public_profile(_slug text)
 RETURNS TABLE(id uuid, display_name text, nickname text, pronoun text, bio text, avatar_url text, banner_url text, banner_position integer, website text, mesaquest_url text, social_links jsonb, worldcraft_links jsonb, slug text, instagram_posts jsonb, youtube_videos jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    p.id, p.display_name, p.nickname, p.pronoun, p.bio, 
    p.avatar_url, p.banner_url, p.banner_position, p.website, 
    p.mesaquest_url, p.social_links, p.worldcraft_links, p.slug,
    p.instagram_posts, p.youtube_videos
  FROM profiles p
  WHERE p.slug = _slug AND p.slug IS NOT NULL
  LIMIT 1;
$$;
