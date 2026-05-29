
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_posts jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_videos jsonb NOT NULL DEFAULT '[]'::jsonb;
