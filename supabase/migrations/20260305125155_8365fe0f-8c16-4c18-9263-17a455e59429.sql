
-- Character relationships table
CREATE TABLE public.character_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_campaign_id UUID NOT NULL REFERENCES public.player_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'amigo',
  entity_type TEXT NOT NULL DEFAULT 'npc', -- 'npc' or 'pc'
  linked_player_campaign_id UUID REFERENCES public.player_campaigns(id) ON DELETE SET NULL,
  appearance TEXT DEFAULT '',
  mannerisms TEXT DEFAULT '',
  motivation TEXT DEFAULT '',
  current_goal TEXT DEFAULT '',
  npc_notes TEXT DEFAULT '',
  avatar_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.character_relationships ENABLE ROW LEVEL SECURITY;

-- RLS policies: owner of the campaign can manage
CREATE POLICY "Owner can select character_relationships"
  ON public.character_relationships FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM player_campaigns pc
    JOIN campaigns c ON c.id = pc.campaign_id
    WHERE pc.id = character_relationships.player_campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can insert character_relationships"
  ON public.character_relationships FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM player_campaigns pc
    JOIN campaigns c ON c.id = pc.campaign_id
    WHERE pc.id = character_relationships.player_campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can update character_relationships"
  ON public.character_relationships FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM player_campaigns pc
    JOIN campaigns c ON c.id = pc.campaign_id
    WHERE pc.id = character_relationships.player_campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can delete character_relationships"
  ON public.character_relationships FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM player_campaigns pc
    JOIN campaigns c ON c.id = pc.campaign_id
    WHERE pc.id = character_relationships.player_campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));
