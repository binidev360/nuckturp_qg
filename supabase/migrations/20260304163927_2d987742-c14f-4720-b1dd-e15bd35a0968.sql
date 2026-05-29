-- Remove the overly permissive public notes SELECT policy
-- Public notes are accessed ONLY via get_public_note() RPC with SECURITY DEFINER
DROP POLICY IF EXISTS "Anyone can read public notes" ON public.notes;