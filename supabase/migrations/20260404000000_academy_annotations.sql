-- ================================================================
-- 20260404000000_academy_annotations.sql
--
-- Sistema de anotações e marcações da Academia de Mestres.
-- Migration idempotente: segura para re-executar.
-- ================================================================


-- ── 1. Tabela principal ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academy_annotations (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  note_id          UUID REFERENCES public.notes(id) ON DELETE SET NULL,

  source_type      TEXT NOT NULL,
  source_id        UUID NOT NULL,
  source_title     TEXT NOT NULL DEFAULT '',
  chapter_id       UUID,
  chapter_title    TEXT,

  source_slug      TEXT NOT NULL DEFAULT '',
  chapter_slug     TEXT,

  anchor_type      TEXT NOT NULL DEFAULT 'text',
  paragraph_index  INTEGER,
  selected_text    TEXT,
  video_time_sec   INTEGER,

  color            TEXT NOT NULL DEFAULT 'yellow',
  user_note        TEXT NOT NULL DEFAULT '',

  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT academy_annotations_source_type_check
    CHECK (source_type IN ('book', 'course')),
  CONSTRAINT academy_annotations_anchor_type_check
    CHECK (anchor_type IN ('text', 'video')),
  CONSTRAINT academy_annotations_color_check
    CHECK (color IN ('yellow', 'green', 'pink', 'blue', 'orange'))
);

-- Adiciona colunas opcionais caso a tabela já exista sem elas
ALTER TABLE public.academy_annotations
  ADD COLUMN IF NOT EXISTS source_slug   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS chapter_slug  TEXT;


-- ── 2. Trigger updated_at ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_academy_annotations_updated_at ON public.academy_annotations;
CREATE TRIGGER update_academy_annotations_updated_at
  BEFORE UPDATE ON public.academy_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ── 3. Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_academy_annotations_tenant
  ON public.academy_annotations (tenant_id);

CREATE INDEX IF NOT EXISTS idx_academy_annotations_user
  ON public.academy_annotations (user_id);

CREATE INDEX IF NOT EXISTS idx_academy_annotations_source
  ON public.academy_annotations (source_id);

CREATE INDEX IF NOT EXISTS idx_academy_annotations_note
  ON public.academy_annotations (note_id);

CREATE INDEX IF NOT EXISTS idx_academy_annotations_user_source
  ON public.academy_annotations (tenant_id, source_id);


-- ── 4. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.academy_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can select annotations"      ON public.academy_annotations;
DROP POLICY IF EXISTS "Owner can insert annotations"      ON public.academy_annotations;
DROP POLICY IF EXISTS "Owner can update annotations"      ON public.academy_annotations;
DROP POLICY IF EXISTS "Owner can delete annotations"      ON public.academy_annotations;
DROP POLICY IF EXISTS "Admin can select all annotations"  ON public.academy_annotations;

CREATE POLICY "Owner can select annotations"
  ON public.academy_annotations FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can insert annotations"
  ON public.academy_annotations FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can update annotations"
  ON public.academy_annotations FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can delete annotations"
  ON public.academy_annotations FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admin can select all annotations"
  ON public.academy_annotations FOR SELECT
  USING (public.is_admin(auth.uid()));


-- ── 5. View anonimizada para o admin ─────────────────────────────────────────

DROP VIEW IF EXISTS public.academy_annotations_admin_view;
CREATE VIEW public.academy_annotations_admin_view AS
SELECT
  id,
  tenant_id,
  note_id,
  source_type,
  source_id,
  source_title,
  source_slug,
  chapter_id,
  chapter_title,
  chapter_slug,
  anchor_type,
  paragraph_index,
  selected_text,
  video_time_sec,
  color,
  user_note,
  created_at,
  updated_at
FROM public.academy_annotations
ORDER BY created_at DESC;


-- ── 6. Tabela de snapshot consolidado ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.academy_annotations_consolidated (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type      TEXT,
  source_title     TEXT,
  chapter_title    TEXT,
  anchor_type      TEXT,
  selected_text    TEXT,
  user_note        TEXT,
  color            TEXT,
  annotated_at     TIMESTAMP WITH TIME ZONE,
  consolidated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_annotations INTEGER,
  snapshot         JSONB
);

ALTER TABLE public.academy_annotations_consolidated ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage consolidated" ON public.academy_annotations_consolidated;
CREATE POLICY "Admin can manage consolidated"
  ON public.academy_annotations_consolidated FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- ── 7. RPC: Consolidar snapshot ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.consolidate_admin_annotations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count BIGINT;
  v_ts    TIMESTAMP WITH TIME ZONE := now();
  v_snap  JSONB;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Monta snapshot JSON com todas as anotações anonimizadas
  SELECT jsonb_agg(
    jsonb_build_object(
      'source_type',    source_type,
      'source_title',   source_title,
      'chapter_title',  chapter_title,
      'anchor_type',    anchor_type,
      'selected_text',  selected_text,
      'user_note',      user_note,
      'color',          color,
      'annotated_at',   created_at
    ) ORDER BY source_title, created_at DESC
  )
  INTO v_snap
  FROM public.academy_annotations;

  SELECT COUNT(*) INTO v_count FROM public.academy_annotations;

  INSERT INTO public.academy_annotations_consolidated
    (consolidated_at, total_annotations, snapshot)
  VALUES
    (v_ts, v_count, COALESCE(v_snap, '[]'::jsonb));

  RETURN jsonb_build_object(
    'total',           v_count,
    'consolidated_at', v_ts
  );
END;
$$;


-- ── 8. RPC: KPIs de anotações ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_annotation_kpis()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(

    'total_annotations',
      (SELECT COUNT(*) FROM public.academy_annotations),

    'total_text',
      (SELECT COUNT(*) FROM public.academy_annotations WHERE anchor_type = 'text'),

    'total_video',
      (SELECT COUNT(*) FROM public.academy_annotations WHERE anchor_type = 'video'),

    'unique_contents',
      (SELECT COUNT(DISTINCT source_id) FROM public.academy_annotations),

    'top_sources', (
      SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      FROM (
        SELECT
          source_id::text AS source_id,
          source_title,
          source_type,
          COUNT(*) AS count
        FROM public.academy_annotations
        GROUP BY source_id, source_title, source_type
        ORDER BY count DESC
        LIMIT 10
      ) s
    ),

    'most_highlighted', (
      SELECT COALESCE(jsonb_agg(row_to_json(h)), '[]'::jsonb)
      FROM (
        SELECT
          source_title,
          chapter_title,
          paragraph_index,
          LEFT(selected_text, 200) AS selected_text,
          COUNT(*) AS count
        FROM public.academy_annotations
        WHERE anchor_type = 'text'
          AND selected_text IS NOT NULL
          AND selected_text <> ''
        GROUP BY source_title, chapter_title, paragraph_index, LEFT(selected_text, 200)
        ORDER BY count DESC
        LIMIT 10
      ) h
    ),

    'by_color', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM (
        SELECT color, COUNT(*) AS count
        FROM public.academy_annotations
        GROUP BY color
        ORDER BY count DESC
      ) c
    )

  ) INTO v_result;

  RETURN v_result;
END;
$$;
