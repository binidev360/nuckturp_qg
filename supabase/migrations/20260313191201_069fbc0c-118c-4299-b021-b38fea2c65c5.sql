-- Tabela para armazenar histórico de análises SEO por post
CREATE TABLE public.seo_analysis_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content_hash text NOT NULL,
  mode text NOT NULL DEFAULT 'suggest',
  score_before integer NOT NULL DEFAULT 0,
  score_after integer NOT NULL DEFAULT 0,
  suggestions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index para busca rápida por post e hash
CREATE INDEX idx_seo_history_post ON public.seo_analysis_history(post_id, created_at DESC);
CREATE INDEX idx_seo_history_hash ON public.seo_analysis_history(content_hash);

-- RLS
ALTER TABLE public.seo_analysis_history ENABLE ROW LEVEL SECURITY;

-- Política: usuário só vê suas próprias análises
CREATE POLICY "Users can view own seo analyses"
  ON public.seo_analysis_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own seo analyses"
  ON public.seo_analysis_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Limitar a 10 análises por post (limpeza automática via trigger)
CREATE OR REPLACE FUNCTION public.limit_seo_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.seo_analysis_history
  WHERE id IN (
    SELECT id FROM public.seo_analysis_history
    WHERE post_id = NEW.post_id
    ORDER BY created_at DESC
    OFFSET 10
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_limit_seo_history
AFTER INSERT ON public.seo_analysis_history
FOR EACH ROW EXECUTE FUNCTION public.limit_seo_history();