CREATE POLICY "Admins can view push subscriptions"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));