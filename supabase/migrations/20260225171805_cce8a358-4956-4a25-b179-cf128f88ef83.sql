
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link_label TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;
