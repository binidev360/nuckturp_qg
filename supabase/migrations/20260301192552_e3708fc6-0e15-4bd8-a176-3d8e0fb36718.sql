ALTER TABLE public.sessions
  ADD COLUMN estimated_duration_min integer DEFAULT NULL,
  ADD COLUMN actual_duration_min integer DEFAULT NULL;