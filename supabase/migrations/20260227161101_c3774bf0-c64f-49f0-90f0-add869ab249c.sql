
-- Table for tracking which author posts are featured on the main Nuckturp blog
-- Workflow: Admin requests -> Author accepts/declines -> Post appears on main blog
-- Either party can revoke at any time

CREATE TABLE public.post_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL, -- admin who requested
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, revoked_by_admin, revoked_by_author
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  revoked_at timestamptz,
  note text, -- optional message from admin
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id) -- only one feature request per post at a time
);

ALTER TABLE public.post_features ENABLE ROW LEVEL SECURITY;

-- Admins can manage all feature requests
CREATE POLICY "Admins can manage post features"
  ON public.post_features FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Authors can view feature requests for their own posts
CREATE POLICY "Authors can view own post features"
  ON public.post_features FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_features.post_id
      AND p.blog_author_id = get_user_blog_author_id(auth.uid())
    )
  );

-- Authors can update (accept/revoke) their own post features
CREATE POLICY "Authors can update own post features"
  ON public.post_features FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_features.post_id
      AND p.blog_author_id = get_user_blog_author_id(auth.uid())
    )
  );

-- Add featured flag to posts for quick filtering (denormalized for performance)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- Trigger to update updated_at
CREATE TRIGGER update_post_features_updated_at
  BEFORE UPDATE ON public.post_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
