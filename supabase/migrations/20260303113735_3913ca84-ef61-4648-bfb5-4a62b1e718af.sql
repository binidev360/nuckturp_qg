
-- Fix the last remaining WP embed (has HTML in figcaption)
UPDATE posts SET 
  content = regexp_replace(
    content,
    '<figure[^>]*wp-block-embed-youtube[^>]*>\s*<div[^>]*>\s*https?://(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+)[^\s<]*\s*</div>\s*<figcaption[^>]*>.*?</figcaption>\s*</figure>',
    '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;border-radius:12px;margin:1.5rem 0"><iframe src="https://www.youtube.com/embed/\1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>',
    'g'
  ),
  updated_at = now()
WHERE id = 'f21fbfc4-3d91-4347-a9d9-131303488fc9';
