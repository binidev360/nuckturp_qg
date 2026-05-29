
-- Fix 4 functions that still reference profiles.is_admin instead of user_roles

-- 1. Fix notify_admins_blog_activated: query user_roles instead of profiles.is_admin
CREATE OR REPLACE FUNCTION public.notify_admins_blog_activated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_display_name text;
  v_slug text;
  v_notif_id uuid;
  v_admin record;
BEGIN
  IF OLD.blog_enabled = false AND NEW.blog_enabled = true THEN
    v_display_name := COALESCE(NEW.display_name, NEW.nickname, 'Usuário');
    v_slug := NEW.slug;

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

    -- Deliver to all admins via user_roles
    FOR v_admin IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO public.user_notifications (notification_id, user_id)
      VALUES (v_notif_id, v_admin.user_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Fix notify_admins_post_published: query user_roles instead of profiles.is_admin
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
  IF NEW.blog_author_id IS NOT NULL 
     AND NEW.status = 'published' 
     AND (OLD.status IS DISTINCT FROM 'published') THEN

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

    -- Deliver to all admins via user_roles
    FOR v_admin IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO public.user_notifications (notification_id, user_id)
      VALUES (v_notif_id, v_admin.user_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Fix increment_post_view: use is_admin() function instead of profiles.is_admin column
CREATE OR REPLACE FUNCTION public.increment_post_view(p_post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_is_author boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NOT NULL THEN
    -- Check if user is admin via user_roles
    IF public.is_admin(v_user_id) THEN RETURN; END IF;

    -- Check if user is the post author
    SELECT EXISTS(
      SELECT 1 FROM public.posts po
      JOIN public.blog_authors ba ON ba.id = po.blog_author_id
      JOIN public.profiles pr ON pr.id = ba.profile_id
      WHERE po.id = p_post_id AND pr.user_id = v_user_id
    ) INTO v_is_author;

    IF v_is_author THEN RETURN; END IF;
  END IF;

  UPDATE public.posts
  SET view_count = view_count + 1
  WHERE id = p_post_id;

  INSERT INTO public.post_view_events (post_id, viewer_user_id)
  VALUES (p_post_id, v_user_id);
END;
$function$;

-- 4. Fix search_profiles_for_linking: derive is_admin from user_roles
CREATE OR REPLACE FUNCTION public.search_profiles_for_linking(_search text, _limit integer DEFAULT 10)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      p.user_id,
      p.display_name,
      p.nickname,
      p.slug,
      p.avatar_url,
      (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin')) AS is_admin,
      COALESCE(p.tags, '{}') as tags
    FROM profiles p
    WHERE _search IS NOT NULL 
      AND length(_search) >= 2
      AND (
        p.display_name ILIKE '%' || _search || '%' 
        OR p.nickname ILIKE '%' || _search || '%'
        OR p.slug ILIKE '%' || _search || '%'
      )
    ORDER BY p.display_name ASC
    LIMIT _limit
  ) t;
$function$;
