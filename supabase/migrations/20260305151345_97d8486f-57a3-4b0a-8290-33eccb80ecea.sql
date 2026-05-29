ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS sensitive_topics text DEFAULT '',
  ADD COLUMN IF NOT EXISTS pvp_level integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS mortality_level integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS gore_level integer DEFAULT 5;