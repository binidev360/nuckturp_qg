
-- Tabela de resultados de análise de links por post
CREATE TABLE public.link_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  suggested_url text,
  http_status integer,
  link_type text NOT NULL DEFAULT 'internal', -- 'internal' | 'external'
  status text NOT NULL DEFAULT 'pending', -- 'ok' | 'broken' | 'redirect' | 'mapped' | 'unknown' | 'pending'
  content_backup text, -- backup do content original (salvo apenas 1x por post)
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  analyzed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX idx_link_analysis_post_id ON public.link_analysis_results(post_id);
CREATE INDEX idx_link_analysis_status ON public.link_analysis_results(status);
CREATE INDEX idx_link_analysis_link_type ON public.link_analysis_results(link_type);

-- RLS: apenas admins
ALTER TABLE public.link_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage link analysis results"
  ON public.link_analysis_results
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Tabela de log de correções aplicadas
CREATE TABLE public.link_corrections_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  corrections_applied jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{original_url, suggested_url}]
  content_backup text NOT NULL, -- content original antes da correção
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by uuid NOT NULL
);

-- Índice
CREATE INDEX idx_link_corrections_post_id ON public.link_corrections_log(post_id);

-- RLS: apenas admins
ALTER TABLE public.link_corrections_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage link corrections log"
  ON public.link_corrections_log
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
