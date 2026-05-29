
-- Players CRM table
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  nickname text,
  avatar_url text,
  character_name text,
  species text,
  class text,
  external_sheet_url text,
  email text,
  phone text,
  notes text DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_players_tenant_id ON public.players(tenant_id);

-- RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can select players"
  ON public.players FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can insert players"
  ON public.players FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can update players"
  ON public.players FOR UPDATE
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can delete players"
  ON public.players FOR DELETE
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Junction: player <-> campaign
CREATE TABLE public.player_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  character_name text,
  character_class text,
  character_species text,
  character_sheet_url text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  UNIQUE(player_id, campaign_id)
);

CREATE INDEX idx_player_campaigns_player ON public.player_campaigns(player_id);
CREATE INDEX idx_player_campaigns_campaign ON public.player_campaigns(campaign_id);

ALTER TABLE public.player_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can select player_campaigns"
  ON public.player_campaigns FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.tenant_id = get_user_tenant_id(auth.uid())));

CREATE POLICY "Owner can insert player_campaigns"
  ON public.player_campaigns FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.tenant_id = get_user_tenant_id(auth.uid())));

CREATE POLICY "Owner can update player_campaigns"
  ON public.player_campaigns FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.tenant_id = get_user_tenant_id(auth.uid())));

CREATE POLICY "Owner can delete player_campaigns"
  ON public.player_campaigns FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.tenant_id = get_user_tenant_id(auth.uid())));

-- Updated_at trigger
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
