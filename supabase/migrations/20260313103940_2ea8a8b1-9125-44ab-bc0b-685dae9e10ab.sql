
CREATE OR REPLACE FUNCTION public.admin_notification_kpis()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    -- Manual notifications
    'manual_published_count', (
      SELECT count(*) FROM notifications WHERE status = 'published'
    ),
    'manual_draft_count', (
      SELECT count(*) FROM notifications WHERE status = 'draft'
    ),
    'manual_total_sent', (
      SELECT COALESCE(SUM(sent_count), 0) FROM notifications WHERE status = 'published'
    ),
    'manual_published', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id, 'published_at', published_at, 'sent_count', sent_count, 'type', type
      )), '[]'::json)
      FROM notifications WHERE status = 'published'
    ),
    
    -- User notification stats
    'total_read', (
      SELECT count(*) FROM user_notifications WHERE read_at IS NOT NULL
    ),
    'total_clicked', (
      SELECT count(*) FROM user_notifications WHERE clicked_at IS NOT NULL
    ),
    'total_push_clicked', (
      SELECT count(*) FROM user_notifications WHERE push_clicked_at IS NOT NULL
    ),
    
    -- Conditional notifications
    'conditional_notifications', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id, 'active', active, 'template', template
      )), '[]'::json)
      FROM conditional_notifications
    ),
    'conditional_logs', (
      SELECT COALESCE(json_agg(json_build_object(
        'status', status, 'sent_at', sent_at,
        'conditional_notification_id', conditional_notification_id
      )), '[]'::json)
      FROM conditional_notification_logs
    ),
    
    -- Push metrics
    'push_devices', (
      SELECT count(*) FROM push_subscriptions
    ),
    'push_enabled_users', (
      SELECT count(*) FROM profiles WHERE push_enabled = true
    ),
    'push_subscribers', (
      SELECT count(DISTINCT user_id) FROM push_subscriptions
    ),
    'smart_timing_users', (
      SELECT count(*) FROM profiles WHERE preferred_push_hour IS NOT NULL
    ),
    'pending_push_queue', (
      SELECT count(*) FROM pending_push_queue WHERE status = 'pending'
    ),
    
    -- Notification preferences opt-out
    'opt_out_stats', (
      SELECT json_build_object(
        'total', count(*),
        'dicas_out', count(*) FILTER (WHERE (notification_preferences->>'dicas')::text = 'false'),
        'lembretes_out', count(*) FILTER (WHERE (notification_preferences->>'lembretes')::text = 'false'),
        'novidades_out', count(*) FILTER (WHERE (notification_preferences->>'novidades')::text = 'false')
      )
      FROM profiles
    ),
    
    -- Clicked notifications with hour info (for best hour per category)
    'clicked_with_hour', (
      SELECT COALESCE(json_agg(json_build_object(
        'clicked_at', un.clicked_at,
        'type', n.type
      )), '[]'::json)
      FROM user_notifications un
      JOIN notifications n ON n.id = un.notification_id
      WHERE un.clicked_at IS NOT NULL
      LIMIT 1000
    ),
    
    -- Access hours for heatmap
    'access_hours', (
      SELECT COALESCE(json_agg(json_build_object(
        'access_hour', access_hour,
        'accessed_at', accessed_at
      )), '[]'::json)
      FROM (SELECT access_hour, accessed_at FROM user_access_hours ORDER BY accessed_at DESC LIMIT 5000) sub
    )
  ) INTO result;

  RETURN result;
END;
$function$;
