-- Backfill: set og_image_url = cover_url for all posts that have a cover but no og_image_url
UPDATE public.posts
SET og_image_url = cover_url
WHERE cover_url IS NOT NULL
  AND cover_url != ''
  AND (og_image_url IS NULL OR og_image_url = '');

-- Trigger function: auto-sync og_image_url when cover_url changes (if they were equal or og was null)
CREATE OR REPLACE FUNCTION public.sync_og_image_with_cover()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- If og_image_url was null/empty OR was same as old cover, update it to new cover
  IF (OLD.og_image_url IS NULL OR OLD.og_image_url = '' OR OLD.og_image_url = OLD.cover_url)
     AND NEW.cover_url IS DISTINCT FROM OLD.cover_url
  THEN
    NEW.og_image_url := NEW.cover_url;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to posts table
DROP TRIGGER IF EXISTS trg_sync_og_image_with_cover ON public.posts;
CREATE TRIGGER trg_sync_og_image_with_cover
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_og_image_with_cover();