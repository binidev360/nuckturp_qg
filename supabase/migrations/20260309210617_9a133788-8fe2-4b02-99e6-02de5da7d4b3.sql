
-- Function to get storage usage in bytes for a specific user
CREATE OR REPLACE FUNCTION public.get_user_storage_bytes(_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)::bigint
  FROM storage.objects
  WHERE owner = _user_id;
$$;

-- Admin function: get storage usage for all users (ranked)
CREATE OR REPLACE FUNCTION public.admin_storage_ranking(_limit int DEFAULT 50)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      ROUND(SUM((o.metadata->>'size')::bigint)::numeric / (1024 * 1024), 2) AS total_mb
    FROM storage.objects o
    JOIN public.profiles p ON p.user_id = o.owner
    WHERE o.owner IS NOT NULL
    GROUP BY o.owner, p.display_name, p.nickname, p.slug, p.avatar_url
    ORDER BY SUM((o.metadata->>'size')::bigint) DESC
    LIMIT _limit
  ) t;

  RETURN result;
END;
$$;

-- Admin function: get total storage stats
CREATE OR REPLACE FUNCTION public.admin_storage_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'total_bytes', (SELECT COALESCE(SUM((metadata->>'size')::bigint), 0) FROM storage.objects),
    'total_files', (SELECT COUNT(*) FROM storage.objects),
    'total_users_with_files', (SELECT COUNT(DISTINCT owner) FROM storage.objects WHERE owner IS NOT NULL),
    'by_bucket', (
      SELECT COALESCE(json_agg(row_to_json(b)), '[]'::json)
      FROM (
        SELECT bucket_id, 
               SUM((metadata->>'size')::bigint) AS bytes,
               COUNT(*) AS files
        FROM storage.objects
        GROUP BY bucket_id
        ORDER BY SUM((metadata->>'size')::bigint) DESC
      ) b
    )
  ) INTO result;

  RETURN result;
END;
$$;
