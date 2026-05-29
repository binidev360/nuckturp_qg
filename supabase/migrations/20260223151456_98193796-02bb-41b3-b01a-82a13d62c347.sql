
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
-- visibility: 'public' = visible to everyone, 'restricted' = only logged-in users
