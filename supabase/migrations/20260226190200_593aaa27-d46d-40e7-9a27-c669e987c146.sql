
-- Add profile_id to blog_authors to link with a QG do Mestre profile
ALTER TABLE public.blog_authors 
  ADD COLUMN profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add avatar_url column for standalone authors (no profile linked)
ALTER TABLE public.blog_authors 
  ADD COLUMN avatar_url text;

-- Create index for profile_id lookups
CREATE INDEX idx_blog_authors_profile_id ON public.blog_authors(profile_id);
