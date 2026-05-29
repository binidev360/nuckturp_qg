
-- Table to store admin-granted free premium overrides
CREATE TABLE public.premium_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE, -- NULL = forever
  granted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_overrides ENABLE ROW LEVEL SECURITY;

-- Only admins can manage premium overrides (via edge function with service role)
-- No direct client access needed - all managed through admin-users edge function

-- Index for fast lookup
CREATE INDEX idx_premium_overrides_user_id ON public.premium_overrides (user_id);

-- Trigger for updated_at
CREATE TRIGGER update_premium_overrides_updated_at
  BEFORE UPDATE ON public.premium_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
