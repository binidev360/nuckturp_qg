
-- ============================================================
-- Migration: Criar tabelas e colunas faltantes da Academia
-- ============================================================

-- 1. Adicionar coluna course_id em academy_cards (vitrine → curso)
ALTER TABLE public.academy_cards
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.academy_courses(id) ON DELETE SET NULL;

-- 2. Adicionar colunas completed e completed_at em academy_reading_progress
ALTER TABLE public.academy_reading_progress
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 3. Criar tabela academy_completion_events
CREATE TABLE IF NOT EXISTS public.academy_completion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('book', 'course', 'lesson')),
  content_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  nps_submitted boolean NOT NULL DEFAULT false,
  nps_skipped boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, content_type, content_id)
);

ALTER TABLE public.academy_completion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completion events"
  ON public.academy_completion_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completion events"
  ON public.academy_completion_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completion events"
  ON public.academy_completion_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Criar tabela academy_content_nps (depoimentos/NPS por conteúdo)
CREATE TABLE IF NOT EXISTS public.academy_content_nps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('book', 'course')),
  content_id uuid NOT NULL,
  nps_score integer NOT NULL CHECK (nps_score >= 0 AND nps_score <= 10),
  answer_why_worth text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_type, content_id)
);

ALTER TABLE public.academy_content_nps ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ver depoimentos (exibição pública na página do conteúdo)
CREATE POLICY "Authenticated can view NPS"
  ON public.academy_content_nps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own NPS"
  ON public.academy_content_nps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own NPS"
  ON public.academy_content_nps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
