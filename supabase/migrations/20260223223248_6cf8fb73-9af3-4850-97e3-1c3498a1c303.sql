
-- Create blog_authors table
CREATE TABLE public.blog_authors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  bio TEXT,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;

-- Public read access (authors are public info)
CREATE POLICY "Blog authors are publicly readable"
  ON public.blog_authors FOR SELECT
  USING (true);

-- Only admins can manage authors
CREATE POLICY "Admins can manage blog authors"
  ON public.blog_authors FOR ALL
  USING (public.is_admin(auth.uid()));

-- Add blog_author_id to posts
ALTER TABLE public.posts ADD COLUMN blog_author_id UUID REFERENCES public.blog_authors(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_blog_authors_updated_at
  BEFORE UPDATE ON public.blog_authors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
