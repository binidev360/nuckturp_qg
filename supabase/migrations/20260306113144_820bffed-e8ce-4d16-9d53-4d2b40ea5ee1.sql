
-- Create a clean, unambiguous function for searching profiles (used in author linking)
CREATE OR REPLACE FUNCTION public.search_profiles_for_linking(_search text, _limit integer DEFAULT 10)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      p.user_id,
      p.display_name,
      p.nickname,
      p.slug,
      p.avatar_url,
      p.is_admin,
      COALESCE(p.tags, '{}') as tags
    FROM profiles p
    WHERE _search IS NOT NULL 
      AND length(_search) >= 2
      AND (
        p.display_name ILIKE '%' || _search || '%' 
        OR p.nickname ILIKE '%' || _search || '%'
        OR p.slug ILIKE '%' || _search || '%'
      )
    ORDER BY p.display_name ASC
    LIMIT _limit
  ) t;
$$;
