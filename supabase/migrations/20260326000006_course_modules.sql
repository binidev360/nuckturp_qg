-- ============================================================
-- Fase 2 — Cursos: estrutura Curso → Módulo → Aula
-- ============================================================
-- Complementa a migration 20260326000003 que criou academy_courses
-- e academy_lessons com course_id direto. Aqui inserimos a camada
-- de módulos e ajustamos academy_lessons para referenciar module_id.

-- 1. Tabela de módulos
CREATE TABLE public.academy_course_modules (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid    NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title       text    NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  published   boolean NOT NULL DEFAULT false
);

-- 2. Recriar academy_lessons com module_id (era course_id)
--    Seguro em desenvolvimento — sem dados de produção ainda.
DROP TABLE IF EXISTS public.academy_lessons;

CREATE TABLE public.academy_lessons (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    uuid    NOT NULL REFERENCES public.academy_course_modules(id) ON DELETE CASCADE,
  title        text    NOT NULL,
  slug         text    NOT NULL,
  video_url    text,                -- URL YouTube ou Vimeo
  content      text,               -- Texto de apoio (HTML)
  duration_min integer,
  order_index  integer NOT NULL DEFAULT 0,
  published    boolean NOT NULL DEFAULT false,
  UNIQUE (module_id, slug)
);

-- 3. Índices
CREATE INDEX idx_academy_course_modules_course_id ON public.academy_course_modules (course_id);
CREATE INDEX idx_academy_lessons_module_id        ON public.academy_lessons (module_id);

-- 4. RLS — academy_course_modules
ALTER TABLE public.academy_course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_published_modules"
  ON public.academy_course_modules FOR SELECT
  TO authenticated
  USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM public.academy_courses c
      WHERE c.id = course_id AND c.published = true
    )
  );

CREATE POLICY "admin_all_modules"
  ON public.academy_course_modules FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 5. RLS — academy_lessons (recriada)
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_published_lessons"
  ON public.academy_lessons FOR SELECT
  TO authenticated
  USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM public.academy_course_modules m
      JOIN public.academy_courses c ON c.id = m.course_id
      WHERE m.id = module_id AND m.published = true AND c.published = true
    )
  );

CREATE POLICY "admin_all_lessons"
  ON public.academy_lessons FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 6. RLS — academy_course_progress (já criada em 000003, adicionar política de admin)
CREATE POLICY "admin_view_all_course_progress"
  ON public.academy_course_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
