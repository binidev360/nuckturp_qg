
-- RPC: Aggregates users by last_sign_in_at into inactivity buckets
-- Used by Admin > Users > Retenção sub-tab
CREATE OR REPLACE FUNCTION public.admin_user_activity_buckets()
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
    'total_users', (SELECT count(*) FROM auth.users),
    'buckets', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.sort_order), '[]'::json)
      FROM (
        SELECT
          bucket,
          cnt,
          sort_order
        FROM (
          SELECT 'today' AS bucket, count(*) AS cnt, 1 AS sort_order
          FROM auth.users WHERE last_sign_in_at >= now() - interval '1 day'
          UNION ALL
          SELECT '1d', count(*), 2
          FROM auth.users WHERE last_sign_in_at < now() - interval '1 day' AND last_sign_in_at >= now() - interval '2 days'
          UNION ALL
          SELECT '2d', count(*), 3
          FROM auth.users WHERE last_sign_in_at < now() - interval '2 days' AND last_sign_in_at >= now() - interval '7 days'
          UNION ALL
          SELECT '7d', count(*), 4
          FROM auth.users WHERE last_sign_in_at < now() - interval '7 days' AND last_sign_in_at >= now() - interval '15 days'
          UNION ALL
          SELECT '15d', count(*), 5
          FROM auth.users WHERE last_sign_in_at < now() - interval '15 days' AND last_sign_in_at >= now() - interval '21 days'
          UNION ALL
          SELECT '21d', count(*), 6
          FROM auth.users WHERE last_sign_in_at < now() - interval '21 days' AND last_sign_in_at >= now() - interval '30 days'
          UNION ALL
          SELECT '30d', count(*), 7
          FROM auth.users WHERE last_sign_in_at < now() - interval '30 days' AND last_sign_in_at >= now() - interval '60 days'
          UNION ALL
          SELECT '2m', count(*), 8
          FROM auth.users WHERE last_sign_in_at < now() - interval '60 days' AND last_sign_in_at >= now() - interval '90 days'
          UNION ALL
          SELECT '3m', count(*), 9
          FROM auth.users WHERE last_sign_in_at < now() - interval '90 days' AND last_sign_in_at >= now() - interval '180 days'
          UNION ALL
          SELECT '6m', count(*), 10
          FROM auth.users WHERE last_sign_in_at < now() - interval '180 days' AND last_sign_in_at >= now() - interval '365 days'
          UNION ALL
          SELECT '1y+', count(*), 11
          FROM auth.users WHERE last_sign_in_at < now() - interval '365 days' OR last_sign_in_at IS NULL
        ) sub
      ) t
    ),
    -- Segmentation summary
    'segments', (
      SELECT json_build_object(
        'active', (SELECT count(*) FROM auth.users WHERE last_sign_in_at >= now() - interval '7 days'),
        'at_risk', (SELECT count(*) FROM auth.users WHERE last_sign_in_at < now() - interval '7 days' AND last_sign_in_at >= now() - interval '30 days'),
        'dormant', (SELECT count(*) FROM auth.users WHERE last_sign_in_at < now() - interval '30 days' AND last_sign_in_at >= now() - interval '90 days'),
        'lost', (SELECT count(*) FROM auth.users WHERE last_sign_in_at < now() - interval '90 days' OR last_sign_in_at IS NULL)
      )
    ),
    -- KPIs
    'dau', (SELECT count(*) FROM auth.users WHERE last_sign_in_at >= now() - interval '1 day'),
    'wau', (SELECT count(*) FROM auth.users WHERE last_sign_in_at >= now() - interval '7 days'),
    'mau', (SELECT count(*) FROM auth.users WHERE last_sign_in_at >= now() - interval '30 days'),
    'critical_inactive', (SELECT count(*) FROM auth.users WHERE last_sign_in_at < now() - interval '30 days' OR last_sign_in_at IS NULL)
  ) INTO result;

  RETURN result;
END;
$function$;
