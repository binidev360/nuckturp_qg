
-- Add is_admin column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Create a helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = _user_id LIMIT 1),
    false
  );
$$;

-- Create admin stats function to get platform metrics
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT json_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_campaigns', (SELECT count(*) FROM public.campaigns),
    'total_adventures', (SELECT count(*) FROM public.adventures),
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
$$;

-- Create admin function to list users with stats
CREATE OR REPLACE FUNCTION public.admin_list_users(
  _search text DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT json_agg(row_to_json(t)) INTO result FROM (
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
      (SELECT count(*) FROM public.campaigns c JOIN public.memberships m ON m.tenant_id = c.tenant_id WHERE m.user_id = p.user_id) as campaign_count,
      (SELECT count(*) FROM public.adventures a JOIN public.memberships m ON m.tenant_id = a.tenant_id WHERE m.user_id = p.user_id) as adventure_count,
      (SELECT count(*) FROM public.sessions s JOIN public.memberships m ON m.tenant_id = s.tenant_id WHERE m.user_id = p.user_id) as session_count,
      (SELECT count(*) FROM public.notes n JOIN public.memberships m ON m.tenant_id = n.tenant_id WHERE m.user_id = p.user_id) as note_count,
      (SELECT count(*) FROM public.whiteboards w JOIN public.memberships m ON m.tenant_id = w.tenant_id WHERE m.user_id = p.user_id) as whiteboard_count
    FROM public.profiles p
    WHERE (_search IS NULL OR p.display_name ILIKE '%' || _search || '%' OR p.nickname ILIKE '%' || _search || '%')
    ORDER BY p.created_at DESC
    LIMIT _limit OFFSET _offset
  ) t;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;
