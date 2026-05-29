
-- Trigger: notify on EVERY individual feedback response (push + in-app)
CREATE OR REPLACE FUNCTION public.notify_feedback_individual_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
  v_session_name text;
  v_campaign_name text;
  v_notif_id uuid;
  v_nps integer;
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
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
      ),
      body := jsonb_build_object(
        'user_ids', jsonb_build_array(v_owner_id),
        'title', 'Nova avaliação! ⭐',
        'body', 'Sessão "' || v_session_name || '" recebeu nota ' || v_nps || '/10.',
        'url', '/ferramentas/feedback'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail the insert if push fails
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Create trigger on session_feedback_responses
DROP TRIGGER IF EXISTS trg_notify_feedback_individual ON session_feedback_responses;
CREATE TRIGGER trg_notify_feedback_individual
  AFTER INSERT ON session_feedback_responses
  FOR EACH ROW
  EXECUTE FUNCTION notify_feedback_individual_response();

-- Enhanced admin feedback summary with weighted ranking
CREATE OR REPLACE FUNCTION public.admin_feedback_ranking()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.ranking_score DESC), '[]'::json)
    FROM (
      SELECT
        m.user_id,
        p.display_name,
        p.avatar_url,
        p.nickname,
        p.slug,
        count(DISTINCT c.id)::int AS total_configs,
        count(r.id)::int AS total_responses,
        COALESCE(ROUND(AVG(r.nps_score)::numeric, 1), 0)::float AS avg_nps,
        -- Weighted ranking: NPS weight (0-10) * log(responses+1) for volume consideration
        ROUND(
          (COALESCE(AVG(r.nps_score), 0) * LN(GREATEST(count(r.id), 1) + 1))::numeric,
          2
        )::float AS ranking_score,
        -- NPS breakdown
        count(r.id) FILTER (WHERE r.nps_score >= 9)::int AS promoters,
        count(r.id) FILTER (WHERE r.nps_score >= 7 AND r.nps_score <= 8)::int AS passives,
        count(r.id) FILTER (WHERE r.nps_score <= 6)::int AS detractors,
        MIN(r.created_at)::text AS first_response_at,
        MAX(r.created_at)::text AS last_response_at
      FROM memberships m
      JOIN profiles p ON p.user_id = m.user_id
      JOIN session_feedback_configs c ON c.tenant_id = m.tenant_id
      LEFT JOIN session_feedback_responses r ON r.config_id = c.id
      GROUP BY m.user_id, p.display_name, p.avatar_url, p.nickname, p.slug
      HAVING count(r.id) > 0
    ) t
  );
END;
$$;
