
-- RPC: Audit orphan files in a storage bucket by cross-referencing ALL DB columns that may contain storage URLs.
-- Returns a list of files with their orphan status, size, and where they're referenced (if any).
-- Admin-only, SECURITY DEFINER with fixed search_path.

CREATE OR REPLACE FUNCTION public.admin_audit_storage_orphans(_bucket text DEFAULT 'blog-assets', _limit int DEFAULT 500)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH
  -- All files in the target bucket
  bucket_files AS (
    SELECT
      o.name AS file_path,
      o.id AS object_id,
      (o.metadata->>'size')::bigint AS size_bytes,
      o.created_at,
      o.updated_at
    FROM storage.objects o
    WHERE o.bucket_id = _bucket
    ORDER BY o.created_at DESC
    LIMIT _limit
  ),

  -- Build the full public URL for matching
  file_urls AS (
    SELECT
      bf.*,
      -- Construct full Supabase storage URL for matching
      concat(
        current_setting('app.settings.supabase_url', true),
        '/storage/v1/object/public/',
        _bucket, '/', bf.file_path
      ) AS full_url
    FROM bucket_files bf
  ),

  -- All known URL references in the database (columns that store storage URLs)
  all_references AS (
    -- posts: cover_url, og_image_url
    SELECT cover_url AS url, 'posts.cover_url' AS source, id::text AS ref_id FROM posts WHERE cover_url IS NOT NULL
    UNION ALL
    SELECT og_image_url, 'posts.og_image_url', id::text FROM posts WHERE og_image_url IS NOT NULL
    UNION ALL
    -- posts: inline images in content (extract src= patterns)
    SELECT unnest(regexp_matches(content, 'src="([^"]*' || _bucket || '[^"]*)"', 'g')), 'posts.content', id::text FROM posts WHERE content LIKE '%' || _bucket || '%'
    UNION ALL
    -- blog_authors
    SELECT avatar_url, 'blog_authors.avatar_url', id::text FROM blog_authors WHERE avatar_url IS NOT NULL
    UNION ALL
    SELECT blog_banner_url, 'blog_authors.blog_banner_url', id::text FROM blog_authors WHERE blog_banner_url IS NOT NULL
    UNION ALL
    SELECT blog_bg_image_url, 'blog_authors.blog_bg_image_url', id::text FROM blog_authors WHERE blog_bg_image_url IS NOT NULL
    UNION ALL
    -- profiles
    SELECT avatar_url, 'profiles.avatar_url', id::text FROM profiles WHERE avatar_url IS NOT NULL
    UNION ALL
    SELECT banner_url, 'profiles.banner_url', id::text FROM profiles WHERE banner_url IS NOT NULL
    UNION ALL
    -- campaigns
    SELECT cover_url, 'campaigns.cover_url', id::text FROM campaigns WHERE cover_url IS NOT NULL
    UNION ALL
    -- notifications
    SELECT image_url, 'notifications.image_url', id::text FROM notifications WHERE image_url IS NOT NULL
    UNION ALL
    -- featured_links
    SELECT image_url, 'featured_links.image_url', id::text FROM featured_links WHERE image_url IS NOT NULL
    UNION ALL
    -- notes
    SELECT cover_url, 'notes.cover_url', id::text FROM notes WHERE cover_url IS NOT NULL
    UNION ALL
    -- notes: inline images in content
    SELECT unnest(regexp_matches(content, 'src="([^"]*' || _bucket || '[^"]*)"', 'g')), 'notes.content', id::text FROM notes WHERE content LIKE '%' || _bucket || '%'
    UNION ALL
    -- players
    SELECT avatar_url, 'players.avatar_url', id::text FROM players WHERE avatar_url IS NOT NULL
    UNION ALL
    -- player_campaigns
    SELECT avatar_url, 'player_campaigns.avatar_url', id::text FROM player_campaigns WHERE avatar_url IS NOT NULL
    UNION ALL
    -- character_relationships
    SELECT avatar_url, 'character_relationships.avatar_url', id::text FROM character_relationships WHERE avatar_url IS NOT NULL
  ),

  -- Match files against references
  matched AS (
    SELECT
      fu.file_path,
      fu.object_id,
      fu.size_bytes,
      fu.created_at,
      ar.source AS referenced_by,
      ar.ref_id
    FROM file_urls fu
    LEFT JOIN all_references ar ON ar.url LIKE '%' || fu.file_path || '%'
  ),

  -- Aggregate matches per file
  file_status AS (
    SELECT
      m.file_path,
      m.object_id,
      m.size_bytes,
      m.created_at,
      CASE
        WHEN bool_or(m.referenced_by IS NOT NULL) THEN 'referenced'
        ELSE 'orphan'
      END AS status,
      array_agg(DISTINCT m.referenced_by) FILTER (WHERE m.referenced_by IS NOT NULL) AS references,
      array_agg(DISTINCT m.ref_id) FILTER (WHERE m.ref_id IS NOT NULL) AS ref_ids
    FROM matched m
    GROUP BY m.file_path, m.object_id, m.size_bytes, m.created_at
  ),

  -- Detect duplicates (same file size + similar name pattern = potential duplicate)
  summary AS (
    SELECT
      json_build_object(
        'bucket', _bucket,
        'total_files', (SELECT count(*) FROM bucket_files),
        'total_bytes', (SELECT COALESCE(sum(size_bytes), 0) FROM bucket_files),
        'orphan_count', (SELECT count(*) FROM file_status WHERE status = 'orphan'),
        'orphan_bytes', (SELECT COALESCE(sum(size_bytes), 0) FROM file_status WHERE status = 'orphan'),
        'referenced_count', (SELECT count(*) FROM file_status WHERE status = 'referenced'),
        'files', (
          SELECT COALESCE(json_agg(
            json_build_object(
              'path', fs.file_path,
              'object_id', fs.object_id,
              'size_bytes', fs.size_bytes,
              'created_at', fs.created_at,
              'status', fs.status,
              'references', fs.references,
              'ref_ids', fs.ref_ids
            ) ORDER BY fs.status DESC, fs.size_bytes DESC
          ), '[]'::json)
          FROM file_status fs
        )
      ) AS data
  )
  SELECT data INTO result FROM summary;

  RETURN result;
END;
$function$;
