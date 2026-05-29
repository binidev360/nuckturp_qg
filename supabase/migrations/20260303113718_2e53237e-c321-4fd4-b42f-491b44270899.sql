
-- Fix old domain links
UPDATE posts SET 
  content = regexp_replace(
    regexp_replace(
      regexp_replace(content, 
        'https?://(?:www\.)?nuckturp\.com\.br/novidades/', '/novidades/', 'g'),
      'https?://(?:www\.)?nuckturp\.com\.br/', '/', 'g'),
    'https?://(?:www\.)?nuckturp\.com\.br', '/', 'g'),
  updated_at = now()
WHERE status = 'published' AND content LIKE '%nuckturp.com.br%';
