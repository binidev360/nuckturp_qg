
-- Table to track AI usage across the platform
CREATE TABLE public.ai_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  feature text NOT NULL DEFAULT 'adventure_generator',
  model text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own logs
CREATE POLICY "Users can insert own ai logs" ON public.ai_usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view own logs
CREATE POLICY "Users can view own ai logs" ON public.ai_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all ai logs" ON public.ai_usage_logs
  FOR SELECT USING (is_admin(auth.uid()));

-- Index for admin stats queries
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs (created_at DESC);
CREATE INDEX idx_ai_usage_logs_feature ON public.ai_usage_logs (feature);
