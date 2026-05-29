CREATE POLICY "Users can delete own notifications"
ON public.user_notifications
FOR DELETE
USING (user_id = auth.uid());