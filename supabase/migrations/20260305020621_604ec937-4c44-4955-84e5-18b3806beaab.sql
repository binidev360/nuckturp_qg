
-- Make player_id nullable so characters can exist without a player (one-shots)
ALTER TABLE public.player_campaigns ALTER COLUMN player_id DROP NOT NULL;

-- Add backstory field for character backstory (written by player usually)
ALTER TABLE public.player_campaigns ADD COLUMN backstory text DEFAULT '';

-- Add session_id to allow session-specific character notes  
-- We'll use a separate table for session-linked character notes
CREATE TABLE public.character_session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_campaign_id uuid NOT NULL REFERENCES public.player_campaigns(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_campaign_id, session_id)
);

-- Enable RLS
ALTER TABLE public.character_session_notes ENABLE ROW LEVEL SECURITY;

-- RLS: Owner can manage via session tenant
CREATE POLICY "Owner can select character_session_notes" ON public.character_session_notes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions s WHERE s.id = character_session_notes.session_id AND s.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can insert character_session_notes" ON public.character_session_notes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM sessions s WHERE s.id = character_session_notes.session_id AND s.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can update character_session_notes" ON public.character_session_notes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions s WHERE s.id = character_session_notes.session_id AND s.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can delete character_session_notes" ON public.character_session_notes
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions s WHERE s.id = character_session_notes.session_id AND s.tenant_id = get_user_tenant_id(auth.uid())
  ));
