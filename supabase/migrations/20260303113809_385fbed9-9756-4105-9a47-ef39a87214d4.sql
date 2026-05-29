
-- Fix store.nuckturp.com.br links (these are dead, point to /novidades/ path)
UPDATE posts SET 
  content = regexp_replace(content, 'https?://store\.nuckturp\.com\.br/novidades/', '/novidades/', 'g'),
  updated_at = now()
WHERE status = 'published' AND content LIKE '%store.nuckturp.com.br%';

-- Fix last remaining WP comment
UPDATE posts SET 
  content = regexp_replace(content, '<!-- /?wp:[a-z-]+ [^-]*-->', '', 'g'),
  updated_at = now()
WHERE id = '23971072-bfed-451a-8af7-ec7456d1b5d7';

UPDATE posts SET 
  content = regexp_replace(content, '<!-- /?wp:[a-z-]+ -->', '', 'g'),
  updated_at = now()
WHERE id = '23971072-bfed-451a-8af7-ec7456d1b5d7';
