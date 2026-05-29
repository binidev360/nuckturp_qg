
-- Extended infra monitoring: pg_stat_statements, table sizes, replication slots info
CREATE OR REPLACE FUNCTION public.admin_infra_extended()
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
    -- Database size breakdown
    'db_size_mb', ROUND(pg_database_size(current_database())::numeric / (1024 * 1024), 2),
    
    -- Connections detail
    'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'idle_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'),
    'idle_in_transaction', (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction'),
    'max_connections', current_setting('max_connections')::int,
    'total_connections', (SELECT count(*) FROM pg_stat_activity),
    
    -- Memory settings (shared_buffers, work_mem, etc)
    'shared_buffers', current_setting('shared_buffers'),
    'work_mem', current_setting('work_mem'),
    'maintenance_work_mem', current_setting('maintenance_work_mem'),
    'effective_cache_size', current_setting('effective_cache_size'),
    
    -- Uptime
    'pg_postmaster_start_time', (SELECT pg_postmaster_start_time()),
    
    -- Table sizes (top 10)
    'table_sizes', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          schemaname || '.' || tablename AS table_name,
          pg_total_relation_size(schemaname || '.' || tablename) AS total_bytes,
          ROUND(pg_total_relation_size(schemaname || '.' || tablename)::numeric / (1024 * 1024), 2) AS size_mb,
          ROUND(pg_relation_size(schemaname || '.' || tablename)::numeric / (1024 * 1024), 2) AS data_mb,
          ROUND((pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename))::numeric / (1024 * 1024), 2) AS index_mb
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
        LIMIT 15
      ) t
    ),
    
    -- Transaction stats
    'xact_commit', (SELECT COALESCE(sum(xact_commit), 0) FROM pg_stat_database WHERE datname = current_database()),
    'xact_rollback', (SELECT COALESCE(sum(xact_rollback), 0) FROM pg_stat_database WHERE datname = current_database()),
    'blks_read', (SELECT COALESCE(sum(blks_read), 0) FROM pg_stat_database WHERE datname = current_database()),
    'blks_hit', (SELECT COALESCE(sum(blks_hit), 0) FROM pg_stat_database WHERE datname = current_database()),
    'temp_bytes', (SELECT COALESCE(sum(temp_bytes), 0) FROM pg_stat_database WHERE datname = current_database()),
    
    -- Replication slots
    'replication_slots', (
      SELECT COALESCE(json_agg(row_to_json(rs)), '[]'::json)
      FROM (
        SELECT slot_name, slot_type, active,
               pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes
        FROM pg_replication_slots
        LIMIT 10
      ) rs
    ),

    -- Vacuum stats (tables needing vacuum most)
    'vacuum_stats', (
      SELECT COALESCE(json_agg(row_to_json(vs)), '[]'::json)
      FROM (
        SELECT relname AS table_name,
               n_dead_tup AS dead_tuples,
               n_live_tup AS live_tuples,
               last_autovacuum,
               last_autoanalyze
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 0
        ORDER BY n_dead_tup DESC
        LIMIT 10
      ) vs
    )
  ) INTO result;
  
  RETURN result;
END;
$$;
