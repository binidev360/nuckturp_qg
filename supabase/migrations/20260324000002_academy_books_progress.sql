-- ============================================================
-- Onda 2 — Biblioteca: livros, sessões, páginas e progresso
-- ============================================================
-- Notas de design:
--   • content armazenado como TEXT (HTML gerado pelo TipTap / NotionEditor),
--     seguindo o padrão existente no projeto (posts, notas).
--   • RLS de subscription NÃO é aplicada no banco — a verificação de plano
--     é feita via edge function `billing`. Todos os usuários autenticados
--     podem ler livros publicados; o AccessGate no frontend bloqueia
--     livros access_type='subscription' para usuários Free.
--   • Progresso de leitura: 1 linha por (user_id, book_id); guarda a última
--     sessão visitada para o botão "Continuar leitura".

-- ── 1. Livros ────────────────────────────────────────────────────────────────

CREATE TABLE public.academy_books (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text    NOT NULL,
  subtitle     text,
  slug         text    UNIQUE NOT NULL,
  cover_url    text,
  description  text,
  author       text,
  access_type  text    NOT NULL
                       CHECK (access_type IN ('free', 'subscription', 'external'))
                       DEFAULT 'subscription',
  external_url text,   -- preenchido quando access_type = 'external'
  order_index  integer NOT NULL DEFAULT 0,
  published    boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ── 2. Sessões (capítulos) ───────────────────────────────────────────────────

CREATE TABLE public.academy_book_sessions (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     uuid    NOT NULL REFERENCES public.academy_books(id) ON DELETE CASCADE,
  title       text    NOT NULL,
  slug        text    NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  published   boolean NOT NULL DEFAULT false,
  UNIQUE (book_id, slug)
);

-- ── 3. Páginas / conteúdo (1 página por sessão no MVP) ───────────────────────

CREATE TABLE public.academy_book_pages (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid    NOT NULL REFERENCES public.academy_book_sessions(id) ON DELETE CASCADE,
  -- HTML gerado pelo TipTap (NotionEditor); sanitizado com DOMPurify no cliente
  content     text,
  order_index integer NOT NULL DEFAULT 0
);

-- ── 4. Progresso de leitura ──────────────────────────────────────────────────

CREATE TABLE public.academy_reading_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id)                    ON DELETE CASCADE,
  book_id         uuid NOT NULL REFERENCES public.academy_books(id)         ON DELETE CASCADE,
  last_session_id uuid          REFERENCES public.academy_book_sessions(id) ON DELETE SET NULL,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (user_id, book_id)
);

-- ── 5. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX idx_academy_book_sessions_book_id  ON public.academy_book_sessions (book_id);
CREATE INDEX idx_academy_book_pages_session_id  ON public.academy_book_pages    (session_id);
CREATE INDEX idx_academy_reading_progress_user  ON public.academy_reading_progress (user_id);
CREATE INDEX idx_academy_reading_progress_book  ON public.academy_reading_progress (book_id);
CREATE INDEX idx_academy_books_slug             ON public.academy_books (slug);

-- ── 6. Triggers updated_at ───────────────────────────────────────────────────

-- Reutiliza a função já existente no projeto
CREATE TRIGGER update_academy_books_updated_at
  BEFORE UPDATE ON public.academy_books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academy_reading_progress_updated_at
  BEFORE UPDATE ON public.academy_reading_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 7. RLS — academy_books ───────────────────────────────────────────────────

ALTER TABLE public.academy_books ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler livros publicados.
-- A verificação de plano (free vs subscription) é responsabilidade do frontend
-- porque o check de assinatura ativa é feito via edge function `billing`.
CREATE POLICY "authenticated_read_published_books"
  ON public.academy_books
  FOR SELECT
  USING (
    published = true
    AND auth.role() = 'authenticated'
  );

-- Admin tem acesso total (leitura + escrita)
CREATE POLICY "admin_all_books"
  ON public.academy_books
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── 8. RLS — academy_book_sessions ──────────────────────────────────────────

ALTER TABLE public.academy_book_sessions ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado vê sessões publicadas de livros publicados
CREATE POLICY "authenticated_read_published_sessions"
  ON public.academy_book_sessions
  FOR SELECT
  USING (
    published = true
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.academy_books b
      WHERE b.id = book_id AND b.published = true
    )
  );

-- Admin tem acesso total
CREATE POLICY "admin_all_sessions"
  ON public.academy_book_sessions
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── 9. RLS — academy_book_pages ─────────────────────────────────────────────

ALTER TABLE public.academy_book_pages ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado lê páginas de sessões publicadas de livros publicados
CREATE POLICY "authenticated_read_published_pages"
  ON public.academy_book_pages
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.academy_book_sessions s
      JOIN public.academy_books b ON b.id = s.book_id
      WHERE s.id = session_id
        AND s.published = true
        AND b.published = true
    )
  );

-- Admin tem acesso total
CREATE POLICY "admin_all_pages"
  ON public.academy_book_pages
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── 10. RLS — academy_reading_progress ──────────────────────────────────────

ALTER TABLE public.academy_reading_progress ENABLE ROW LEVEL SECURITY;

-- Cada usuário acessa somente seu próprio progresso
CREATE POLICY "own_reading_progress"
  ON public.academy_reading_progress
  USING (user_id = auth.uid());

-- ── 11. Vínculo entre vitrine e biblioteca ───────────────────────────────────

-- Adiciona book_id em academy_cards para quando o card da vitrine
-- corresponder a um livro real na biblioteca (FK opcional)
ALTER TABLE public.academy_cards
  ADD CONSTRAINT fk_academy_cards_book
  FOREIGN KEY (book_id) REFERENCES public.academy_books(id)
  ON DELETE SET NULL;
