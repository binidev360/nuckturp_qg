
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS playstyle_tags text[] DEFAULT '{}'::text[];
