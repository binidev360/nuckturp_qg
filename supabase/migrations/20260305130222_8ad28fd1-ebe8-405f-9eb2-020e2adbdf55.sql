ALTER TABLE public.player_campaigns
  ADD COLUMN IF NOT EXISTS appearance text DEFAULT '',
  ADD COLUMN IF NOT EXISTS mannerisms text DEFAULT '',
  ADD COLUMN IF NOT EXISTS motivation_purpose text DEFAULT '',
  ADD COLUMN IF NOT EXISTS personal_goal text DEFAULT '';