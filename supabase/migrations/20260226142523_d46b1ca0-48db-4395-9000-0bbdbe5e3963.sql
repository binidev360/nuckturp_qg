
-- 1. RLS policies for recipients on note_shares
-- Allow recipients to view shares addressed to them
CREATE POLICY "Recipient can view own shares"
  ON public.note_shares FOR SELECT
  USING (shared_with_email = (auth.jwt() ->> 'email'));

-- Allow recipients to update their own shares (accept)
CREATE POLICY "Recipient can update own shares"
  ON public.note_shares FOR UPDATE
  USING (shared_with_email = (auth.jwt() ->> 'email'));

-- Allow recipients to delete their own shares (reject)
CREATE POLICY "Recipient can delete own shares"
  ON public.note_shares FOR DELETE
  USING (shared_with_email = (auth.jwt() ->> 'email'));

-- 2. DB function to get share invites with note title and sharer info
CREATE OR REPLACE FUNCTION public.get_my_share_invites()
RETURNS TABLE(
  id uuid, note_id uuid, note_title text,
  sharer_name text, sharer_avatar text,
  permission text, accepted boolean, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT 
    ns.id, ns.note_id, n.title as note_title,
    p.display_name as sharer_name, p.avatar_url as sharer_avatar,
    ns.permission, ns.accepted, ns.created_at
  FROM note_shares ns
  JOIN notes n ON n.id = ns.note_id
  JOIN memberships m ON m.tenant_id = n.tenant_id
  JOIN profiles p ON p.user_id = m.user_id
  WHERE ns.shared_with_email = (auth.jwt() ->> 'email')
  ORDER BY ns.created_at DESC;
$$;
