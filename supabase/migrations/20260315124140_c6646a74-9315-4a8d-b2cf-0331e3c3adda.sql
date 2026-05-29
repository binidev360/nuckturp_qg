
-- ============================================================
-- 1. Coluna first_published_at na tabela posts
-- ============================================================
ALTER TABLE public.posts
  ADD COLUMN first_published_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.posts.first_published_at IS
  'Trava de unicidade: preenchido apenas na primeira publicação real. Impede notificações duplicadas.';

-- Backfill: posts já publicados ganham first_published_at = published_at
UPDATE public.posts
SET first_published_at = COALESCE(published_at, created_at)
WHERE status = 'published'
  AND first_published_at IS NULL;

-- ============================================================
-- 2. Trigger notify_admins_post_published — corrigido
--    Só dispara se first_published_at IS NULL E published_at <= now()
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_admins_post_published()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_author_name text;
  v_notif_id uuid;
  v_admin record;
BEGIN
  -- Apenas quando status muda para 'published'
  IF NEW.status <> 'published' OR NOT (OLD.status IS DISTINCT FROM 'published') THEN
    RETURN NEW;
  END IF;

  -- Trava de unicidade: se já foi publicado antes, não notifica novamente
  IF OLD.first_published_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Só notifica se published_at <= now() (ignora agendamentos futuros)
  IF NEW.published_at IS NOT NULL AND NEW.published_at > now() + interval '2 minutes' THEN
    RETURN NEW;
  END IF;

  -- Precisa ter blog_author_id (post de autor, não admin direto)
  IF NEW.blog_author_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.display_name, p.nickname, ba.name, 'Autor')
  INTO v_author_name
  FROM public.blog_authors ba
  LEFT JOIN public.profiles p ON p.id = ba.profile_id
  WHERE ba.id = NEW.blog_author_id;

  INSERT INTO public.notifications (
    title, body, type, target_audience, created_by, status, published_at, link_url, link_label
  ) VALUES (
    'Post para verificação',
    v_author_name || ' publicou "' || LEFT(NEW.title, 80) || '". Verifique o conteúdo.',
    'alert',
    'admins',
    NEW.author_id,
    'sent',
    now(),
    '/admin/blog?tab=community',
    'Ver Comunidade'
  )
  RETURNING id INTO v_notif_id;

  FOR v_admin IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.user_notifications (notification_id, user_id)
    VALUES (v_notif_id, v_admin.user_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Marca first_published_at (publicação imediata)
  NEW.first_published_at := now();

  RETURN NEW;
END;
$function$;

-- ============================================================
-- 3. Trigger notify_author_followers — corrigido
--    Trava de unicidade com first_published_at
-- ============================================================
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
  v_push_user_ids jsonb;
BEGIN
  IF NEW.blog_author_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Apenas quando status muda para 'published'
  IF NOT (
    (TG_OP = 'INSERT' AND NEW.status = 'published')
    OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'published' AND NEW.status = 'published')
  ) THEN
    RETURN NEW;
  END IF;

  -- Trava de unicidade: se já foi publicado antes, não notifica novamente
  IF OLD.first_published_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Ignora agendamentos futuros (o cron cuidará deles)
  IF NEW.published_at IS NOT NULL AND NEW.published_at > now() + interval '2 minutes' THEN
    RETURN NEW;
  END IF;

  -- Sem seguidores? Não notifica
  IF NOT EXISTS (SELECT 1 FROM author_follows WHERE blog_author_id = NEW.blog_author_id LIMIT 1) THEN
    -- Ainda marca first_published_at para evitar notificação futura se ganhar followers
    NEW.first_published_at := now();
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

    -- Push para seguidores
    BEGIN
      SELECT COALESCE(jsonb_agg(af.user_id), '[]'::jsonb)
      INTO v_push_user_ids
      FROM author_follows af
      JOIN profiles pr ON pr.user_id = af.user_id AND pr.push_enabled = true
      WHERE af.blog_author_id = NEW.blog_author_id
      AND af.user_id != NEW.author_id;

      IF jsonb_array_length(v_push_user_ids) > 0 THEN
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
              'user_ids', v_push_user_ids,
              'title', '📝 ' || COALESCE(v_author_name, 'Autor') || ' publicou!',
              'body', NEW.title,
              'url', v_post_url,
              'image', COALESCE(NEW.og_image_url, NEW.cover_url)
            )
          );
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'push notification failed in notify_author_followers: %', SQLERRM;
    END;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_author_followers failed: %', SQLERRM;
  END;

  -- Marca first_published_at (publicação imediata)
  NEW.first_published_at := now();

  RETURN NEW;
END;
$function$;
