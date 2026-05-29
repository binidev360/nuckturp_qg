-- Onda 3 — Retenção: Automação e Lembretes

-- 1. Função para detectar inatividade e gerar eventos de lembrete
CREATE OR REPLACE FUNCTION public.check_academy_inactivity()
RETURNS void AS $$
BEGIN
  -- Insere na tabela de eventos de conclusão (com tipo 'reminder') 
  -- para usuários que não atualizam o progresso de um livro há mais de 7 dias
  -- e que ainda não concluíram o livro.
  INSERT INTO public.academy_completion_events (user_id, content_id, content_type, event_type)
  SELECT 
    rp.user_id, 
    rp.book_id as content_id, 
    'book' as content_type,
    'reminder' as event_type
  FROM public.academy_reading_progress rp
  LEFT JOIN public.academy_completion_events ce 
    ON ce.user_id = rp.user_id 
    AND ce.content_id = rp.book_id 
    AND ce.event_type = 'reminder'
    AND ce.created_at > (now() - interval '15 days') -- Evita lembretes muito frequentes (máx 1 a cada 15 dias)
  WHERE 
    rp.completed = false
    AND rp.updated_at < (now() - interval '7 days')
    AND ce.id IS NULL; -- Só insere se não houver um lembrete recente
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: Como o Supabase gratuito não permite agendamento cron nativo diretamente via SQL (pg_cron),
-- este procedimento deve ser chamado via Edge Function ou uma Action no GitHub agendada.

-- 2. View para facilitar a listagem de usuários em "Risco de Abandono" (Dashboard Admin)
CREATE OR REPLACE VIEW public.view_academy_retention_risk AS
-- Fix (pivot 2026-05-29): profiles não possui full_name/email (bug do Lovable).
-- Removidas as colunas e o join com profiles; view de Academia mantida válida.
SELECT
  rp.user_id,
  rp.book_id as content_id,
  b.title as content_title,
  rp.updated_at as last_activity,
  EXTRACT(DAY FROM (now() - rp.updated_at))::int as days_inactive
FROM public.academy_reading_progress rp
JOIN public.academy_books b ON b.id = rp.book_id
WHERE 
  rp.completed = false
  AND rp.updated_at < (now() - interval '3 days') -- Consideramos risco após 3 dias, alerta vermelho após 7
ORDER BY days_inactive DESC;
