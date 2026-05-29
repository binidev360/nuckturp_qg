
-- Featured links / sponsored spots for blog
CREATE TABLE public.featured_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.featured_links ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view active featured links"
  ON public.featured_links FOR SELECT
  USING (active = true);

-- Admin write
CREATE POLICY "Admins can manage featured links"
  ON public.featured_links FOR ALL
  USING (public.is_admin(auth.uid()));
