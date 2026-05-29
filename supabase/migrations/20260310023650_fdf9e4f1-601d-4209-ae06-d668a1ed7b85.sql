
-- Admin function to get feedback summary per master
CREATE OR REPLACE FUNCTION public.admin_feedback_summary()
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
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        m.user_id,
        p.display_name,
        p.avatar_url,
        p.nickname,
        count(DISTINCT c.id)::int AS total_configs,
        count(r.id)::int AS total_responses,
        COALESCE(ROUND(AVG(r.nps_score)::numeric, 1), 0)::float AS avg_nps
      FROM memberships m
      JOIN profiles p ON p.user_id = m.user_id
      JOIN session_feedback_configs c ON c.tenant_id = m.tenant_id
      LEFT JOIN session_feedback_responses r ON r.config_id = c.id
      GROUP BY m.user_id, p.display_name, p.avatar_url, p.nickname
      ORDER BY count(r.id) DESC
    ) t
  );
END;
$$;
