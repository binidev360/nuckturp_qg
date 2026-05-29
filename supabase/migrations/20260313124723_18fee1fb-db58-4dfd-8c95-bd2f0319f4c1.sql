
-- Função para substituir URLs antigas por novas no conteúdo HTML dos posts
-- Usada pelo optimize-images para atualizar referências após conversão WebP
CREATE OR REPLACE FUNCTION public.admin_replace_content_url(_old_url text, _new_url text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  affected integer;
BEGIN
  -- Apenas admins podem executar
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE posts
  SET content = replace(content, _old_url, _new_url),
      updated_at = now()
  WHERE content LIKE '%' || _old_url || '%';
  
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
