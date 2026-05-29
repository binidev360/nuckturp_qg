
-- Add blog_enabled to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blog_enabled boolean NOT NULL DEFAULT false;

-- Create helper function to get blog_author_id for a user
CREATE OR REPLACE FUNCTION public.get_user_blog_author_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ba.id
  FROM public.blog_authors ba
  JOIN public.profiles p ON p.id = ba.profile_id
  WHERE p.user_id = _user_id
  LIMIT 1;
$$;

-- RLS: Authors can SELECT their own posts
CREATE POLICY "Author can select own posts"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (blog_author_id = get_user_blog_author_id(auth.uid()));

-- RLS: Authors can INSERT their own posts (only draft status)
CREATE POLICY "Author can insert own posts"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    blog_author_id = get_user_blog_author_id(auth.uid())
    AND get_user_blog_author_id(auth.uid()) IS NOT NULL
    AND status IN ('draft', 'pending')
  );

-- RLS: Authors can UPDATE their own posts (cannot set to published directly)
CREATE POLICY "Author can update own posts"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (blog_author_id = get_user_blog_author_id(auth.uid()))
  WITH CHECK (
    blog_author_id = get_user_blog_author_id(auth.uid())
    AND status IN ('draft', 'pending')
  );

-- RLS: Authors can DELETE their own draft/pending posts
CREATE POLICY "Author can delete own draft posts"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (
    blog_author_id = get_user_blog_author_id(auth.uid())
    AND status IN ('draft', 'pending')
  );
