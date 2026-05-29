
CREATE OR REPLACE FUNCTION public.get_reaction_counts(_post_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT json_object_agg(emoji, cnt)
     FROM (
       SELECT emoji, count(*)::int AS cnt
       FROM public.post_reactions
       WHERE post_id = _post_id
       GROUP BY emoji
     ) t),
    '{}'::json
  );
$$;
