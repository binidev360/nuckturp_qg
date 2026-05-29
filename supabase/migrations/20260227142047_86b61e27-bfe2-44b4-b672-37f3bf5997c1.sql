-- Add category_ids array column for multi-category support
ALTER TABLE public.posts ADD COLUMN category_ids uuid[] NOT NULL DEFAULT '{}';

-- Migrate existing category_id data into the new array
UPDATE public.posts SET category_ids = ARRAY[category_id] WHERE category_id IS NOT NULL;