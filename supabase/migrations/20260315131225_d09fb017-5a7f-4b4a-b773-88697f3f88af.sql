-- Add a trigger-level ping for immediate publishes via pg_net
-- This calls the ping-search-engines function when a post is published immediately

CREATE OR REPLACE FUNCTION public.ping_search_engines_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Only when first_published_at is being set (first time publish)
  IF OLD.first_published_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  IF NEW.first_published_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only for published + public posts
  IF NEW.status <> 'published' OR NEW.visibility <> 'public' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_supabase_url := COALESCE(
      current_setting('app.settings.supabase_url', true),
      'https://nhygqpnhumgxslpoachu.supabase.co'
    );
    v_service_key := current_setting('app.settings.supabase_anon_key', true);

    IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/ping-search-engines',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'urls', jsonb_build_array('/novidades/' || NEW.slug),
          'sitemap', true
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'ping_search_engines_on_publish failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- Trigger fires AFTER the post row is committed with first_published_at set
DROP TRIGGER IF EXISTS trg_ping_search_engines ON posts;
CREATE TRIGGER trg_ping_search_engines
  AFTER UPDATE ON posts
  FOR EACH ROW
  WHEN (OLD.first_published_at IS NULL AND NEW.first_published_at IS NOT NULL)
  EXECUTE FUNCTION ping_search_engines_on_publish();