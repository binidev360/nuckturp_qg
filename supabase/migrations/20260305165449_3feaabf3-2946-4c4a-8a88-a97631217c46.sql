
CREATE OR REPLACE FUNCTION public.admin_blog_author_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        ba.id,
        ba.name,
        ba.slug,
        ba.email,
        ba.bio,
        ba.avatar_url,
        ba.profile_id,
        ba.created_at,
        COALESCE(ps.post_count, 0)::int AS post_count,
        COALESCE(ps.published_count, 0)::int AS published_count,
        COALESCE(ps.draft_count, 0)::int AS draft_count,
        COALESCE(ps.total_views, 0)::int AS total_views,
        ps.latest_published_at,
        pr.display_name AS profile_display_name,
        pr.nickname AS profile_nickname,
        pr.avatar_url AS profile_avatar_url,
        pr.bio AS profile_bio,
        pr.slug AS profile_slug
      FROM public.blog_authors ba
      LEFT JOIN LATERAL (
        SELECT
          count(*)::int AS post_count,
          count(*) FILTER (WHERE p.status = 'published')::int AS published_count,
          count(*) FILTER (WHERE p.status = 'draft')::int AS draft_count,
          COALESCE(sum(p.view_count), 0)::int AS total_views,
          max(p.published_at) AS latest_published_at
        FROM public.posts p
        WHERE p.blog_author_id = ba.id
      ) ps ON true
      LEFT JOIN public.profiles pr ON pr.id = ba.profile_id
      ORDER BY COALESCE(ps.total_views, 0) DESC, COALESCE(ps.post_count, 0) DESC, ba.name ASC
    ) t
  );
END;
$function$;
