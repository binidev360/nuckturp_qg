
-- Create storage bucket for profile assets (avatars and banners)
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-assets', 'profile-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view profile assets
CREATE POLICY "Public read profile assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-assets');

-- Users can upload their own profile assets
CREATE POLICY "Users can upload own profile assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own profile assets
CREATE POLICY "Users can update own profile assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own profile assets
CREATE POLICY "Users can delete own profile assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
