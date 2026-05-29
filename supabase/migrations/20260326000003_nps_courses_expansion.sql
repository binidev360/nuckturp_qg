-- Onda 4 — Expansão: Cursos e Aulas

-- 1. Tabela: academy_courses
CREATE TABLE public.academy_courses (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text    NOT NULL,
  subtitle     text,
  slug         text    UNIQUE NOT NULL,
  cover_url    text,
  description  text,
  instructor   text,
  access_type  text    NOT NULL
                       CHECK (access_type IN ('free', 'subscription', 'external'))
                       DEFAULT 'subscription',
  external_url text,
  order_index  integer NOT NULL DEFAULT 0,
  published    boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- 2. Tabela: academy_lessons
-- Aulas pertencentes a um curso
CREATE TABLE public.academy_lessons (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid    NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title        text    NOT NULL,
  slug         text    NOT NULL,
  video_url    text,
  content      text,    -- Conteúdo de apoio (HTML)
  duration_min integer,
  order_index  integer NOT NULL DEFAULT 0,
  published    boolean NOT NULL DEFAULT false,
  UNIQUE (course_id, slug)
);

-- 3. Tabela: academy_course_progress
-- Rastreia quais aulas o usuário assistiu e se o curso foi concluído
CREATE TABLE public.academy_course_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  completed_lessons  uuid[] NOT NULL DEFAULT '{}', -- Lista de IDs de aulas concluídas
  completed       boolean NOT NULL DEFAULT false,
  completed_at    timestamptz,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- 4. Extensão de academy_cards para suportar Cursos
ALTER TABLE public.academy_cards
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.academy_courses(id) ON DELETE SET NULL;

-- 5. Row Level Security — academy_courses
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_published_courses"
  ON public.academy_courses FOR SELECT
  TO authenticated
  USING (published = true);

CREATE POLICY "admin_all_courses"
  ON public.academy_courses
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 6. Row Level Security — academy_lessons
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_published_lessons"
  ON public.academy_lessons FOR SELECT
  TO authenticated
  USING (
    published = true AND 
    EXISTS (SELECT 1 FROM public.academy_courses c WHERE c.id = course_id AND c.published = true)
  );

CREATE POLICY "admin_all_lessons"
  ON public.academy_lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 7. Row Level Security — academy_course_progress
ALTER TABLE public.academy_course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_course_progress"
  ON public.academy_course_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- 8. Índices
CREATE INDEX idx_academy_lessons_course_id ON public.academy_lessons (course_id);
CREATE INDEX idx_academy_course_progress_user ON public.academy_course_progress (user_id);
CREATE INDEX idx_academy_course_progress_course ON public.academy_course_progress (course_id);
