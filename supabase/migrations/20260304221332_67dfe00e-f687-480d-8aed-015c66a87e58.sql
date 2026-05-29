
-- Create content_templates table
CREATE TABLE public.content_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'note',
  content text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  is_global boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;

-- Users can see their own templates + active global templates
CREATE POLICY "Users can view own templates"
  ON public.content_templates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view active global templates"
  ON public.content_templates FOR SELECT
  TO authenticated
  USING (is_global = true AND active = true);

-- Users can CRUD their own templates
CREATE POLICY "Users can insert own templates"
  ON public.content_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_global = false);

CREATE POLICY "Users can update own templates"
  ON public.content_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND is_global = false);

CREATE POLICY "Users can delete own templates"
  ON public.content_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND is_global = false);

-- Admin full access
CREATE POLICY "Admins can manage all templates"
  ON public.content_templates FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_content_templates_user ON public.content_templates(user_id);
CREATE INDEX idx_content_templates_global ON public.content_templates(is_global, active);
CREATE INDEX idx_content_templates_category ON public.content_templates(category);
