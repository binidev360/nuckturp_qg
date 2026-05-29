-- Normalize synthetic backfilled events so existing totals are visible in the last 30 days chart
WITH ranked AS (
  SELECT
    pve.id,
    row_number() OVER (PARTITION BY pve.post_id ORDER BY pve.id) AS rn,
    GREATEST(
      1,
      LEAST(
        30,
        ((current_date - COALESCE(p.published_at::date, current_date)) + 1)
      )
    )::int AS span_days
  FROM public.post_view_events pve
  JOIN public.posts p ON p.id = pve.post_id
  WHERE pve.viewer_user_id IS NULL
)
UPDATE public.post_view_events pve
SET viewed_at = (
  current_date - (((ranked.rn - 1) % ranked.span_days)::int)
)::timestamptz + interval '12 hours'
FROM ranked
WHERE ranked.id = pve.id;