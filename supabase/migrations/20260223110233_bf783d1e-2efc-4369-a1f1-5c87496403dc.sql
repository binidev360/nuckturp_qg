
-- Add tags column to profiles for admin-managed user tags
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
