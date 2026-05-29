
-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  setting TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'finished')),
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign shares table
CREATE TABLE public.campaign_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  shared_with_email TEXT NOT NULL,
  shared_with_user_id UUID,
  permission TEXT NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'editor')),
  share_notes BOOLEAN NOT NULL DEFAULT true,
  share_whiteboard BOOLEAN NOT NULL DEFAULT true,
  share_sessions BOOLEAN NOT NULL DEFAULT true,
  accepted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, shared_with_email)
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_shares ENABLE ROW LEVEL SECURITY;

-- Function to check if user owns campaign (via tenant)
CREATE OR REPLACE FUNCTION public.user_owns_campaign(_user_id UUID, _campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.memberships m ON m.tenant_id = c.tenant_id
    WHERE c.id = _campaign_id AND m.user_id = _user_id
  );
$$;

-- Function to check if user has share access to campaign
CREATE OR REPLACE FUNCTION public.user_has_campaign_access(_user_id UUID, _campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_shares
    WHERE campaign_id = _campaign_id
      AND shared_with_user_id = _user_id
      AND accepted = true
  );
$$;

-- Campaigns RLS policies
CREATE POLICY "Owner can select campaigns"
  ON public.campaigns FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Shared user can select campaigns"
  ON public.campaigns FOR SELECT
  USING (public.user_has_campaign_access(auth.uid(), id));

CREATE POLICY "Owner can insert campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can update campaigns"
  ON public.campaigns FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can delete campaigns"
  ON public.campaigns FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Campaign shares RLS policies
CREATE POLICY "Owner can manage shares"
  ON public.campaign_shares FOR ALL
  USING (public.user_owns_campaign(auth.uid(), campaign_id));

CREATE POLICY "Shared user can view own shares"
  ON public.campaign_shares FOR SELECT
  USING (shared_with_user_id = auth.uid());

CREATE POLICY "Shared user can update own share (accept)"
  ON public.campaign_shares FOR UPDATE
  USING (shared_with_user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_shares_updated_at
  BEFORE UPDATE ON public.campaign_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
