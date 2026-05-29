
-- Re-create the scan function with fixed regex escaping
CREATE OR REPLACE FUNCTION public.admin_scan_broken_media(
  _bucket text DEFAULT 'blog-assets',
  _dead_domains text[] DEFAULT ARRAY['nuckturp.com.br', 'www.nuckturp.com.br']
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_domain_pattern text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Escape dots in domains for regex usage
  v_domain_pattern := array_to_string(
    ARRAY(SELECT replace(d, '.', '\.') FROM unnest(_dead_domains) AS d),
    '|'
  );

  WITH
  domain_patterns AS (
    SELECT unnest(_dead_domains) AS domain
  ),

  broken_covers AS (
    SELECT
      p.id AS post_id,
      p.title,
      p.slug,
      p.cover_url AS broken_url,
      'cover_url'::text AS field_type,
      regexp_replace(p.cover_url, '^.*/([^/]+)$', '\1') AS filename
    FROM posts p
    WHERE p.cover_url IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM domain_patterns dp
        WHERE p.cover_url ILIKE '%' || dp.domain || '%'
      )
  ),

  broken_inline AS (
    SELECT
      p.id AS post_id,
      p.title,
      p.slug,
      m[1] AS broken_url,
      'content'::text AS field_type,
      regexp_replace(m[1], '^.*/([^/]+)$', '\1') AS filename
    FROM posts p,
    LATERAL regexp_matches(p.content, 'src="([^"]*(?:' || v_domain_pattern || ')[^"]*)"', 'g') AS m
    WHERE p.content IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM domain_patterns dp
        WHERE p.content ILIKE '%' || dp.domain || '%'
      )
  ),

  all_broken AS (
    SELECT * FROM broken_covers
    UNION ALL
    SELECT * FROM broken_inline
  ),

  bucket_files AS (
    SELECT
      o.name AS file_path,
      o.id AS object_id,
      (o.metadata->>'size')::bigint AS size_bytes,
      o.created_at,
      regexp_replace(o.name, '^.*/([^/]+)$', '\1') AS filename
    FROM storage.objects o
    WHERE o.bucket_id = _bucket
  ),

  referenced_urls AS (
    SELECT cover_url AS url FROM posts WHERE cover_url IS NOT NULL AND cover_url LIKE '%' || _bucket || '%'
    UNION ALL
    SELECT og_image_url FROM posts WHERE og_image_url IS NOT NULL AND og_image_url LIKE '%' || _bucket || '%'
    UNION ALL
    SELECT avatar_url FROM blog_authors WHERE avatar_url IS NOT NULL AND avatar_url LIKE '%' || _bucket || '%'
    UNION ALL
    SELECT blog_banner_url FROM blog_authors WHERE blog_banner_url IS NOT NULL AND blog_banner_url LIKE '%' || _bucket || '%'
    UNION ALL
    SELECT avatar_url FROM profiles WHERE avatar_url IS NOT NULL AND avatar_url LIKE '%' || _bucket || '%'
    UNION ALL
    SELECT banner_url FROM profiles WHERE banner_url IS NOT NULL AND banner_url LIKE '%' || _bucket || '%'
    UNION ALL
    SELECT cover_url FROM campaigns WHERE cover_url IS NOT NULL AND cover_url LIKE '%' || _bucket || '%'
    UNION ALL
    SELECT image_url FROM notifications WHERE image_url IS NOT NULL AND image_url LIKE '%' || _bucket || '%'
    UNION ALL
    SELECT cover_url FROM notes WHERE cover_url IS NOT NULL AND cover_url LIKE '%' || _bucket || '%'
  ),

  orphan_files AS (
    SELECT bf.*
    FROM bucket_files bf
    WHERE NOT EXISTS (
      SELECT 1 FROM referenced_urls ru WHERE ru.url LIKE '%' || bf.file_path || '%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM posts p WHERE p.content LIKE '%' || bf.file_path || '%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM notes n WHERE n.content LIKE '%' || bf.file_path || '%'
    )
  ),

  matched AS (
    SELECT
      ab.post_id,
      ab.title AS post_title,
      ab.slug AS post_slug,
      ab.broken_url,
      ab.field_type,
      ab.filename AS broken_filename,
      orf.file_path AS suggested_file,
      orf.size_bytes AS suggested_size,
      orf.filename AS orphan_filename,
      CASE
        WHEN orf.filename IS NULL THEN 0
        WHEN lower(ab.filename) = lower(orf.filename) THEN 100
        WHEN lower(regexp_replace(ab.filename, '\.[^.]+$', '')) = lower(regexp_replace(orf.filename, '\.[^.]+$', '')) THEN 90
        WHEN lower(ab.filename) LIKE '%' || lower(regexp_replace(orf.filename, '\.[^.]+$', '')) || '%' THEN 70
        WHEN lower(orf.filename) LIKE '%' || lower(regexp_replace(ab.filename, '\.[^.]+$', '')) || '%' THEN 70
        ELSE 0
      END AS match_score
    FROM all_broken ab
    LEFT JOIN orphan_files orf ON (
      lower(ab.filename) = lower(orf.filename)
      OR lower(regexp_replace(ab.filename, '\.[^.]+$', '')) = lower(regexp_replace(orf.filename, '\.[^.]+$', ''))
      OR lower(orf.filename) LIKE '%' || lower(regexp_replace(ab.filename, '\.[^.]+$', '')) || '%'
    )
  ),

  -- Deduplicate: keep best match per broken reference
  best_matches AS (
    SELECT DISTINCT ON (post_id, broken_url)
      post_id, post_title, post_slug, broken_url, field_type, broken_filename,
      suggested_file, suggested_size, match_score
    FROM matched
    ORDER BY post_id, broken_url, match_score DESC NULLS LAST
  ),

  summary AS (
    SELECT json_build_object(
      'broken_count', (SELECT count(*) FROM best_matches),
      'matched_count', (SELECT count(*) FROM best_matches WHERE match_score > 0),
      'unmatched_count', (SELECT count(*) FROM best_matches WHERE match_score = 0 OR suggested_file IS NULL),
      'orphan_count', (SELECT count(*) FROM orphan_files),
      'bucket', _bucket,
      'items', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'post_id', bm.post_id,
            'post_title', bm.post_title,
            'post_slug', bm.post_slug,
            'broken_url', bm.broken_url,
            'field_type', bm.field_type,
            'broken_filename', bm.broken_filename,
            'suggested_file', bm.suggested_file,
            'suggested_size', bm.suggested_size,
            'match_score', bm.match_score
          ) ORDER BY bm.match_score DESC, bm.post_title
        ), '[]'::json)
        FROM best_matches bm
      ),
      'orphans', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'file_path', orf.file_path,
            'size_bytes', orf.size_bytes,
            'filename', orf.filename,
            'created_at', orf.created_at
          ) ORDER BY orf.file_path
        ), '[]'::json)
        FROM orphan_files orf
      )
    ) AS data
  )

  SELECT data INTO result FROM summary;
  RETURN result;
END;
$$;

-- Re-create reconcile function too
CREATE OR REPLACE FUNCTION public.admin_reconcile_media(
  _post_id uuid,
  _field_type text,
  _broken_url text,
  _new_file_path text,
  _bucket text DEFAULT 'blog-assets'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_url text;
  v_supabase_url text;
  affected int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_supabase_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://nhygqpnhumgxslpoachu.supabase.co'
  );
  v_new_url := v_supabase_url || '/storage/v1/object/public/' || _bucket || '/' || _new_file_path;

  IF _field_type = 'cover_url' THEN
    UPDATE posts
    SET cover_url = v_new_url, updated_at = now()
    WHERE id = _post_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
  ELSIF _field_type = 'content' THEN
    UPDATE posts
    SET content = replace(content, _broken_url, v_new_url), updated_at = now()
    WHERE id = _post_id AND content LIKE '%' || _broken_url || '%';
    GET DIAGNOSTICS affected = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'Invalid field_type: %. Use cover_url or content.', _field_type;
  END IF;

  INSERT INTO link_corrections_log (post_id, applied_by, content_backup, corrections_applied)
  VALUES (
    _post_id,
    auth.uid(),
    _broken_url,
    jsonb_build_object(
      'action', 'media_reconcile',
      'field_type', _field_type,
      'old_url', _broken_url,
      'new_url', v_new_url,
      'bucket', _bucket,
      'file_path', _new_file_path
    )
  );

  RETURN json_build_object(
    'success', affected > 0,
    'affected', affected,
    'new_url', v_new_url
  );
END;
$$;
