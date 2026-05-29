
-- Fix: Make the view use SECURITY INVOKER to respect RLS of the querying user
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.display_name,
  p.nickname,
  p.bio,
  p.avatar_url,
  p.banner_url,
  p.banner_position,
  p.website,
  p.mesaquest_url,
  p.social_links,
  p.worldcraft_links,
  p.slug,
  p.blog_enabled
FROM public.profiles p
WHERE p.slug IS NOT NULL;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add a limited public SELECT policy on profiles for rows with a public slug
-- This only exposes profiles that have opted into public visibility (slug set)
CREATE POLICY "Public profiles with slug are readable"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (slug IS NOT NULL);
