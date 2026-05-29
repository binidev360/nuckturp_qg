
-- Fix infinite recursion between notes and note_shares RLS policies

-- 1. Drop the problematic note_shares policy that queries notes table
DROP POLICY IF EXISTS "Note owner can manage shares" ON public.note_shares;

-- 2. Replace with a policy that uses shared_by = auth.uid() (no cross-table query)
CREATE POLICY "Note owner can manage shares"
  ON public.note_shares FOR ALL
  USING (shared_by = auth.uid())
  WITH CHECK (shared_by = auth.uid());

-- 3. Fix the notes policies that have the bug ns.note_id = ns.id (should reference notes.id)
DROP POLICY IF EXISTS "Shared user can select shared notes" ON public.notes;
DROP POLICY IF EXISTS "Shared editor can update shared notes" ON public.notes;

-- 4. Recreate with correct reference using notes.id
CREATE POLICY "Shared user can select shared notes"
  ON public.notes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.note_shares ns
    WHERE ns.note_id = notes.id AND ns.shared_with_user_id = auth.uid() AND ns.accepted = true
  ));

CREATE POLICY "Shared editor can update shared notes"
  ON public.notes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.note_shares ns
    WHERE ns.note_id = notes.id AND ns.shared_with_user_id = auth.uid() AND ns.accepted = true AND ns.permission = 'editor'
  ));
