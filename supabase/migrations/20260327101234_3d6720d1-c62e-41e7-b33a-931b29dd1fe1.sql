
-- RPC para batch reorder de módulos de curso (evita N queries paralelas)
CREATE OR REPLACE FUNCTION public.batch_reorder_course_modules(
  p_ids uuid[],
  p_order_indexes int[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  FOR i IN 1..array_length(p_ids, 1) LOOP
    UPDATE academy_course_modules
    SET order_index = p_order_indexes[i]
    WHERE id = p_ids[i];
  END LOOP;
END;
$$;

-- RPC para batch reorder de aulas (evita N queries paralelas)
CREATE OR REPLACE FUNCTION public.batch_reorder_course_lessons(
  p_ids uuid[],
  p_order_indexes int[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  FOR i IN 1..array_length(p_ids, 1) LOOP
    UPDATE academy_lessons
    SET order_index = p_order_indexes[i]
    WHERE id = p_ids[i];
  END LOOP;
END;
$$;
