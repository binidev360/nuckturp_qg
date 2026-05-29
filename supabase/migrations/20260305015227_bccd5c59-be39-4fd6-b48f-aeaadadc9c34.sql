
ALTER TABLE public.player_campaigns
  ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT ''::text;
