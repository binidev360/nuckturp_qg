
-- Table to track PWA install and active session events
CREATE TABLE public.pwa_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'active_session', -- 'install' or 'active_session'
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pwa_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own events
CREATE POLICY "Users can insert own pwa events"
  ON public.pwa_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all events
CREATE POLICY "Admins can view all pwa events"
  ON public.pwa_events FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Index for fast admin queries
CREATE INDEX idx_pwa_events_type_created ON public.pwa_events (event_type, created_at DESC);
CREATE INDEX idx_pwa_events_user_id ON public.pwa_events (user_id);
