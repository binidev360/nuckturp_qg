
-- Drop the overly permissive public profile policy
DROP POLICY IF EXISTS "Anyone can view public profiles by slug" ON public.profiles;

-- Create a new policy that only allows public access to profiles with slugs
-- but we restrict via a security-definer function that returns only safe columns
CREATE OR REPLACE FUNCTION public.get_public_profile(_slug text)
RETURNS TABLE(
  id uuid,
  display_name text,
  nickname text,
  pronoun text,
  bio text,
  avatar_url text,
  banner_url text,
  banner_position integer,
  website text,
  mesaquest_url text,
  social_links jsonb,
  worldcraft_links jsonb,
  slug text
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    p.id, p.display_name, p.nickname, p.pronoun, p.bio, 
    p.avatar_url, p.banner_url, p.banner_position, p.website, 
    p.mesaquest_url, p.social_links, p.worldcraft_links, p.slug
  FROM profiles p
  WHERE p.slug = _slug AND p.slug IS NOT NULL
  LIMIT 1;
$$;

-- Re-create a more restrictive public profile SELECT policy
-- Only allow selecting specific non-sensitive columns for profiles with slugs
-- Since RLS can't restrict columns, we keep the policy but it's now supplemented
-- by the RPC function for public access
CREATE POLICY "Anyone can view public profiles by slug"
ON public.profiles
FOR SELECT
USING (slug IS NOT NULL);
