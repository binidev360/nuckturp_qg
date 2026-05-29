
-- 1. Views: usar permissões do consultante (corrige Security Definer View)
ALTER VIEW public.public_profiles SET (security_invoker = true);
ALTER VIEW public.academy_annotations_admin_view SET (security_invoker = true);

-- 2. author_follows: restringe leitura individual
DROP POLICY IF EXISTS "Follows are publicly readable" ON public.author_follows;
CREATE POLICY "Authenticated can read follows"
  ON public.author_follows
  FOR SELECT
  TO authenticated
  USING (true);

-- Função pública para contagem agregada (não expõe user_ids)
CREATE OR REPLACE FUNCTION public.get_author_followers_count(_blog_author_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint FROM public.author_follows WHERE blog_author_id = _blog_author_id;
$$;
GRANT EXECUTE ON FUNCTION public.get_author_followers_count(uuid) TO anon, authenticated;

-- 3. session_feedback_responses: política SELECT explícita apenas para o dono
CREATE POLICY "Owners can read their feedback responses"
  ON public.session_feedback_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_feedback_configs c
      JOIN public.tenants t ON t.id = c.tenant_id
      WHERE c.id = session_feedback_responses.config_id
        AND t.owner_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
  );

-- Reforça INSERT para exigir config ativo (evita spam órfão)
DROP POLICY IF EXISTS "Anyone can insert feedback responses" ON public.session_feedback_responses;
CREATE POLICY "Anyone can insert feedback for active configs"
  ON public.session_feedback_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_feedback_configs c
      WHERE c.id = session_feedback_responses.config_id AND c.active = true
    )
  );

-- 4. feedback_view_events: exige config ativo
DROP POLICY IF EXISTS "Anyone can insert view events" ON public.feedback_view_events;
CREATE POLICY "Anyone can insert view events for active configs"
  ON public.feedback_view_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_feedback_configs c
      WHERE c.id = feedback_view_events.config_id AND c.active = true
    )
  );

-- 5. post_reactions: exige post publicado e público
DROP POLICY IF EXISTS "Anyone can insert reactions" ON public.post_reactions;
CREATE POLICY "Anyone can react to public published posts"
  ON public.post_reactions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_reactions.post_id
        AND p.status = 'published'
        AND p.visibility = 'public'
    )
  );

-- 6. Funções sem search_path fixo
ALTER FUNCTION public.update_academy_settings_updated_at() SET search_path = public;
ALTER FUNCTION public.update_academy_cards_updated_at() SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='read_email_batch' AND pronamespace='public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- 7. pending_push_queue: RLS habilitado sem política -> adiciona políticas admin
CREATE POLICY "Admins can manage push queue"
  ON public.pending_push_queue
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
