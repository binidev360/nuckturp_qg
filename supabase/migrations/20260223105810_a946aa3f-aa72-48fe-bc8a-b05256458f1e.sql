
-- Fix: Prevent users from setting is_admin on their own profile
-- Replace the existing permissive update policy with one that blocks is_admin changes

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new update policy that prevents is_admin self-escalation
-- Users can update their own profile, but is_admin must remain unchanged
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid())
);
