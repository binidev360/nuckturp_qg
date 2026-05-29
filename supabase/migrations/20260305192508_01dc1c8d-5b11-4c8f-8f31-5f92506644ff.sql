-- Allow authors to delete their own posts regardless of status
DROP POLICY IF EXISTS "Author can delete own draft posts" ON public.posts;
CREATE POLICY "Author can delete own posts"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (blog_author_id = get_user_blog_author_id(auth.uid()));