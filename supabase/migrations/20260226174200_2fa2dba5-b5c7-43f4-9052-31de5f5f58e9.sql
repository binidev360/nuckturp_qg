ALTER TABLE public.notes 
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS cover_position integer NOT NULL DEFAULT 50;