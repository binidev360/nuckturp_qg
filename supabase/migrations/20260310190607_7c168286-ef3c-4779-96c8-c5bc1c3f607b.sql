
ALTER TABLE public.blog_authors
  ADD COLUMN IF NOT EXISTS blog_title text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS blog_banner_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS blog_banner_position integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS blog_accent_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS blog_bg_image_url text DEFAULT NULL;
