
-- Notes table for Diário do Mestre
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'quick' CHECK (type IN ('quick', 'campaign', 'session', 'npc', 'learning')),
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can select notes"
  ON public.notes FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Shared user can select campaign notes"
  ON public.notes FOR SELECT
  USING (campaign_id IS NOT NULL AND public.user_has_campaign_access(auth.uid(), campaign_id));

CREATE POLICY "Owner can insert notes"
  ON public.notes FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can update notes"
  ON public.notes FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can delete notes"
  ON public.notes FOR DELETE
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE INDEX idx_notes_tenant ON public.notes(tenant_id);
CREATE INDEX idx_notes_campaign ON public.notes(campaign_id);
CREATE INDEX idx_notes_tags ON public.notes USING GIN(tags);

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
