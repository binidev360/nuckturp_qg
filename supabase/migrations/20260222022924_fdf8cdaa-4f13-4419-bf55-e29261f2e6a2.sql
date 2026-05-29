
-- Create folders table for organizing notes and whiteboards
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL DEFAULT 'Nova Pasta',
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'whiteboard')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can select folders" ON public.folders FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Owner can insert folders" ON public.folders FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Owner can update folders" ON public.folders FOR UPDATE USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Owner can delete folders" ON public.folders FOR DELETE USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder_id to notes
ALTER TABLE public.notes ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

-- Add folder_id to whiteboards
ALTER TABLE public.whiteboards ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;
