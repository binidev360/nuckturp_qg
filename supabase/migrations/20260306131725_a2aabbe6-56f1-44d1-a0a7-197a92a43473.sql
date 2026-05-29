
CREATE TABLE public.admin_cost_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value numeric NOT NULL DEFAULT 0,
  label text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.admin_cost_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cost settings"
  ON public.admin_cost_settings
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can read cost settings"
  ON public.admin_cost_settings
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Seed default values based on Lovable Cloud pricing
INSERT INTO public.admin_cost_settings (key, value, label) VALUES
  ('base_plan', 25, 'Plano base (Lovable Cloud Pro)'),
  ('auth_cost', 0, 'Auth (MAU excedente)'),
  ('edge_functions', 2, 'Edge Functions'),
  ('storage', 0, 'Storage adicional'),
  ('ai_api', 0, 'APIs de IA externas'),
  ('other', 0, 'Outros custos');
