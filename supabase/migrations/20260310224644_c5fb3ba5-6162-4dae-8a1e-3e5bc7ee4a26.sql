
CREATE TABLE public.email_pipeline_settings (
  id text PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.email_pipeline_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email pipeline settings"
  ON public.email_pipeline_settings
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.email_pipeline_settings (id, label, active) VALUES
  ('reengagement_15d', 'Reengajamento 15 dias', true),
  ('reengagement_30d', 'Reengajamento 30 dias', true),
  ('session_reminder', 'Lembrete de Sessão', true),
  ('blog_digest', 'Digest Semanal', true);
