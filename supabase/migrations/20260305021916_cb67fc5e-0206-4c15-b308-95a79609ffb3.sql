
-- Add tags and worldcraft_url to player_campaigns
ALTER TABLE public.player_campaigns
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS worldcraft_url text;

-- Create character_inventory table for items, weapons, spells
CREATE TABLE public.character_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_campaign_id uuid NOT NULL REFERENCES public.player_campaigns(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'item', -- 'item', 'weapon', 'spell'
  name text NOT NULL,
  description text DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_inventory ENABLE ROW LEVEL SECURITY;

-- RLS: owner can manage inventory via campaign ownership
CREATE POLICY "Owner can select character_inventory"
  ON public.character_inventory FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.player_campaigns pc
    JOIN public.campaigns c ON c.id = pc.campaign_id
    WHERE pc.id = character_inventory.player_campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can insert character_inventory"
  ON public.character_inventory FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.player_campaigns pc
    JOIN public.campaigns c ON c.id = pc.campaign_id
    WHERE pc.id = character_inventory.player_campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can update character_inventory"
  ON public.character_inventory FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.player_campaigns pc
    JOIN public.campaigns c ON c.id = pc.campaign_id
    WHERE pc.id = character_inventory.player_campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can delete character_inventory"
  ON public.character_inventory FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.player_campaigns pc
    JOIN public.campaigns c ON c.id = pc.campaign_id
    WHERE pc.id = character_inventory.player_campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

-- Fix RLS for player_campaigns to support characters without players
-- Drop old policies that require player_id to exist
DROP POLICY IF EXISTS "Owner can select player_campaigns" ON public.player_campaigns;
DROP POLICY IF EXISTS "Owner can insert player_campaigns" ON public.player_campaigns;
DROP POLICY IF EXISTS "Owner can update player_campaigns" ON public.player_campaigns;
DROP POLICY IF EXISTS "Owner can delete player_campaigns" ON public.player_campaigns;

-- New policies based on campaign ownership (works for playerless characters)
CREATE POLICY "Owner can select player_campaigns"
  ON public.player_campaigns FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = player_campaigns.campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can insert player_campaigns"
  ON public.player_campaigns FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = player_campaigns.campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can update player_campaigns"
  ON public.player_campaigns FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = player_campaigns.campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

CREATE POLICY "Owner can delete player_campaigns"
  ON public.player_campaigns FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = player_campaigns.campaign_id
      AND c.tenant_id = get_user_tenant_id(auth.uid())
  ));

-- Drop unique constraint on character_session_notes to allow multiple notes per session
ALTER TABLE public.character_session_notes DROP CONSTRAINT IF EXISTS character_session_notes_player_campaign_id_session_id_key;
