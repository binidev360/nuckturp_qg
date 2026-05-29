
-- 1. Create note_shares table
CREATE TABLE public.note_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  shared_with_email text NOT NULL,
  shared_with_user_id uuid,
  permission text NOT NULL DEFAULT 'viewer',
  accepted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Add public_token to notes for public sharing
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS public_token text UNIQUE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- 3. Enable RLS
ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;

-- 4. RLS: Note owner can manage shares
CREATE POLICY "Note owner can manage shares"
  ON public.note_shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_id AND n.tenant_id = get_user_tenant_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_id AND n.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

-- 5. RLS: Shared user can view own shares
CREATE POLICY "Shared user can view own note shares"
  ON public.note_shares FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- 6. RLS: Shared user can update own share (accept)
CREATE POLICY "Shared user can update own note share"
  ON public.note_shares FOR UPDATE
  USING (shared_with_user_id = auth.uid());

-- 7. RLS on notes: shared users can SELECT notes shared with them
CREATE POLICY "Shared user can select shared notes"
  ON public.notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.note_shares ns
      WHERE ns.note_id = id AND ns.shared_with_user_id = auth.uid() AND ns.accepted = true
    )
  );

-- 8. RLS on notes: shared users with editor permission can UPDATE
CREATE POLICY "Shared editor can update shared notes"
  ON public.notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.note_shares ns
      WHERE ns.note_id = id AND ns.shared_with_user_id = auth.uid() AND ns.accepted = true AND ns.permission = 'editor'
    )
  );

-- 9. RLS: Anyone can read public notes via token (for public page)
CREATE POLICY "Anyone can read public notes"
  ON public.notes FOR SELECT
  USING (is_public = true AND public_token IS NOT NULL);

-- 10. Helper function to check if user has note share access
CREATE OR REPLACE FUNCTION public.user_has_note_access(_user_id uuid, _note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.note_shares
    WHERE note_id = _note_id
      AND shared_with_user_id = _user_id
      AND accepted = true
  );
$$;

-- 11. Function to get public note by token
CREATE OR REPLACE FUNCTION public.get_public_note(_token text)
RETURNS TABLE(
  id uuid, title text, content text, type text, tags text[],
  created_at timestamptz, updated_at timestamptz,
  owner_display_name text, owner_avatar_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    n.id, n.title, n.content, n.type, n.tags,
    n.created_at, n.updated_at,
    p.display_name as owner_display_name,
    p.avatar_url as owner_avatar_url
  FROM notes n
  JOIN memberships m ON m.tenant_id = n.tenant_id
  JOIN profiles p ON p.user_id = m.user_id
  WHERE n.public_token = _token 
    AND n.is_public = true
  LIMIT 1;
$$;

-- 12. Enable realtime for note_shares
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_shares;
