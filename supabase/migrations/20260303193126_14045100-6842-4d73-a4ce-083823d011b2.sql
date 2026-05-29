
-- Admin DB monitoring functions (SECURITY DEFINER, admin-only)

CREATE OR REPLACE FUNCTION public.admin_db_cache_hit()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'ratio', COALESCE(
      ROUND(
        (sum(heap_blks_hit)::numeric / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0)) * 100,
        2
      ),
      0
    )
  ) INTO result
  FROM pg_statio_user_tables;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_long_queries()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO result
  FROM (
    SELECT
      pid,
      now() - pg_stat_activity.query_start AS duration,
      EXTRACT(EPOCH FROM (now() - pg_stat_activity.query_start))::int AS duration_seconds,
      state,
      LEFT(query, 200) AS query_preview,
      usename,
      application_name
    FROM pg_stat_activity
    WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
      AND state != 'idle'
      AND pid != pg_backend_pid()
    ORDER BY query_start ASC
    LIMIT 20
  ) t;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_db_size()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'size_mb', ROUND(pg_database_size(current_database())::numeric / (1024 * 1024), 2),
    'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'max_connections', current_setting('max_connections')::int,
    'dead_tuples', (SELECT COALESCE(sum(n_dead_tup), 0) FROM pg_stat_user_tables),
    'index_usage_ratio', COALESCE(
      ROUND(
        (sum(idx_scan)::numeric / NULLIF(sum(idx_scan) + sum(seq_scan), 0)) * 100,
        2
      ),
      0
    )
  ) INTO result
  FROM pg_stat_user_tables;

  RETURN result;
END;
$$;
