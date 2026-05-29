
-- Create blog-assets storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-assets', 'blog-assets', true);

-- Anyone can view blog assets
CREATE POLICY "Anyone can view blog assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-assets');

-- Admins can upload blog assets
CREATE POLICY "Admins can upload blog assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-assets'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- Admins can update blog assets
CREATE POLICY "Admins can update blog assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-assets'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- Admins can delete blog assets
CREATE POLICY "Admins can delete blog assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-assets'
  AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);
