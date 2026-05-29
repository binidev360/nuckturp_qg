-- =============================================================================
-- Micro-onda 1: Academia de Mestres — Fundação
-- Cria as tabelas de configurações da Academia e de cards da vitrine.
--
-- academy_settings : única linha que controla o estado global da Academia
--                    (lançada ou em breve) e o texto da página "em breve".
-- academy_cards    : cards 3:4 exibidos na vitrine (home da Academia).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela: academy_settings
-- Sempre contém exatamente uma linha. Administradores atualizam via toggle.
-- Todos os usuários autenticados podem LER (necessário para mostrar/ocultar
-- a Academia na rota /journey).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academy_settings (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  launched         boolean     NOT NULL DEFAULT false,
  coming_soon_text text        NOT NULL DEFAULT 'Estamos preparando algo lendário para vocês.',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Trigger para manter updated_at atualizado automaticamente
CREATE OR REPLACE FUNCTION update_academy_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER academy_settings_updated_at
  BEFORE UPDATE ON academy_settings
  FOR EACH ROW EXECUTE FUNCTION update_academy_settings_updated_at();

-- Garante que sempre exista exatamente uma linha de configuração
INSERT INTO academy_settings (launched, coming_soon_text)
VALUES (false, 'Estamos preparando algo lendário para vocês.')
ON CONFLICT DO NOTHING;

-- Row Level Security
ALTER TABLE academy_settings ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem ler as configurações
-- (necessário para a lógica de "em breve" vs vitrine em Journey.tsx)
CREATE POLICY "authenticated_read_academy_settings"
  ON academy_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Apenas admins podem atualizar
CREATE POLICY "admin_update_academy_settings"
  ON academy_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- Tabela: academy_cards
-- Cards exibidos na vitrine da Academia (home /journey).
-- Cada card aponta para um livro interno (book_id) ou uma URL externa.
-- access_type determina o comportamento ao clicar:
--   'free'         → qualquer usuário autenticado acessa
--   'subscription' → somente Premium/VIP
--   'external'     → redireciona para external_url (landing page / Hotmart)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academy_cards (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  subtitle     text,
  image_url    text,
  access_type  text        NOT NULL DEFAULT 'subscription'
                           CHECK (access_type IN ('free', 'subscription', 'external')),
  external_url text,       -- preenchido quando access_type = 'external'
  book_id      uuid,       -- vínculo futuro com academy_books (Onda 2)
  order_index  integer     NOT NULL DEFAULT 0,
  published    boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Índice para ordenação na vitrine
CREATE INDEX IF NOT EXISTS academy_cards_order_idx
  ON academy_cards (order_index ASC, created_at ASC)
  WHERE published = true;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_academy_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER academy_cards_updated_at
  BEFORE UPDATE ON academy_cards
  FOR EACH ROW EXECUTE FUNCTION update_academy_cards_updated_at();

-- Row Level Security
ALTER TABLE academy_cards ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados veem apenas cards publicados
CREATE POLICY "authenticated_read_published_cards"
  ON academy_cards
  FOR SELECT
  TO authenticated
  USING (published = true);

-- Admin vê todos os cards (incluindo rascunhos) — OR com a policy acima
CREATE POLICY "admin_read_all_cards"
  ON academy_cards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin tem acesso total de escrita (INSERT, UPDATE, DELETE)
CREATE POLICY "admin_write_cards"
  ON academy_cards
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
