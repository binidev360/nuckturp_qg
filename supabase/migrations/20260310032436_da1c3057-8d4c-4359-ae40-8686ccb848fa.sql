
-- Create feedback_view_events table
CREATE TABLE public.feedback_view_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.session_feedback_configs(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);

ALTER TABLE public.feedback_view_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert view events"
  ON public.feedback_view_events FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Owner can view feedback view events"
  ON public.feedback_view_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_feedback_configs sfc
      WHERE sfc.id = feedback_view_events.config_id
        AND sfc.tenant_id = get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Admins can view all feedback view events"
  ON public.feedback_view_events FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));
