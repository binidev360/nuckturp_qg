
-- RPCs for view event tracking
CREATE OR REPLACE FUNCTION public.count_feedback_views(_config_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM feedback_view_events WHERE config_id = _config_id;
$$;

CREATE OR REPLACE FUNCTION public.record_feedback_view(_config_id uuid, _user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO feedback_view_events (config_id, user_agent)
  VALUES (_config_id, _user_agent);
END;
$$;

-- Add reward_type column
ALTER TABLE public.session_feedback_configs
  ADD COLUMN IF NOT EXISTS reward_type text DEFAULT 'url';

-- Storage bucket for feedback rewards
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-rewards', 'feedback-rewards', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users upload feedback rewards"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'feedback-rewards' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Auth users update own feedback rewards"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'feedback-rewards' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Auth users delete own feedback rewards"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'feedback-rewards' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view feedback rewards"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'feedback-rewards');
