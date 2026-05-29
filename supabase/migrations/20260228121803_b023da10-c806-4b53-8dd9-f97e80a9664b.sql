
-- Item 2: Allow authors to publish directly (not just draft/pending)
-- Update INSERT policy for authors to allow published status
DROP POLICY IF EXISTS "Author can insert own posts" ON public.posts;
CREATE POLICY "Author can insert own posts" ON public.posts
  FOR INSERT
  WITH CHECK (
    blog_author_id = get_user_blog_author_id(auth.uid())
    AND get_user_blog_author_id(auth.uid()) IS NOT NULL
    AND status = ANY (ARRAY['draft', 'pending', 'published'])
  );

-- Update UPDATE policy for authors to allow published status
DROP POLICY IF EXISTS "Author can update own posts" ON public.posts;
CREATE POLICY "Author can update own posts" ON public.posts
  FOR UPDATE
  USING (blog_author_id = get_user_blog_author_id(auth.uid()))
  WITH CHECK (
    blog_author_id = get_user_blog_author_id(auth.uid())
    AND status = ANY (ARRAY['draft', 'pending', 'published'])
  );

-- Item 3: Add view_count column for real tracking in sidebar
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
