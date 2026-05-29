
-- Fix 1: Remove overly broad feedback config policy that allows enumeration
-- The public form already uses get_feedback_config_by_token RPC, so this policy is unnecessary
DROP POLICY IF EXISTS "Anyone can read active config by token" ON public.session_feedback_configs;

-- Fix 2: Remove overly broad public profiles policy that exposes is_admin, user_id, etc.
-- Public access should go through the public_profiles view which only exposes safe fields
DROP POLICY IF EXISTS "Public profiles with slug are readable" ON public.profiles;

-- Create a restricted policy that only allows public_profiles view to work
-- The view uses security_invoker, so we need a policy that the view's caller can use
-- But we want to restrict it to only the columns in the view
-- Solution: Create a SECURITY DEFINER function for public profile lookups
CREATE OR REPLACE FUNCTION public.get_public_profile_by_slug(_slug text)
RETURNS TABLE(
  id uuid,
  display_name text,
  nickname text,
  bio text,
  avatar_url text,
  banner_url text,
  banner_position integer,
  website text,
  mesaquest_url text,
  social_links jsonb,
  worldcraft_links jsonb,
  slug text,
  blog_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id, p.display_name, p.nickname, p.bio, p.avatar_url,
    p.banner_url, p.banner_position, p.website, p.mesaquest_url,
    p.social_links, p.worldcraft_links, p.slug, p.blog_enabled
  FROM public.profiles p
  WHERE p.slug = _slug AND p.slug IS NOT NULL;
$$;

-- Re-create the public_profiles view without security_invoker since we removed the policy
-- Use SECURITY DEFINER wrapper instead
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_barrier = true)
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

-- Grant access to the view - it's a security barrier view so it won't expose extra columns
GRANT SELECT ON public.public_profiles TO anon, authenticated;
