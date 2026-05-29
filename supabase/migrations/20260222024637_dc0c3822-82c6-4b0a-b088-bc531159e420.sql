
-- Add profile fields for master profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS pronoun text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS mesaquest_url text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS worldcraft_links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create index on slug for public profile lookup
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug);

-- Allow anyone to read public profiles by slug (for public profile page)
CREATE POLICY "Anyone can view public profiles by slug"
  ON public.profiles
  FOR SELECT
  USING (slug IS NOT NULL);
