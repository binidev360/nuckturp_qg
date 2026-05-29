
CREATE TABLE public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, session_id, emoji)
);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions (public blog)
CREATE POLICY "Anyone can view reactions" ON public.post_reactions FOR SELECT USING (true);

-- Anyone can insert reactions (public blog, anonymous allowed)
CREATE POLICY "Anyone can insert reactions" ON public.post_reactions FOR INSERT WITH CHECK (true);

-- Anyone can delete own reactions by session_id
CREATE POLICY "Anyone can delete own reactions" ON public.post_reactions FOR DELETE USING (true);

-- Admins can manage all
CREATE POLICY "Admins can manage reactions" ON public.post_reactions FOR ALL USING (is_admin(auth.uid()));
