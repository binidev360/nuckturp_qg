
-- Add cover_position to campaigns and sessions
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS cover_position integer NOT NULL DEFAULT 50;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS cover_position integer NOT NULL DEFAULT 50;

-- Add tags and players to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS players jsonb NOT NULL DEFAULT '[]'::jsonb;
