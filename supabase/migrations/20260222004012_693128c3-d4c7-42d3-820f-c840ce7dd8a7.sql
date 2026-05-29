
ALTER TABLE public.profiles
  ADD COLUMN experience_level TEXT,
  ADD COLUMN session_frequency TEXT,
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
