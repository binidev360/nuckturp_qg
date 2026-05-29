
-- Add preferred push hour to profiles (calculated from access patterns)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_push_hour smallint DEFAULT NULL;

-- Create table to track user access hours for smart timing calculation
CREATE TABLE IF NOT EXISTS public.user_access_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  access_hour smallint NOT NULL CHECK (access_hour >= 0 AND access_hour <= 23),
  accessed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_user_access_hours_user_id ON public.user_access_hours (user_id);

-- Enable RLS
ALTER TABLE public.user_access_hours ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own access hours
CREATE POLICY "Users can insert own access hours" ON public.user_access_hours
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own access hours  
CREATE POLICY "Users can read own access hours" ON public.user_access_hours
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Create pending_push_queue for deferred/grouped pushes
CREATE TABLE IF NOT EXISTS public.pending_push_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  url text DEFAULT '/dashboard',
  image_url text,
  scheduled_for timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'grouped')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for the push queue
CREATE INDEX IF NOT EXISTS idx_pending_push_queue_user_status ON public.pending_push_queue (user_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_push_queue_scheduled ON public.pending_push_queue (scheduled_for) WHERE status = 'pending';

-- Enable RLS (admin-only via service role)
ALTER TABLE public.pending_push_queue ENABLE ROW LEVEL SECURITY;

-- Function to calculate and update preferred push hour for a user
CREATE OR REPLACE FUNCTION public.update_preferred_push_hour(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_median_hour smallint;
BEGIN
  -- Calculate median of last 30 access hours, excluding quiet hours (23-7)
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY access_hour)::smallint
  INTO v_median_hour
  FROM (
    SELECT access_hour
    FROM public.user_access_hours
    WHERE user_id = _user_id
      AND access_hour >= 7 AND access_hour <= 22
    ORDER BY accessed_at DESC
    LIMIT 30
  ) recent;

  -- Only update if we have enough data (at least 5 entries)
  IF v_median_hour IS NOT NULL AND (
    SELECT count(*) FROM public.user_access_hours
    WHERE user_id = _user_id AND access_hour >= 7 AND access_hour <= 22
  ) >= 5 THEN
    UPDATE public.profiles SET preferred_push_hour = v_median_hour WHERE user_id = _user_id;
  END IF;
END;
$$;
