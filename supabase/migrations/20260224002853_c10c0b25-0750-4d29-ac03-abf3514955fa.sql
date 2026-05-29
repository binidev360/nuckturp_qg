-- Fix: Restricted posts are accessible via public SELECT policy
-- Current policy only checks status='published', not visibility
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.posts;

CREATE POLICY "Anyone can view published public posts"
ON public.posts
FOR SELECT
USING (status = 'published' AND visibility = 'public');

-- Authenticated users can view all published posts (including restricted)
CREATE POLICY "Authenticated users can view published restricted posts"
ON public.posts
FOR SELECT
USING (status = 'published' AND visibility = 'restricted' AND auth.uid() IS NOT NULL);