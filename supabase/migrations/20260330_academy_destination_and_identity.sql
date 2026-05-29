-- ============================================================
-- Migration: Academy Cards — Sistema de Destinos
--            Academy Books/Courses — Identidade Visual
-- Data: 2026-03-30
-- ============================================================
-- Execute no Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. ACADEMY_CARDS — novos campos
-- ──────────────────────────────────────────────────────────

-- Tipo de destino do card (substitui a inferência por book_id/course_id)
ALTER TABLE academy_cards
  ADD COLUMN IF NOT EXISTS destination_type TEXT NOT NULL DEFAULT 'book'
    CHECK (destination_type IN ('book', 'course', 'external', 'tool'));

-- Caminho de ferramenta interna (ex: '/tools/adventure-generator')
ALTER TABLE academy_cards
  ADD COLUMN IF NOT EXISTS tool_path TEXT NULL;

-- Label customizado do botão CTA (ex: 'Ler agora', 'Assistir')
ALTER TABLE academy_cards
  ADD COLUMN IF NOT EXISTS cta_label TEXT NULL;

-- Badge de status exibido na capa (ex: 'Novo', 'Em breve', 'Popular', 'Destaque')
ALTER TABLE academy_cards
  ADD COLUMN IF NOT EXISTS status_badge TEXT NULL
    CHECK (status_badge IS NULL OR status_badge IN ('Novo', 'Em breve', 'Popular', 'Destaque'));

-- Descrição longa exibida em modal (melhoria C)
ALTER TABLE academy_cards
  ADD COLUMN IF NOT EXISTS description TEXT NULL;

-- Alvo do link externo: '_self' (mesma aba) ou '_blank' (nova aba)
ALTER TABLE academy_cards
  ADD COLUMN IF NOT EXISTS link_target TEXT NOT NULL DEFAULT '_self'
    CHECK (link_target IN ('_self', '_blank'));

-- Tags para filtro na vitrine (ex: ARRAY['narrativa', 'combate'])
ALTER TABLE academy_cards
  ADD COLUMN IF NOT EXISTS tags TEXT[] NULL;

-- Migração de dados existentes: inferir destination_type a partir dos campos atuais
UPDATE academy_cards SET destination_type = 'course'  WHERE course_id  IS NOT NULL AND destination_type = 'book';
UPDATE academy_cards SET destination_type = 'external' WHERE access_type = 'external' AND external_url IS NOT NULL AND course_id IS NULL AND book_id IS NULL AND destination_type = 'book';

-- ──────────────────────────────────────────────────────────
-- 2. ACADEMY_BOOKS — campos de identidade visual
-- ──────────────────────────────────────────────────────────

-- Imagem hero wide exibida no topo da página do livro (proporção 16:9 ou 21:9)
ALTER TABLE academy_books
  ADD COLUMN IF NOT EXISTS banner_url TEXT NULL;

-- Cor de destaque em hexadecimal (ex: '#7c3aed') usada em botões, bordas, destaques
ALTER TABLE academy_books
  ADD COLUMN IF NOT EXISTS accent_color TEXT NULL;

-- Tagline/frase de efeito exibida abaixo do título na página do produto
ALTER TABLE academy_books
  ADD COLUMN IF NOT EXISTS theme_label TEXT NULL;

-- ──────────────────────────────────────────────────────────
-- 3. ACADEMY_COURSES — campos de identidade visual
-- ──────────────────────────────────────────────────────────

ALTER TABLE academy_courses
  ADD COLUMN IF NOT EXISTS banner_url TEXT NULL;

ALTER TABLE academy_courses
  ADD COLUMN IF NOT EXISTS accent_color TEXT NULL;

ALTER TABLE academy_courses
  ADD COLUMN IF NOT EXISTS theme_label TEXT NULL;

-- ──────────────────────────────────────────────────────────
-- Fim da migration
-- ──────────────────────────────────────────────────────────
