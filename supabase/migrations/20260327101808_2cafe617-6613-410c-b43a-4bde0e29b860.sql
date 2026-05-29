-- ============================================================
-- NEUTRALIZADA no pivot (2026-05-29).
-- Esta migration re-criava academy_courses / academy_course_modules /
-- academy_lessons / academy_course_progress, que JÁ existem (criadas por
-- migrations anteriores). Era duplicata gerada pelo Lovable (falhava com
-- "relation already exists"). A Academia é cortada do app (tabelas mantidas
-- conforme decisão C6). No-op para preservar o histórico de migrations.
-- ============================================================
select 1;
