CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_notifications un
    WHERE un.notification_id = notifications.id
      AND un.user_id = auth.uid()
  )
);