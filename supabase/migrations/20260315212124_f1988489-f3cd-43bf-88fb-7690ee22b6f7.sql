
-- Tabela de mapeamentos de URLs (memória de/para para a auditoria de links)
-- Quando o admin corrige um link, o sistema lembra para sugerir automaticamente no futuro
CREATE TABLE public.link_url_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_url text NOT NULL,
  corrected_url text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(original_url)
);

-- RLS: apenas admins
ALTER TABLE public.link_url_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage link mappings"
  ON public.link_url_mappings
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Index para busca rápida por original_url
CREATE INDEX idx_link_url_mappings_original ON public.link_url_mappings(original_url);
