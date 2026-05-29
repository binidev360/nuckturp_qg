-- RPC para retornar saúde dos cron jobs com últimas execuções
-- Onda 3: Visibilidade de crons no Admin Operações
CREATE OR REPLACE FUNCTION public.admin_cron_health()
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

  SELECT json_agg(job_data ORDER BY job_data->>'jobid')
  INTO result
  FROM (
    SELECT json_build_object(
      'jobid', j.jobid,
      'schedule', j.schedule,
      'active', j.active,
      'command_preview', left(j.command, 120),
      'target_function', (
        CASE
          WHEN j.command ILIKE '%/functions/v1/%' THEN
            regexp_replace(
              substring(j.command FROM '/functions/v1/([a-z0-9_-]+)'),
              '^', ''
            )
          WHEN j.command ILIKE '%/rpc/%' THEN
            regexp_replace(
              substring(j.command FROM '/rpc/([a-z0-9_]+)'),
              '^', ''
            )
          WHEN j.command ILIKE '%engagement_scores%' THEN 'engagement_scores_recompute'
          WHEN j.command ILIKE '%user_engagement%' THEN 'engagement_scores_recompute'
          ELSE 'sql_inline'
        END
      ),
      'last_runs', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'status', rd.status,
            'start_time', rd.start_time,
            'end_time', rd.end_time,
            'duration_ms', EXTRACT(MILLISECONDS FROM (rd.end_time - rd.start_time))::int,
            'return_message', left(rd.return_message, 200)
          ) ORDER BY rd.start_time DESC
        ), '[]'::json)
        FROM (
          SELECT * FROM cron.job_run_details d
          WHERE d.jobid = j.jobid
          ORDER BY d.start_time DESC
          LIMIT 5
        ) rd
      ),
      'stats_24h', (
        SELECT json_build_object(
          'total_runs', count(*),
          'succeeded', count(*) FILTER (WHERE d2.status = 'succeeded'),
          'failed', count(*) FILTER (WHERE d2.status = 'failed'),
          'avg_duration_ms', COALESCE(AVG(EXTRACT(MILLISECONDS FROM (d2.end_time - d2.start_time)))::int, 0),
          'max_duration_ms', COALESCE(MAX(EXTRACT(MILLISECONDS FROM (d2.end_time - d2.start_time)))::int, 0)
        )
        FROM cron.job_run_details d2
        WHERE d2.jobid = j.jobid
          AND d2.start_time > now() - interval '24 hours'
      )
    ) AS job_data
    FROM cron.job j
  ) sub;

  RETURN COALESCE(result, '[]'::json);
END;
$function$;