
-- =============================================================
-- Reengagement email tracking table
-- Prevents duplicate sends by logging each (user_id, email_type) pair.
-- A unique constraint ensures we never send the same reengagement
-- email twice to the same user. The "sent_at" timestamp allows
-- future analysis of reengagement effectiveness.
-- =============================================================
CREATE TABLE public.reengagement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email_type text NOT NULL,  -- '15d_inactive' or '30d_inactive'
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_type)
);

-- RLS: only service_role inserts (via edge function), no user access needed
ALTER TABLE public.reengagement_logs ENABLE ROW LEVEL SECURITY;

-- Admin read-only policy for monitoring
CREATE POLICY "Admins can view reengagement logs"
  ON public.reengagement_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
