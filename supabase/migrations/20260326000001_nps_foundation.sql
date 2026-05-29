-- Onda 1 — Fundação: Banco de Dados e Conclusão de Livros

-- 1. Alterar academy_reading_progress para rastrear conclusão
ALTER TABLE public.academy_reading_progress
  ADD COLUMN IF NOT EXISTS completed     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at  timestamptz;

-- 2. Tabela de eventos de conclusão (trigger do NPS)
CREATE TABLE IF NOT EXISTS public.academy_completion_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type  text NOT NULL CHECK (content_type IN ('book','course','lesson')),
  content_id    uuid NOT NULL,
  completed_at  timestamptz NOT NULL DEFAULT now(),
  nps_submitted boolean NOT NULL DEFAULT false,
  nps_skipped   boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, content_type, content_id)
);

-- 3. Tabela de respostas do NPS
CREATE TABLE IF NOT EXISTS public.academy_content_nps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type      text NOT NULL CHECK (content_type IN ('book','course','lesson')),
  content_id        uuid NOT NULL,
  nps_score         integer NOT NULL CHECK (nps_score BETWEEN 0 AND 10),

  -- Perguntas condicionais por faixa de nota
  answer_why_worth  text,    -- "Por que valeu a pena?"
  answer_learnings  text,    -- "Principais aprendizados"
  answer_improve    text,    -- "O que poderia ser melhor?"

  -- Depoimento público
  testimonial_consent boolean NOT NULL DEFAULT false,

  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 4. RLS para academy_completion_events
ALTER TABLE public.academy_completion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own completion events"
  ON public.academy_completion_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own completion events"
  ON public.academy_completion_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own completion events"
  ON public.academy_completion_events
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all completion events"
  ON public.academy_completion_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 5. RLS para academy_content_nps
ALTER TABLE public.academy_content_nps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own NPS responses"
  ON public.academy_content_nps
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own NPS responses"
  ON public.academy_content_nps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all NPS responses"
  ON public.academy_content_nps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_completion_events_user_id ON public.academy_completion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_completion_events_content_id ON public.academy_completion_events(content_id);
CREATE INDEX IF NOT EXISTS idx_content_nps_user_id ON public.academy_content_nps(user_id);
CREATE INDEX IF NOT EXISTS idx_content_nps_content_id ON public.academy_content_nps(content_id);
