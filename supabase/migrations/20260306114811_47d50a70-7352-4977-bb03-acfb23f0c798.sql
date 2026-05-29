
-- Function to notify all admins about blog events
CREATE OR REPLACE FUNCTION public.notify_admins_blog_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_display_name text;
  v_slug text;
  v_notif_id uuid;
  v_admin record;
BEGIN
  -- Only fire when blog_enabled changes from false to true
  IF OLD.blog_enabled = false AND NEW.blog_enabled = true THEN
    v_display_name := COALESCE(NEW.display_name, NEW.nickname, 'Usuário');
    v_slug := NEW.slug;

    -- Create the notification
    INSERT INTO public.notifications (
      title, body, type, target_audience, created_by, status, published_at, link_url, link_label
    ) VALUES (
      'Novo Blog Pessoal Ativado',
      v_display_name || ' ativou seu blog pessoal.' || CASE WHEN v_slug IS NOT NULL THEN ' Perfil: /m/' || v_slug ELSE '' END,
      'info',
      'admins',
      NEW.user_id,
      'sent',
      now(),
      '/admin/blog?tab=authors',
      'Ver Autores'
    )
    RETURNING id INTO v_notif_id;

    -- Deliver to all admins
    FOR v_admin IN SELECT user_id FROM public.profiles WHERE is_admin = true
    LOOP
      INSERT INTO public.user_notifications (notification_id, user_id)
      VALUES (v_notif_id, v_admin.user_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_blog_activated
  AFTER UPDATE OF blog_enabled ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_blog_activated();

-- Function to notify all admins when a community post is published  
CREATE OR REPLACE FUNCTION public.notify_admins_post_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_author_name text;
  v_notif_id uuid;
  v_admin record;
BEGIN
  -- Only fire when status changes to 'published' and it's a community post (has blog_author_id)
  IF NEW.blog_author_id IS NOT NULL 
     AND NEW.status = 'published' 
     AND (OLD.status IS DISTINCT FROM 'published') THEN

    -- Get author name
    SELECT COALESCE(p.display_name, p.nickname, ba.name, 'Autor')
    INTO v_author_name
    FROM public.blog_authors ba
    LEFT JOIN public.profiles p ON p.id = ba.profile_id
    WHERE ba.id = NEW.blog_author_id;

    -- Create the notification
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

    -- Deliver to all admins
    FOR v_admin IN SELECT user_id FROM public.profiles WHERE is_admin = true
    LOOP
      INSERT INTO public.user_notifications (notification_id, user_id)
      VALUES (v_notif_id, v_admin.user_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admins_post_published
  AFTER INSERT OR UPDATE OF status ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_post_published();
