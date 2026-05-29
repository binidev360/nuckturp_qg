
-- Table for category requests from SEO Specialist AI suggestions
CREATE TABLE public.category_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.category_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own requests
CREATE POLICY "Users can insert own category requests"
  ON public.category_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Users can view their own requests
CREATE POLICY "Users can view own category requests"
  ON public.category_requests
  FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

-- Admins can manage all category requests
CREATE POLICY "Admins can manage all category requests"
  ON public.category_requests
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Index for admin queries
CREATE INDEX idx_category_requests_status ON public.category_requests(status);
