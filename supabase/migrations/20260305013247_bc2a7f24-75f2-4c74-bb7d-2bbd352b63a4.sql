
-- 1. Session presence tracking table
CREATE TABLE public.session_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  player_campaign_id uuid NOT NULL REFERENCES public.player_campaigns(id) ON DELETE CASCADE,
  present boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, player_campaign_id)
);

ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;

-- RLS: owner via session tenant
CREATE POLICY "Owner can select session_players" ON public.session_players
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sessions s WHERE s.id = session_players.session_id AND s.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can insert session_players" ON public.session_players
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sessions s WHERE s.id = session_players.session_id AND s.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can update session_players" ON public.session_players
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sessions s WHERE s.id = session_players.session_id AND s.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can delete session_players" ON public.session_players
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sessions s WHERE s.id = session_players.session_id AND s.tenant_id = get_user_tenant_id(auth.uid())
  ));

-- Performance index
CREATE INDEX idx_session_players_session_id ON public.session_players(session_id);
CREATE INDEX idx_session_players_player_campaign_id ON public.session_players(player_campaign_id);

-- 2. Migrate JSONB players data to relational tables
DO $$
DECLARE
  camp RECORD;
  player_item JSONB;
  new_player_id UUID;
  existing_player_id UUID;
BEGIN
  FOR camp IN
    SELECT id, tenant_id, players FROM public.campaigns WHERE jsonb_array_length(players) > 0
  LOOP
    FOR player_item IN SELECT * FROM jsonb_array_elements(camp.players)
    LOOP
      -- Check if player already exists with same name in same tenant
      SELECT id INTO existing_player_id
      FROM public.players
      WHERE tenant_id = camp.tenant_id AND name = player_item->>'name'
      LIMIT 1;

      IF existing_player_id IS NULL THEN
        INSERT INTO public.players (tenant_id, name, avatar_url, notes)
        VALUES (
          camp.tenant_id,
          player_item->>'name',
          player_item->>'avatar_url',
          ''
        )
        RETURNING id INTO new_player_id;
      ELSE
        new_player_id := existing_player_id;
      END IF;

      -- Link to campaign (skip if already linked)
      INSERT INTO public.player_campaigns (player_id, campaign_id, character_name, character_class, character_species)
      VALUES (
        new_player_id,
        camp.id,
        NULLIF(player_item->>'character', ''),
        NULLIF(player_item->>'class', ''),
        NULLIF(player_item->>'species', '')
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
