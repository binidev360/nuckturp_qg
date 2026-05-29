
-- 1. Author follows table
CREATE TABLE public.author_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  blog_author_id uuid NOT NULL REFERENCES public.blog_authors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, blog_author_id)
);

ALTER TABLE public.author_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are publicly readable" ON public.author_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own follows" ON public.author_follows
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own follows" ON public.author_follows
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 2. Trigger function to notify followers when author publishes new post
CREATE OR REPLACE FUNCTION public.notify_author_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_name text;
  v_author_slug text;
  v_notification_id uuid;
BEGIN
  -- Only fire when post becomes published for the first time
  IF NEW.blog_author_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (TG_OP = 'INSERT' AND NEW.status = 'published')
    OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'published' AND NEW.status = 'published')
  ) THEN
    RETURN NEW;
  END IF;

  -- Skip if published_at is in the future (scheduled - will be handled when it actually publishes)
  IF NEW.published_at IS NOT NULL AND NEW.published_at > now() + interval '2 minutes' THEN
    RETURN NEW;
  END IF;

  -- Check if there are any followers
  IF NOT EXISTS (SELECT 1 FROM author_follows WHERE blog_author_id = NEW.blog_author_id LIMIT 1) THEN
    RETURN NEW;
  END IF;

  -- Get author info
  SELECT
    COALESCE(p.nickname, p.display_name, ba.name),
    COALESCE(p.slug, ba.slug)
  INTO v_author_name, v_author_slug
  FROM blog_authors ba
  LEFT JOIN profiles p ON p.id = ba.profile_id
  WHERE ba.id = NEW.blog_author_id;

  BEGIN
    -- Create notification
    INSERT INTO notifications (title, body, type, status, published_at, created_by, image_url, link_url, link_label, target_audience)
    VALUES (
      'Novo artigo de ' || COALESCE(v_author_name, 'autor'),
      NEW.title,
      'blog_follow',
      'published',
      now(),
      NEW.author_id,
      COALESCE(NEW.og_image_url, NEW.cover_url),
      '/m/' || v_author_slug || '/blog/' || NEW.slug,
      'Ler artigo',
      'followers'
    )
    RETURNING id INTO v_notification_id;

    -- Create user_notifications for each follower (exclude the post author)
    INSERT INTO user_notifications (notification_id, user_id)
    SELECT v_notification_id, af.user_id
    FROM author_follows af
    WHERE af.blog_author_id = NEW.blog_author_id
    AND af.user_id != NEW.author_id;

    -- Update sent_count
    UPDATE notifications SET sent_count = (
      SELECT count(*) FROM user_notifications WHERE notification_id = v_notification_id
    ) WHERE id = v_notification_id;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_author_followers failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Create trigger on posts
CREATE TRIGGER trg_notify_author_followers
  AFTER INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_author_followers();

-- 3. Trending posts function (bypasses RLS on post_view_events)
CREATE OR REPLACE FUNCTION public.get_trending_posts(days_back int DEFAULT 7, limit_count int DEFAULT 5)
RETURNS TABLE(post_id uuid, view_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pve.post_id, count(*) as view_count
  FROM post_view_events pve
  JOIN posts p ON p.id = pve.post_id
  WHERE pve.viewed_at >= now() - (days_back || ' days')::interval
  AND p.status = 'published'
  AND p.visibility = 'public'
  GROUP BY pve.post_id
  ORDER BY view_count DESC
  LIMIT limit_count;
$$;
