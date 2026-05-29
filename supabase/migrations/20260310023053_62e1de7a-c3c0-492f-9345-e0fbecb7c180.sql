
-- Function to notify GM when feedback threshold (80%) is reached
CREATE OR REPLACE FUNCTION public.notify_feedback_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config record;
  v_count integer;
  v_threshold integer;
  v_owner_id uuid;
  v_session_name text;
  v_notif_id uuid;
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
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
      ),
      body := jsonb_build_object(
        'user_id', v_config.owner_id,
        'title', 'Feedback pronto para análise! 🎲',
        'body', 'A sessão "' || v_config.session_name || '" atingiu 80% das respostas.',
        'url', '/tools'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on new feedback response
DROP TRIGGER IF EXISTS trg_feedback_threshold_notify ON session_feedback_responses;
CREATE TRIGGER trg_feedback_threshold_notify
  AFTER INSERT ON session_feedback_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_feedback_threshold();
