
DROP FUNCTION IF EXISTS public.get_public_note(text);

CREATE FUNCTION public.get_public_note(_token text)
RETURNS TABLE(
  id uuid,
  title text,
  content text,
  type text,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz,
  owner_display_name text,
  owner_avatar_url text,
  owner_nickname text,
  owner_slug text,
  cover_url text,
  cover_position integer
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT
    n.id,
    n.title,
    n.content,
    n.type,
    n.tags,
    n.created_at,
    n.updated_at,
    p.display_name AS owner_display_name,
    p.avatar_url    AS owner_avatar_url,
    p.nickname      AS owner_nickname,
    p.slug          AS owner_slug,
    n.cover_url,
    n.cover_position
  FROM notes n
  JOIN tenants t ON t.id = n.tenant_id
  JOIN profiles p ON p.user_id = t.owner_id
  WHERE n.public_token = _token
    AND n.is_public = true;
$$;
