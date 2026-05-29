
-- Add reading_time_min column to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS reading_time_min smallint NOT NULL DEFAULT 1;

-- Function to calculate reading time from content
CREATE OR REPLACE FUNCTION public.calculate_reading_time()
RETURNS TRIGGER AS $$
DECLARE
  plain_text text;
  word_count int;
BEGIN
  -- Strip HTML tags and count words
  plain_text := regexp_replace(COALESCE(NEW.content, ''), '<[^>]*>', ' ', 'g');
  word_count := array_length(regexp_split_to_array(trim(plain_text), '\s+'), 1);
  NEW.reading_time_min := GREATEST(1, CEIL(word_count::numeric / 200));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-calculate on insert/update
CREATE TRIGGER trg_posts_reading_time
BEFORE INSERT OR UPDATE OF content ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.calculate_reading_time();

-- Backfill existing posts
UPDATE public.posts SET reading_time_min = GREATEST(1, CEIL(
  array_length(regexp_split_to_array(
    trim(regexp_replace(COALESCE(content, ''), '<[^>]*>', ' ', 'g')),
    '\s+'
  ), 1)::numeric / 200
));
