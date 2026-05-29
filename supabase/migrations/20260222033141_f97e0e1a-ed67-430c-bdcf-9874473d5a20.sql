-- Add cover_url to adventures and sessions
ALTER TABLE public.adventures ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS cover_url text;