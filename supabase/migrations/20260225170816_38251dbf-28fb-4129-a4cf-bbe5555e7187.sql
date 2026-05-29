
-- Notifications table (admin creates these)
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, alert, update, promo
  target_audience TEXT NOT NULL DEFAULT 'all', -- all, free, premium, premium_override, tag
  target_tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, published
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User notifications (delivery records per user)
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Notifications: only admins can manage
CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- User notifications: users can read their own
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update own (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can insert user_notifications (via service role, but also RLS policy)
CREATE POLICY "Admins can manage user notifications"
  ON public.user_notifications FOR ALL
  USING (is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_read_at ON public.user_notifications(user_id, read_at);
CREATE INDEX idx_notifications_status ON public.notifications(status);
