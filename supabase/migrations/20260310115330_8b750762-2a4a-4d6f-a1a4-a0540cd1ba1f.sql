CREATE OR REPLACE FUNCTION public.notify_feedback_individual_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id uuid;
  v_session_name text;
  v_campaign_name text;
  v_notif_id uuid;
  v_nps integer;
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Get session info and owner
  SELECT t.owner_id, s.name, ca.name
  INTO v_owner_id, v_session_name, v_campaign_name
  FROM session_feedback_configs c
  JOIN sessions s ON s.id = c.session_id
  JOIN campaigns ca ON ca.id = s.campaign_id
  JOIN tenants t ON t.id = c.tenant_id
  WHERE c.id = NEW.config_id;

  IF v_owner_id IS NULL THEN RETURN NEW; END IF;

  v_nps := NEW.nps_score;

  -- Create in-app notification
  INSERT INTO public.notifications (
    title, body, type, target_audience, created_by, status, published_at, link_url, link_label
  ) VALUES (
    'Nova avaliação recebida!',
    'Um jogador avaliou a sessão "' || v_session_name || '" com nota ' || v_nps || '/10.',
    'info',
    'specific',
    v_owner_id,
    'sent',
    now(),
    '/ferramentas/feedback',
    'Ver Feedbacks'
  )
  RETURNING id INTO v_notif_id;

  -- Deliver to owner
  INSERT INTO public.user_notifications (notification_id, user_id)
  VALUES (v_notif_id, v_owner_id)
  ON CONFLICT DO NOTHING;

  -- Send push notification via edge function
  BEGIN
    v_supabase_url := COALESCE(
      current_setting('app.settings.supabase_url', true),
      'https://nhygqpnhumgxslpoachu.supabase.co'
    );
    v_service_key := current_setting('app.settings.supabase_anon_key', true);
    
    -- Only attempt push if we have both URL and key
    IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'user_ids', jsonb_build_array(v_owner_id),
          'title', 'Nova avaliação! ⭐',
          'body', 'Sessão "' || v_session_name || '" recebeu nota ' || v_nps || '/10.',
          'url', '/ferramentas/feedback'
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail the insert if push fails
    NULL;
  END;

  RETURN NEW;
END;
$function$;

-- Also fix the threshold trigger which has the same pattern
CREATE OR REPLACE FUNCTION public.notify_feedback_threshold()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_config record;
  v_count integer;
  v_threshold integer;
  v_owner_id uuid;
  v_session_name text;
  v_notif_id uuid;
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Get config details
  SELECT c.*, s.name AS session_name, t.owner_id
  INTO v_config
  FROM session_feedback_configs c
  JOIN sessions s ON s.id = c.session_id
  JOIN tenants t ON t.id = c.tenant_id
  WHERE c.id = NEW.config_id;

  IF v_config IS NULL THEN RETURN NEW; END IF;

  -- Count responses
  SELECT count(*) INTO v_count FROM session_feedback_responses WHERE config_id = NEW.config_id;

  v_threshold := GREATEST(1, CEIL(v_config.expected_responses * 0.8));

  -- Only notify exactly when threshold is crossed
  IF v_count = v_threshold THEN
    -- Create notification
    INSERT INTO public.notifications (
      title, body, type, target_audience, created_by, status, published_at, link_url, link_label
    ) VALUES (
      'Feedback pronto para análise!',
      'A sessão "' || v_config.session_name || '" atingiu 80% das respostas. Você já pode pedir uma análise da IA.',
      'info',
      'specific',
      v_config.owner_id,
      'sent',
      now(),
      '/tools',
      'Ver Feedbacks'
    )
    RETURNING id INTO v_notif_id;

    -- Deliver to owner
    INSERT INTO public.user_notifications (notification_id, user_id)
    VALUES (v_notif_id, v_config.owner_id)
    ON CONFLICT DO NOTHING;

    -- Send push notification
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
            'user_id', v_config.owner_id,
            'title', 'Feedback pronto para análise! 🎲',
            'body', 'A sessão "' || v_config.session_name || '" atingiu 80% das respostas.',
            'url', '/tools'
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$function$