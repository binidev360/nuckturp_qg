
-- Add content verification and override fields to post_features
ALTER TABLE public.post_features
  ADD COLUMN IF NOT EXISTS content_verified_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS override_category_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS override_tags text[] NOT NULL DEFAULT '{}';

-- Function to get user_id from blog_author_id
CREATE OR REPLACE FUNCTION public.get_user_id_from_blog_author(_blog_author_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id
  FROM public.profiles p
  JOIN public.blog_authors ba ON ba.profile_id = p.id
  WHERE ba.id = _blog_author_id
  LIMIT 1;
$$;
