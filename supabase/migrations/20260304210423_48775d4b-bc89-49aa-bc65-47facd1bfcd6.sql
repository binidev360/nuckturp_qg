
-- Create a public view exposing only safe profile fields
-- This allows unauthenticated users to see author profile data in blog joins
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- Grant anonymous and authenticated access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;
