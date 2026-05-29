
-- Create SECURITY DEFINER function to submit feedback responses
-- This bypasses RLS for anonymous users submitting via the public form
CREATE OR REPLACE FUNCTION public.submit_feedback_response(
  _config_id uuid,
  _email text,
  _nps_score integer,
  _liked_chips text[] DEFAULT '{}',
  _liked_detail text DEFAULT NULL,
  _improve_chips text[] DEFAULT '{}',
  _improve_detail text DEFAULT NULL,
  _highlight text DEFAULT NULL,
  _custom_answers jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config_active boolean;
  v_already_exists boolean;
  v_response_id uuid;
BEGIN
  -- Check config exists and is active
  SELECT active INTO v_config_active
  FROM session_feedback_configs
  WHERE id = _config_id;
  
  IF v_config_active IS NULL THEN
    RAISE EXCEPTION 'Feedback form not found';
  END IF;
  
  IF NOT v_config_active THEN
    RAISE EXCEPTION 'Feedback form is no longer active';
  END IF;
  
  -- Check for duplicate email
  SELECT EXISTS (
    SELECT 1 FROM session_feedback_responses
    WHERE config_id = _config_id AND email = lower(trim(_email))
  ) INTO v_already_exists;
  
  IF v_already_exists THEN
    RAISE EXCEPTION 'already_responded';
  END IF;
  
  -- Validate NPS score
  IF _nps_score < 0 OR _nps_score > 10 THEN
    RAISE EXCEPTION 'Invalid NPS score';
  END IF;
  
  -- Insert response
  INSERT INTO session_feedback_responses (
    config_id, email, nps_score, liked_chips, liked_detail,
    improve_chips, improve_detail, highlight, custom_answers
  ) VALUES (
    _config_id, lower(trim(_email)), _nps_score, _liked_chips, _liked_detail,
    _improve_chips, _improve_detail, _highlight, _custom_answers
  )
  RETURNING id INTO v_response_id;
  
  RETURN v_response_id;
END;
$$;
