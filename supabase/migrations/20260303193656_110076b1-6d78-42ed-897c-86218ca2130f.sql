-- Fix google_site_verification: stored full HTML tag, should be just content value
UPDATE public.site_settings
SET google_config = jsonb_set(
  google_config::jsonb,
  '{google_site_verification}',
  '"uJa3lnJE7iAvduRYAMg3tY3HnuOl4lUIbPqTgDerSpw"'
),
updated_at = now()
WHERE id = 'default';
