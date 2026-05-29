-- Site settings table for managing social links and other site-wide config
CREATE TABLE public.site_settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (public blog needs them)
CREATE POLICY "Anyone can read site settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed default row
INSERT INTO public.site_settings (id, social_links) VALUES ('default', '[]'::jsonb);
