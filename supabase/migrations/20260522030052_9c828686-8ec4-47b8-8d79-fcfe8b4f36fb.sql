
-- ============================================================
-- Edge Function Metrics (portável: roda em qualquer Postgres)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.edge_function_metrics (
  id BIGSERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  error_message TEXT,
  request_id TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_efm_fn_time
  ON public.edge_function_metrics (function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_efm_time
  ON public.edge_function_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_efm_errors
  ON public.edge_function_metrics (function_name, created_at DESC)
  WHERE status_code >= 500;

ALTER TABLE public.edge_function_metrics ENABLE ROW LEVEL SECURITY;

-- Somente admins leem; escrita só via service role (nenhuma policy de INSERT).
CREATE POLICY "Admins can read edge function metrics"
  ON public.edge_function_metrics
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- Agregação: invocações, error rate, latência (avg/p50/p95/p99)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_edge_function_stats(window_minutes INTEGER DEFAULT 60)
RETURNS TABLE (
  function_name TEXT,
  invocations BIGINT,
  errors BIGINT,
  error_rate NUMERIC,
  avg_ms NUMERIC,
  p50_ms NUMERIC,
  p95_ms NUMERIC,
  p99_ms NUMERIC,
  last_invocation TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.function_name,
    COUNT(*)::BIGINT AS invocations,
    COUNT(*) FILTER (WHERE m.status_code >= 500)::BIGINT AS errors,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE m.status_code >= 500)::NUMERIC
      / NULLIF(COUNT(*), 0),
      2
    ) AS error_rate,
    ROUND(AVG(m.duration_ms)::NUMERIC, 1) AS avg_ms,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY m.duration_ms)::NUMERIC AS p50_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY m.duration_ms)::NUMERIC AS p95_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY m.duration_ms)::NUMERIC AS p99_ms,
    MAX(m.created_at) AS last_invocation
  FROM public.edge_function_metrics m
  WHERE m.created_at >= now() - make_interval(mins => window_minutes)
    AND public.has_role(auth.uid(), 'admin'::app_role)
  GROUP BY m.function_name
  ORDER BY invocations DESC;
$$;

REVOKE ALL ON FUNCTION public.get_edge_function_stats(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_edge_function_stats(INTEGER) TO authenticated;

-- ============================================================
-- Retenção: 30 dias (cron diário 03:30 UTC)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-edge-function-metrics')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'purge-edge-function-metrics'
    );
    PERFORM cron.schedule(
      'purge-edge-function-metrics',
      '30 3 * * *',
      $cron$ DELETE FROM public.edge_function_metrics WHERE created_at < now() - interval '30 days'; $cron$
    );
  END IF;
END $$;
