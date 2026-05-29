
CREATE TABLE public.infra_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  cache_hit_ratio numeric NOT NULL DEFAULT 0,
  db_size_mb numeric NOT NULL DEFAULT 0,
  active_connections int NOT NULL DEFAULT 0,
  total_connections int NOT NULL DEFAULT 0,
  max_connections int NOT NULL DEFAULT 0,
  dead_tuples bigint NOT NULL DEFAULT 0,
  index_usage_ratio numeric NOT NULL DEFAULT 0,
  total_rows bigint NOT NULL DEFAULT 0,
  storage_bytes bigint NOT NULL DEFAULT 0
);

ALTER TABLE public.infra_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage infra snapshots"
  ON public.infra_snapshots FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Function to take a snapshot (called from admin panel)
CREATE OR REPLACE FUNCTION public.admin_take_infra_snapshot()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cache numeric;
  v_db_size numeric;
  v_active int;
  v_total int;
  v_max int;
  v_dead bigint;
  v_idx numeric;
  v_rows bigint;
  result json;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Cache hit ratio
  SELECT COALESCE(
    ROUND((sum(heap_blks_hit)::numeric / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0)) * 100, 2), 0
  ) INTO v_cache FROM pg_statio_user_tables;

  -- DB size
  SELECT ROUND(pg_database_size(current_database())::numeric / (1024*1024), 2) INTO v_db_size;

  -- Connections
  SELECT count(*) FILTER (WHERE state = 'active'), count(*), current_setting('max_connections')::int
  INTO v_active, v_total, v_max
  FROM pg_stat_activity;

  -- Dead tuples & index usage
  SELECT COALESCE(sum(n_dead_tup), 0),
         COALESCE(ROUND((sum(idx_scan)::numeric / NULLIF(sum(idx_scan) + sum(seq_scan), 0)) * 100, 2), 0)
  INTO v_dead, v_idx
  FROM pg_stat_user_tables;

  -- Total rows
  SELECT COALESCE(sum(n_live_tup), 0) INTO v_rows FROM pg_stat_user_tables;

  INSERT INTO public.infra_snapshots (cache_hit_ratio, db_size_mb, active_connections, total_connections, max_connections, dead_tuples, index_usage_ratio, total_rows, storage_bytes)
  VALUES (v_cache, v_db_size, v_active, v_total, v_max, v_dead, v_idx, v_rows, 0)
  RETURNING json_build_object('id', id, 'created_at', created_at) INTO result;

  -- Keep only last 90 days
  DELETE FROM public.infra_snapshots WHERE created_at < now() - interval '90 days';

  RETURN result;
END;
$$;
