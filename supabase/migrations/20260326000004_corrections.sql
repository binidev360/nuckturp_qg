-- ============================================================
-- Fase 0 — Correções críticas
-- ============================================================

-- 1. Adicionar parent_id em academy_book_sessions
--    (ausente na migration original, necessário para hierarquia de capítulos)
ALTER TABLE public.academy_book_sessions
  ADD COLUMN IF NOT EXISTS parent_id uuid
  REFERENCES public.academy_book_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_academy_book_sessions_parent_id
  ON public.academy_book_sessions (parent_id);

-- 2. Recriar a função check_academy_inactivity sem a coluna event_type
--    (a coluna não existe em academy_completion_events)
CREATE OR REPLACE FUNCTION public.check_academy_inactivity()
RETURNS void AS $$
BEGIN
  INSERT INTO public.academy_completion_events (user_id, content_id, content_type)
  SELECT
    rp.user_id,
    rp.book_id,
    'book'
  FROM public.academy_reading_progress rp
  LEFT JOIN public.academy_completion_events ce
    ON  ce.user_id      = rp.user_id
    AND ce.content_id   = rp.book_id
    AND ce.content_type = 'book'
    AND ce.created_at   > (now() - interval '15 days')
  WHERE
    rp.completed  = false
    AND rp.updated_at < (now() - interval '7 days')
    AND ce.id IS NULL
  ON CONFLICT (user_id, content_type, content_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
