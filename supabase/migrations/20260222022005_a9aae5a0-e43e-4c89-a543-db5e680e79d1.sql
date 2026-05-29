
-- Create whiteboards table for managing multiple boards
CREATE TABLE public.whiteboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL DEFAULT 'Novo Whiteboard',
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  adventure_id UUID REFERENCES public.adventures(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whiteboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can select whiteboards" ON public.whiteboards FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Owner can insert whiteboards" ON public.whiteboards FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Owner can update whiteboards" ON public.whiteboards FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Owner can delete whiteboards" ON public.whiteboards FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Shared user can select whiteboards" ON public.whiteboards FOR SELECT USING (
  campaign_id IS NOT NULL AND user_has_campaign_access(auth.uid(), campaign_id)
);

CREATE TRIGGER update_whiteboards_updated_at BEFORE UPDATE ON public.whiteboards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link whiteboard_items to a whiteboard (nullable for backwards compat)
ALTER TABLE public.whiteboard_items ADD COLUMN whiteboard_id UUID REFERENCES public.whiteboards(id) ON DELETE CASCADE;
