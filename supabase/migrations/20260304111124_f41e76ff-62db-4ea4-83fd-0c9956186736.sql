
-- Conditional notifications table
CREATE TABLE public.conditional_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  body text NOT NULL,
  template text NOT NULL DEFAULT 'push',
  trigger_condition text NOT NULL,
  target_audience text[] NOT NULL DEFAULT '{all}',
  delay_value integer NOT NULL DEFAULT 0,
  delay_unit text NOT NULL DEFAULT 'hour',
  active boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conditional_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can manage
CREATE POLICY "Admins can manage conditional notifications"
  ON public.conditional_notifications FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Conditional notification logs
CREATE TABLE public.conditional_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conditional_notification_id uuid NOT NULL REFERENCES public.conditional_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.conditional_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage conditional notification logs"
  ON public.conditional_notification_logs FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
