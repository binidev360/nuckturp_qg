
-- Fix admin_storage_ranking to include premium status (override check)
CREATE OR REPLACE FUNCTION public.admin_storage_ranking(_limit integer DEFAULT 50)
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

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT
      o.owner::text AS user_id,
      p.display_name,
      p.nickname,
      p.slug,
      p.avatar_url,
      SUM((o.metadata->>'size')::bigint) AS total_bytes,
      COUNT(*) AS file_count,
      ROUND(SUM((o.metadata->>'size')::bigint)::numeric / (1024 * 1024), 2) AS total_mb,
      EXISTS (
        SELECT 1 FROM public.premium_overrides po
        WHERE po.user_id = o.owner
          AND po.starts_at <= now()
          AND (po.ends_at IS NULL OR po.ends_at >= now())
      ) AS has_premium_override
    FROM storage.objects o
    JOIN public.profiles p ON p.user_id = o.owner
    WHERE o.owner IS NOT NULL
    GROUP BY o.owner, p.display_name, p.nickname, p.slug, p.avatar_url
    ORDER BY SUM((o.metadata->>'size')::bigint) DESC
    LIMIT _limit
  ) t;

  RETURN result;
END;
$function$;

-- Fix admin_take_infra_snapshot to calculate real storage_bytes
CREATE OR REPLACE FUNCTION public.admin_take_infra_snapshot()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cache numeric;
  v_db_size numeric;
  v_active int;
  v_total int;
  v_max int;
  v_dead bigint;
  v_idx numeric;
  v_rows bigint;
  v_storage_bytes bigint;
  result json;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(
    ROUND((sum(heap_blks_hit)::numeric / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0)) * 100, 2), 0
  ) INTO v_cache FROM pg_statio_user_tables;

  SELECT ROUND(pg_database_size(current_database())::numeric / (1024*1024), 2) INTO v_db_size;

  SELECT count(*) FILTER (WHERE state = 'active'), count(*), current_setting('max_connections')::int
  INTO v_active, v_total, v_max
  FROM pg_stat_activity;

  SELECT COALESCE(sum(n_dead_tup), 0),
         COALESCE(ROUND((sum(idx_scan)::numeric / NULLIF(sum(idx_scan) + sum(seq_scan), 0)) * 100, 2), 0)
  INTO v_dead, v_idx
  FROM pg_stat_user_tables;

  SELECT COALESCE(sum(n_live_tup), 0) INTO v_rows FROM pg_stat_user_tables;

  -- Calculate actual storage bytes from storage.objects
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) INTO v_storage_bytes FROM storage.objects;

  INSERT INTO public.infra_snapshots (cache_hit_ratio, db_size_mb, active_connections, total_connections, max_connections, dead_tuples, index_usage_ratio, total_rows, storage_bytes)
  VALUES (v_cache, v_db_size, v_active, v_total, v_max, v_dead, v_idx, v_rows, v_storage_bytes)
  RETURNING json_build_object('id', id, 'created_at', created_at) INTO result;

  DELETE FROM public.infra_snapshots WHERE created_at < now() - interval '90 days';

  RETURN result;
END;
$function$;
