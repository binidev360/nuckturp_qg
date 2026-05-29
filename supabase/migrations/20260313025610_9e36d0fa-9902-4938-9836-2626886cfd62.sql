-- Add link_url to conditional_notifications for action links
ALTER TABLE public.conditional_notifications
  ADD COLUMN IF NOT EXISTS link_url text DEFAULT NULL;

-- Add notification_preferences to profiles for opt-out control
-- Format: { "dicas": true, "lembretes": true, "novidades": true, "sistema": true }
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"dicas": true, "lembretes": true, "novidades": true, "sistema": true}'::jsonb;

-- Add notification_category to conditional_notifications to map to user preferences
ALTER TABLE public.conditional_notifications
  ADD COLUMN IF NOT EXISTS notification_category text DEFAULT 'sistema';