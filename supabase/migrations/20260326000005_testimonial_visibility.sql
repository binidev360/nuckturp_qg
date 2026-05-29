-- Fase 1 — Visibilidade de depoimentos
-- Permite ao admin controlar quais depoimentos aparecem publicamente.

ALTER TABLE public.academy_content_nps
  ADD COLUMN IF NOT EXISTS testimonial_visible boolean NOT NULL DEFAULT true;
