
DROP FUNCTION public.get_my_share_invites();

CREATE FUNCTION public.get_my_share_invites()
 RETURNS TABLE(id uuid, note_id uuid, note_title text, sharer_name text, sharer_avatar text, permission text, accepted boolean, created_at timestamp with time zone, shared_by uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    ns.id, ns.note_id, n.title as note_title,
    p.display_name as sharer_name, p.avatar_url as sharer_avatar,
    ns.permission, ns.accepted, ns.created_at, ns.shared_by
  FROM note_shares ns
  JOIN notes n ON n.id = ns.note_id
  JOIN memberships m ON m.tenant_id = n.tenant_id
  JOIN profiles p ON p.user_id = m.user_id
  WHERE ns.shared_with_email = (auth.jwt() ->> 'email')
  ORDER BY ns.created_at DESC;
$function$;
