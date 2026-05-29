-- Fix: BlogFeaturedAuthors joins profiles directly, which is blocked by RLS for anon users.
-- Logged-out users get profile_slug = null, so the link falls back to blog_authors.slug,
-- which doesn't match profiles.slug — causing a 404 on /m/:slug/blog.
-- Solution: SECURITY DEFINER function that fetches public profile data by array of profile IDs.

CREATE OR REPLACE FUNCTION public.get_profiles_public_data(p_ids uuid[])
RETURNS TABLE(
  id uuid,
  slug text,
  nickname text,
  display_name text,
  avatar_url text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.slug, p.nickname, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(p_ids);
$$;
