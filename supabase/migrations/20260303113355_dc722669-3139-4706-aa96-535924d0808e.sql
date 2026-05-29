
-- Function to clean and fix all published post content
CREATE OR REPLACE FUNCTION public.fix_post_content_batch()
RETURNS TABLE(post_id uuid, post_title text, changes text[]) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  original_content text;
  new_content text;
  post_changes text[];
  video_id text;
  matches text[];
BEGIN
  FOR r IN SELECT id, title, content FROM posts WHERE status = 'published' AND content IS NOT NULL
  LOOP
    original_content := r.content;
    new_content := r.content;
    post_changes := ARRAY[]::text[];

    -- 1. Convert WP YouTube embed blocks to iframes
    -- Pattern: <figure class="wp-block-embed...youtube..."><div class="wp-block-embed__wrapper">\nURL\n</div></figure>
    -- Extract video IDs and replace with proper iframes
    WHILE new_content ~ '<figure[^>]*wp-block-embed-youtube[^>]*>.*?</figure>' LOOP
      -- Get the embed block
      matches := regexp_match(new_content, '<figure[^>]*wp-block-embed-youtube[^>]*>\s*<div[^>]*>\s*(https?://[^\s<]+)\s*</div>\s*</figure>');
      IF matches IS NOT NULL AND matches[1] IS NOT NULL THEN
        -- Extract video ID from various YouTube URL formats
        video_id := NULL;
        -- youtube.com/watch?v=ID
        IF matches[1] ~ 'youtube\.com/watch' THEN
          video_id := (regexp_match(matches[1], '[?&]v=([a-zA-Z0-9_-]+)'))[1];
        -- youtu.be/ID
        ELSIF matches[1] ~ 'youtu\.be/' THEN
          video_id := (regexp_match(matches[1], 'youtu\.be/([a-zA-Z0-9_-]+)'))[1];
        -- youtube.com/embed/ID
        ELSIF matches[1] ~ 'youtube\.com/embed/' THEN
          video_id := (regexp_match(matches[1], 'embed/([a-zA-Z0-9_-]+)'))[1];
        END IF;
        
        IF video_id IS NOT NULL THEN
          new_content := regexp_replace(
            new_content,
            '<figure[^>]*wp-block-embed-youtube[^>]*>\s*<div[^>]*>\s*' || regexp_replace(matches[1], '([.?+*|{}()\[\]\\])', '\\\1', 'g') || '\s*</div>\s*</figure>',
            '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;border-radius:12px;margin:1.5rem 0"><iframe src="https://www.youtube.com/embed/' || video_id || '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>'
          );
          post_changes := array_append(post_changes, 'youtube_embed:' || video_id);
        ELSE
          -- Can't parse, just remove the broken embed
          new_content := regexp_replace(
            new_content,
            '<figure[^>]*wp-block-embed-youtube[^>]*>\s*<div[^>]*>\s*' || regexp_replace(matches[1], '([.?+*|{}()\[\]\\])', '\\\1', 'g') || '\s*</div>\s*</figure>',
            ''
          );
          post_changes := array_append(post_changes, 'removed_broken_embed');
        END IF;
      ELSE
        EXIT; -- No more matches or pattern changed
      END IF;
    END LOOP;

    -- 2. Strip inline color styles (style="color:#xxx")
    IF new_content ~ 'style="[^"]*color:[^"]*"' THEN
      -- Remove style attributes that only contain color
      new_content := regexp_replace(new_content, '\s*style="color:[^"]*"', '', 'g');
      -- Remove has-inline-color class
      new_content := regexp_replace(new_content, '\s*class="has-inline-color[^"]*"', '', 'g');
      -- Remove empty span tags left behind
      new_content := regexp_replace(new_content, '<span>([^<]*)</span>', '\1', 'g');
      post_changes := array_append(post_changes, 'stripped_inline_colors');
    END IF;

    -- 3. Replace nuckturp.com.br links with nuckturp.lovable.app
    IF new_content ~ 'nuckturp\.com\.br' THEN
      new_content := regexp_replace(new_content, 'https?://(?:www\.)?nuckturp\.com\.br/novidades/', '/novidades/', 'g');
      new_content := regexp_replace(new_content, 'https?://(?:www\.)?nuckturp\.com\.br/', '/', 'g');
      post_changes := array_append(post_changes, 'fixed_old_domain_links');
    END IF;

    -- 4. Clean WordPress comment blocks
    new_content := regexp_replace(new_content, '<!-- /?wp:[a-z-]+ [^>]*-->\s*', '', 'g');
    new_content := regexp_replace(new_content, '<!-- /?wp:[a-z-]+ -->\s*', '', 'g');
    IF new_content <> regexp_replace(original_content, '<!-- /?wp:[a-z-]+ [^>]*-->\s*', '', 'g') THEN
      -- Only note WP cleanup if other changes were also made
      NULL;
    END IF;
    post_changes := array_append(post_changes, 'cleaned_wp_comments');

    -- 5. Clean WordPress specific classes from elements
    new_content := regexp_replace(new_content, ' class="wp-block-[a-z-]+"', '', 'g');
    new_content := regexp_replace(new_content, ' class="wp-block-heading"', '', 'g');

    -- Only update if content actually changed
    IF new_content <> original_content THEN
      UPDATE posts SET content = new_content, updated_at = now() WHERE id = r.id;
      post_id := r.id;
      post_title := r.title;
      changes := post_changes;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Execute the function
SELECT * FROM fix_post_content_batch();
