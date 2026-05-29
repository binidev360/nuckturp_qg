
-- Fix posts RLS: change policies to PERMISSIVE so either admin OR published check passes
DROP POLICY IF EXISTS "Admins can manage posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.posts;

-- Admins full access (permissive)
CREATE POLICY "Admins can manage posts"
ON public.posts
FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));

-- Anyone can view published posts (permissive)
CREATE POLICY "Anyone can view published posts"
ON public.posts
FOR SELECT
USING (status = 'published');

-- Fix post_categories RLS too
DROP POLICY IF EXISTS "Admins can manage categories" ON public.post_categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.post_categories;

CREATE POLICY "Admins can manage categories"
ON public.post_categories
FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Anyone can view categories"
ON public.post_categories
FOR SELECT
USING (true);
