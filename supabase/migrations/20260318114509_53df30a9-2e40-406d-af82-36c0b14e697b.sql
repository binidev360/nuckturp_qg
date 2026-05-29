-- RPC para resumo de storage por categoria, substituindo listRecursive (21.5s → <1s)
-- Consulta storage.objects diretamente via SQL com pattern matching
CREATE OR REPLACE FUNCTION public.admin_storage_usage_summary()
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

  SELECT json_build_object(
    'categories', (
      SELECT json_object_agg(category, json_build_object('count', cnt, 'size', total_size, 'label', label))
      FROM (
        SELECT
          CASE
            WHEN bucket_id = 'blog-assets' AND name LIKE 'notifications/%' THEN 'notificacoes'
            WHEN bucket_id = 'blog-assets' THEN 'blog'
            WHEN name LIKE '%/avatar/%' OR name LIKE '%/banner/%' THEN 'perfil'
            WHEN name LIKE '%/editor/%' OR name LIKE '%/covers/%' THEN 'conteudo'
            WHEN name LIKE '%/whiteboard/%' THEN 'whiteboard'
            WHEN name LIKE '%/players/%' THEN 'jogadores'
            ELSE 'outros'
          END AS category,
          CASE
            WHEN bucket_id = 'blog-assets' AND name LIKE 'notifications/%' THEN 'Notificações'
            WHEN bucket_id = 'blog-assets' THEN 'Blog (capas, conteúdo, OG)'
            WHEN name LIKE '%/avatar/%' OR name LIKE '%/banner/%' THEN 'Perfil (avatar + banner)'
            WHEN name LIKE '%/editor/%' OR name LIKE '%/covers/%' THEN 'Conteúdo (notas, sessões, campanhas)'
            WHEN name LIKE '%/whiteboard/%' THEN 'Whiteboard'
            WHEN name LIKE '%/players/%' THEN 'Jogadores (avatares)'
            ELSE 'Outros'
          END AS label,
          count(*)::int AS cnt,
          COALESCE(sum((metadata->>'size')::bigint), 0)::bigint AS total_size
        FROM storage.objects
        WHERE bucket_id IN ('profile-assets', 'blog-assets')
          AND (metadata->>'size')::bigint > 0
        GROUP BY category, label
      ) cats
    ),
    'total_size', (
      SELECT COALESCE(sum((metadata->>'size')::bigint), 0)::bigint
      FROM storage.objects
      WHERE bucket_id IN ('profile-assets', 'blog-assets')
    ),
    'total_count', (
      SELECT count(*)::int
      FROM storage.objects
      WHERE bucket_id IN ('profile-assets', 'blog-assets')
        AND (metadata->>'size')::bigint > 0
    )
  ) INTO result;

  RETURN result;
END;
$function$;