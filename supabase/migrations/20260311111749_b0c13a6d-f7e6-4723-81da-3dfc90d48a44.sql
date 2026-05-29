
ALTER TABLE public.session_feedback_configs
  ADD COLUMN cover_position integer NOT NULL DEFAULT 50,
  ADD COLUMN header_type text NOT NULL DEFAULT 'none',
  ADD COLUMN header_logo_url text,
  ADD COLUMN header_text text;
