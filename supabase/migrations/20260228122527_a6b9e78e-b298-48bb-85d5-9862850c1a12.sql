
-- 1. Audit trail for admin actions on posts
CREATE TABLE public.post_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL, -- 'approved', 'featured', 'unfeatured', 'notified'
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage post admin actions"
  ON public.post_admin_actions FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Index for quick lookups
CREATE INDEX idx_post_admin_actions_post_id ON public.post_admin_actions(post_id);
CREATE INDEX idx_post_admin_actions_admin ON public.post_admin_actions(admin_user_id);

-- 2. Smart view count increment RPC (excludes admins and post authors)
CREATE OR REPLACE FUNCTION public.increment_post_view(p_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_is_author boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user is admin
  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE(p.is_admin, false) INTO v_is_admin
    FROM profiles p WHERE p.user_id = v_user_id;
    
    IF v_is_admin THEN RETURN; END IF;
    
    -- Check if user is the post author
    SELECT EXISTS(
      SELECT 1 FROM posts po
      JOIN blog_authors ba ON ba.id = po.blog_author_id
      JOIN profiles pr ON pr.id = ba.profile_id
      WHERE po.id = p_post_id AND pr.user_id = v_user_id
    ) INTO v_is_author;
    
    IF v_is_author THEN RETURN; END IF;
  END IF;
  
  -- Increment view count
  UPDATE posts SET view_count = view_count + 1 WHERE id = p_post_id;
END;
$$;
