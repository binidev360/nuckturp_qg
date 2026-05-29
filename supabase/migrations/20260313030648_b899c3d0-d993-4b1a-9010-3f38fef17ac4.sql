
-- Add clicked_at to user_notifications for tracking link clicks
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS clicked_at timestamp with time zone DEFAULT NULL;

-- Add push_delivered_at and push_clicked_at for push-specific tracking
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS push_delivered_at timestamp with time zone DEFAULT NULL;
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS push_clicked_at timestamp with time zone DEFAULT NULL;
