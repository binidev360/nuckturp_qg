
-- Create menu_items table for managing navigation menus
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  url TEXT,
  type TEXT NOT NULL DEFAULT 'internal' CHECK (type IN ('internal', 'external', 'category', 'separator')),
  icon TEXT,
  parent_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  open_in_new_tab BOOLEAN NOT NULL DEFAULT false,
  menu_location TEXT NOT NULL DEFAULT 'header' CHECK (menu_location IN ('header', 'footer', 'both')),
  category_id UUID REFERENCES public.post_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Anyone can read active menu items (public menu)
CREATE POLICY "Anyone can view active menu items"
  ON public.menu_items FOR SELECT
  USING (active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage menu items"
  ON public.menu_items FOR ALL
  USING (is_admin(auth.uid()));
