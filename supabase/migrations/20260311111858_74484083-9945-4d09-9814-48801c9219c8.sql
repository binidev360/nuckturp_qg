
-- Create storage bucket for feedback branding (covers and logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-branding', 'feedback-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload feedback branding" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'feedback-branding' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own feedback branding" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'feedback-branding' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own feedback branding" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'feedback-branding' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read access
CREATE POLICY "Public can read feedback branding" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'feedback-branding');
