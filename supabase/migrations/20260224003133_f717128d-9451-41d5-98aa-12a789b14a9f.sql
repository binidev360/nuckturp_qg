-- Fix: Remove overly permissive public SELECT policy on profiles
-- Public profile access is handled by get_public_profile() RPC (SECURITY DEFINER)
-- which already limits returned columns to safe fields only
DROP POLICY IF EXISTS "Anyone can view public profiles by slug" ON public.profiles;