
-- Categories for posts
CREATE TABLE public.post_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY "Anyone can view categories" ON public.post_categories FOR SELECT USING (true);
-- Only admins can manage categories
CREATE POLICY "Admins can manage categories" ON public.post_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- Insert default categories
INSERT INTO public.post_categories (name, slug, sort_order) VALUES
  ('Novidades', 'novidades', 1),
  ('Changelog', 'changelog', 2),
  ('Parceiros', 'parceiros', 3),
  ('Dicas & Guias', 'dicas-guias', 4),
  ('Comunidade', 'comunidade', 5);

-- Posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  cover_url TEXT,
  category_id UUID REFERENCES public.post_categories(id),
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[],
  og_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts (important for SEO - no auth required)
CREATE POLICY "Anyone can view published posts" ON public.posts FOR SELECT USING (status = 'published');
-- Admins can do everything
CREATE POLICY "Admins can manage posts" ON public.posts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- Trigger for updated_at
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for SEO slug lookups
CREATE INDEX idx_posts_slug ON public.posts(slug);
CREATE INDEX idx_posts_status_published ON public.posts(status, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_posts_category ON public.posts(category_id);
CREATE INDEX idx_posts_tags ON public.posts USING GIN(tags);
