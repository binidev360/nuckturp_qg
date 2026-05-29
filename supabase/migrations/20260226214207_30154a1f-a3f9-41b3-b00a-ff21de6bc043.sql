
-- Table to store share feedback events (accepted/rejected/left)
CREATE TABLE public.share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  note_title text NOT NULL,
  actor_email text NOT NULL,
  actor_name text,
  actor_avatar text,
  recipient_user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('accepted', 'rejected', 'left')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

-- Recipient (the sharer) can view their events
CREATE POLICY "Recipient can view share events"
  ON public.share_events FOR SELECT
  USING (recipient_user_id = auth.uid());

-- Recipient can update (mark as read)
CREATE POLICY "Recipient can update share events"
  ON public.share_events FOR UPDATE
  USING (recipient_user_id = auth.uid());

-- Authenticated users can insert share events
CREATE POLICY "Authenticated users can insert share events"
  ON public.share_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Recipient can delete their events
CREATE POLICY "Recipient can delete share events"
  ON public.share_events FOR DELETE
  USING (recipient_user_id = auth.uid());
