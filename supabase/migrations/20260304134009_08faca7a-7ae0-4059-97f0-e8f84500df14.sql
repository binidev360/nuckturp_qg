-- Track each post view event for accurate daily analytics
CREATE TABLE IF NOT EXISTS public.post_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_user_id UUID NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_view_events ENABLE ROW LEVEL SECURITY;

-- Helpful indexes for daily aggregation
CREATE INDEX IF NOT EXISTS idx_post_view_events_post_id_viewed_at
  ON public.post_view_events (post_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_view_events_viewed_at
  ON public.post_view_events (viewed_at DESC);

-- Access: admins can inspect all events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'post_view_events'
      AND policyname = 'Admins can view post view events'
  ) THEN
    CREATE POLICY "Admins can view post view events"
      ON public.post_view_events
      FOR SELECT
      USING (public.is_admin(auth.uid()));
  END IF;
END
$$;

-- Access: authors can inspect only events from their own posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'post_view_events'
      AND policyname = 'Authors can view own post view events'
  ) THEN
    CREATE POLICY "Authors can view own post view events"
      ON public.post_view_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.posts p
          WHERE p.id = post_view_events.post_id
            AND p.blog_author_id = public.get_user_blog_author_id(auth.uid())
        )
      );
  END IF;
END
$$;

-- Accurate daily views for an author (last N days)
CREATE OR REPLACE FUNCTION public.get_author_daily_views(_blog_author_id uuid, _days integer DEFAULT 30)
RETURNS TABLE(day date, views bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.is_admin(v_user_id)
     AND public.get_user_blog_author_id(v_user_id) IS DISTINCT FROM _blog_author_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      (current_date - GREATEST(1, _days)::int + 1)::date,
      current_date,
      interval '1 day'
    )::date AS day
  ),
  author_posts AS (
    SELECT id
    FROM public.posts
    WHERE blog_author_id = _blog_author_id
      AND status = 'published'
  ),
  daily AS (
    SELECT pve.viewed_at::date AS day, count(*)::bigint AS views
    FROM public.post_view_events pve
    JOIN author_posts ap ON ap.id = pve.post_id
    WHERE pve.viewed_at::date >= (current_date - GREATEST(1, _days)::int + 1)::date
    GROUP BY pve.viewed_at::date
  )
  SELECT d.day, COALESCE(dv.views, 0)::bigint AS views
  FROM days d
  LEFT JOIN daily dv ON dv.day = d.day
  ORDER BY d.day;
END;
$$;

-- Update view increment RPC to persist per-view events for daily charting
CREATE OR REPLACE FUNCTION public.increment_post_view(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_is_author boolean;
BEGIN
  v_user_id := auth.uid();

  -- Check if user is admin
  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE(p.is_admin, false) INTO v_is_admin
    FROM public.profiles p WHERE p.user_id = v_user_id;

    IF v_is_admin THEN RETURN; END IF;

    -- Check if user is the post author
    SELECT EXISTS(
      SELECT 1 FROM public.posts po
      JOIN public.blog_authors ba ON ba.id = po.blog_author_id
      JOIN public.profiles pr ON pr.id = ba.profile_id
      WHERE po.id = p_post_id AND pr.user_id = v_user_id
    ) INTO v_is_author;

    IF v_is_author THEN RETURN; END IF;
  END IF;

  -- Increment cumulative view counter
  UPDATE public.posts
  SET view_count = view_count + 1
  WHERE id = p_post_id;

  -- Persist event for accurate daily analytics
  INSERT INTO public.post_view_events (post_id, viewer_user_id)
  VALUES (p_post_id, v_user_id);
END;
$$;