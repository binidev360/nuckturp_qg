
-- Whiteboard items table for sticky notes, text, shapes
CREATE TABLE public.whiteboard_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  board_name TEXT NOT NULL DEFAULT 'default',
  type TEXT NOT NULL DEFAULT 'note', -- note, text, shape
  content TEXT DEFAULT '',
  color TEXT DEFAULT '#82ff6a',
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION NOT NULL DEFAULT 200,
  height DOUBLE PRECISION NOT NULL DEFAULT 150,
  z_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whiteboard_items ENABLE ROW LEVEL SECURITY;

-- Owner policies
CREATE POLICY "Owner can select whiteboard items"
  ON public.whiteboard_items FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can insert whiteboard items"
  ON public.whiteboard_items FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can update whiteboard items"
  ON public.whiteboard_items FOR UPDATE
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Owner can delete whiteboard items"
  ON public.whiteboard_items FOR DELETE
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Shared campaign access
CREATE POLICY "Shared user can select whiteboard items"
  ON public.whiteboard_items FOR SELECT
  USING (campaign_id IS NOT NULL AND user_has_campaign_access(auth.uid(), campaign_id));

-- Indexes
CREATE INDEX idx_whiteboard_items_tenant ON public.whiteboard_items(tenant_id);
CREATE INDEX idx_whiteboard_items_campaign ON public.whiteboard_items(campaign_id);

-- Updated_at trigger
CREATE TRIGGER update_whiteboard_items_updated_at
  BEFORE UPDATE ON public.whiteboard_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
