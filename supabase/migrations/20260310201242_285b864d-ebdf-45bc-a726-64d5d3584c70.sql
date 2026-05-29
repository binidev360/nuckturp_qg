
-- Update notify_author_followers to also send push notifications
CREATE OR REPLACE FUNCTION public.notify_author_followers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_author_name text;
  v_author_slug text;
  v_notification_id uuid;
  v_post_url text;
  v_supabase_url text;
  v_service_key text;
BEGIN
  IF NEW.blog_author_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (TG_OP = 'INSERT' AND NEW.status = 'published')
    OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'published' AND NEW.status = 'published')
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.published_at IS NOT NULL AND NEW.published_at > now() + interval '2 minutes' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM author_follows WHERE blog_author_id = NEW.blog_author_id LIMIT 1) THEN
    RETURN NEW;
  END IF;

  SELECT
    COALESCE(p.nickname, p.display_name, ba.name),
    COALESCE(p.slug, ba.slug)
  INTO v_author_name, v_author_slug
  FROM blog_authors ba
  LEFT JOIN profiles p ON p.id = ba.profile_id
  WHERE ba.id = NEW.blog_author_id;

  v_post_url := '/m/' || v_author_slug || '/blog/' || NEW.slug;

  BEGIN
    INSERT INTO notifications (title, body, type, status, published_at, created_by, image_url, link_url, link_label, target_audience)
    VALUES (
      'Novo artigo de ' || COALESCE(v_author_name, 'autor'),
      NEW.title,
      'blog_follow',
      'published',
      now(),
      NEW.author_id,
      COALESCE(NEW.og_image_url, NEW.cover_url),
      v_post_url,
      'Ler artigo',
      'followers'
    )
    RETURNING id INTO v_notification_id;

    INSERT INTO user_notifications (notification_id, user_id)
    SELECT v_notification_id, af.user_id
    FROM author_follows af
    WHERE af.blog_author_id = NEW.blog_author_id
    AND af.user_id != NEW.author_id;

    UPDATE notifications SET sent_count = (
      SELECT count(*) FROM user_notifications WHERE notification_id = v_notification_id
    ) WHERE id = v_notification_id;

    -- Send push notification to followers with push enabled
    BEGIN
      v_supabase_url := COALESCE(
        current_setting('app.settings.supabase_url', true),
        'https://nhygqpnhumgxslpoachu.supabase.co'
      );
      v_service_key := current_setting('app.settings.supabase_anon_key', true);

      IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
        PERFORM net.http_post(
          url := v_supabase_url || '/functions/v1/send-push',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
          ),
          body := jsonb_build_object(
            'user_ids', (
              SELECT jsonb_agg(af.user_id)
              FROM author_follows af
              JOIN profiles pr ON pr.user_id = af.user_id AND pr.push_enabled = true
              WHERE af.blog_author_id = NEW.blog_author_id
              AND af.user_id != NEW.author_id
            ),
            'title', '📝 ' || COALESCE(v_author_name, 'Autor') || ' publicou!',
            'body', NEW.title,
            'url', v_post_url,
            'image', COALESCE(NEW.og_image_url, NEW.cover_url)
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'push notification failed in notify_author_followers: %', SQLERRM;
    END;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_author_followers failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
