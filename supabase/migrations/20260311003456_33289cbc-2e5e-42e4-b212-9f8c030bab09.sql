
-- Step 1: Add columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_systems jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_vtts jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_days jsonb NOT NULL DEFAULT '[]'::jsonb;
