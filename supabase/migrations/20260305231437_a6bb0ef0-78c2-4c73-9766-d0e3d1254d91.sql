-- Allow blog authors to upload to blog-assets bucket
CREATE POLICY "Blog authors can upload blog assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blog-assets'
  AND get_user_blog_author_id(auth.uid()) IS NOT NULL
);

-- Allow blog authors to update their own uploads
CREATE POLICY "Blog authors can update blog assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'blog-assets'
  AND get_user_blog_author_id(auth.uid()) IS NOT NULL
);

-- Allow blog authors to delete their own uploads
CREATE POLICY "Blog authors can delete blog assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'blog-assets'
  AND get_user_blog_author_id(auth.uid()) IS NOT NULL
);