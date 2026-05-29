-- Fix admin_platform_stats to remove adventures reference
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
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
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_campaigns', (SELECT count(*) FROM public.campaigns),
    'total_sessions', (SELECT count(*) FROM public.sessions),
    'total_notes', (SELECT count(*) FROM public.notes),
    'total_whiteboards', (SELECT count(*) FROM public.whiteboards),
    'total_whiteboard_items', (SELECT count(*) FROM public.whiteboard_items),
    'total_folders', (SELECT count(*) FROM public.folders),
    'active_campaigns', (SELECT count(*) FROM public.campaigns WHERE status = 'active'),
    'users_last_7d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'users_last_30d', (SELECT count(*) FROM public.profiles WHERE created_at > now() - interval '30 days'),
    'campaigns_last_30d', (SELECT count(*) FROM public.campaigns WHERE created_at > now() - interval '30 days'),
    'notes_last_30d', (SELECT count(*) FROM public.notes WHERE created_at > now() - interval '30 days'),
    'sessions_last_30d', (SELECT count(*) FROM public.sessions WHERE created_at > now() - interval '30 days')
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- Fix admin_list_users to remove adventures reference
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL::text, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  FROM (
    SELECT
      p.user_id,
      p.display_name,
      p.nickname,
      p.slug,
      p.avatar_url,
      p.is_admin,
      p.created_at,
      p.updated_at,
      p.onboarding_completed,
      p.experience_level,
      p.session_frequency,
      COALESCE(p.tags, '{}') as tags,
      (SELECT count(*) FROM campaigns c JOIN memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) as campaign_count,
      (SELECT count(*) FROM sessions s JOIN memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) as session_count,
      (SELECT count(*) FROM notes n JOIN memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) as note_count,
      (SELECT count(*) FROM whiteboards w JOIN memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) as whiteboard_count
    FROM profiles p
    WHERE (_search IS NULL OR p.display_name ILIKE '%' || _search || '%' OR p.nickname ILIKE '%' || _search || '%')
    ORDER BY p.created_at DESC
    LIMIT _limit OFFSET _offset
  ) t;
$function$;
