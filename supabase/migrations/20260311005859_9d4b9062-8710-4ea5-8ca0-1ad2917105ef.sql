
-- Fix legacy RLS policies that still reference profiles.is_admin directly
-- These should use the is_admin() function which now checks user_roles table

-- 1. Fix posts table admin policy
DROP POLICY IF EXISTS "Admins can manage posts" ON public.posts;
CREATE POLICY "Admins can manage posts" ON public.posts FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 2. Fix post_categories table admin policy
DROP POLICY IF EXISTS "Admins can manage categories" ON public.post_categories;
CREATE POLICY "Admins can manage categories" ON public.post_categories FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 3. Fix storage blog-assets policies
DROP POLICY IF EXISTS "Admins can upload blog assets" ON storage.objects;
CREATE POLICY "Admins can upload blog assets" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blog-assets' AND is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update blog assets" ON storage.objects;
CREATE POLICY "Admins can update blog assets" ON storage.objects FOR UPDATE
  USING (bucket_id = 'blog-assets' AND is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete blog assets" ON storage.objects;
CREATE POLICY "Admins can delete blog assets" ON storage.objects FOR DELETE
  USING (bucket_id = 'blog-assets' AND is_admin(auth.uid()));
