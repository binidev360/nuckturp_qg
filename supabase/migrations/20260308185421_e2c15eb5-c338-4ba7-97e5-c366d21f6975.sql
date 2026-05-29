
-- Bug #16: Fix DELETE policy on post_reactions to filter by session_id
-- Drop the insecure policy that allows anyone to delete any reaction
DROP POLICY IF EXISTS "Anyone can delete own reactions" ON public.post_reactions;

-- Create a secure policy that checks session_id (passed via RPC or client filter)
-- Since session_id is client-side and anonymous, we keep open delete but the client
-- already filters by session_id. The real fix is ensuring the policy exists properly.
-- However, since we can't verify session_id server-side (no auth), we keep it open
-- but add a comment. The actual protection is at the app level.
-- Better approach: require matching session_id in a security definer function.

CREATE OR REPLACE FUNCTION public.delete_own_reaction(_post_id uuid, _session_id text, _emoji text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.post_reactions
  WHERE post_id = _post_id
    AND session_id = _session_id
    AND emoji = _emoji;
END;
$$;

-- Remove open DELETE, add no-op restrictive policy (all deletes go through RPC)
CREATE POLICY "No direct deletes on reactions"
ON public.post_reactions
FOR DELETE
USING (false);

-- Also create RPC for inserting reactions (rate-limit friendly)
CREATE OR REPLACE FUNCTION public.toggle_reaction(_post_id uuid, _session_id text, _emoji text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.post_reactions
    WHERE post_id = _post_id AND session_id = _session_id AND emoji = _emoji
  ) THEN
    DELETE FROM public.post_reactions
    WHERE post_id = _post_id AND session_id = _session_id AND emoji = _emoji;
  ELSE
    INSERT INTO public.post_reactions (post_id, session_id, emoji)
    VALUES (_post_id, _session_id, _emoji);
  END IF;
END;
$$;
