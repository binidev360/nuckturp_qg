-- One-time backfill so existing published post views appear in daily analytics
-- Only runs when tracking table is still empty.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.post_view_events LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.post_view_events (post_id, viewer_user_id, viewed_at)
  SELECT
    p.id,
    NULL::uuid,
    COALESCE(p.published_at, p.created_at, now())
  FROM public.posts p
  CROSS JOIN LATERAL generate_series(1, GREATEST(p.view_count, 0)) g(n)
  WHERE p.status = 'published'
    AND p.view_count > 0;
END
$$;