
-- Add dismissed_at column to user_notifications for soft delete
ALTER TABLE public.user_notifications ADD COLUMN IF NOT EXISTS dismissed_at timestamptz DEFAULT NULL;

-- Add dismissed_at column to share_events for soft delete  
ALTER TABLE public.share_events ADD COLUMN IF NOT EXISTS dismissed_at timestamptz DEFAULT NULL;
