-- Add parent_id to post_categories for hierarchical categories
ALTER TABLE public.post_categories 
ADD COLUMN parent_id UUID REFERENCES public.post_categories(id) ON DELETE SET NULL;

-- Create index for faster hierarchy lookups
CREATE INDEX idx_post_categories_parent_id ON public.post_categories(parent_id);