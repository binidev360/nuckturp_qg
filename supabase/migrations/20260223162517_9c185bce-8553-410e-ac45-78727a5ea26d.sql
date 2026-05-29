
-- Dictionary entries table
CREATE TABLE public.dictionary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  letter CHAR(1) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dictionary_entries ENABLE ROW LEVEL SECURITY;

-- Public read access (dictionary is public content)
CREATE POLICY "Dictionary entries are publicly readable"
  ON public.dictionary_entries FOR SELECT USING (true);

-- Only admins can manage dictionary entries
CREATE POLICY "Admins can insert dictionary entries"
  ON public.dictionary_entries FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update dictionary entries"
  ON public.dictionary_entries FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete dictionary entries"
  ON public.dictionary_entries FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Index for letter-based filtering
CREATE INDEX idx_dictionary_letter ON public.dictionary_entries (letter);
CREATE INDEX idx_dictionary_term ON public.dictionary_entries (term);

-- Trigger for updated_at
CREATE TRIGGER update_dictionary_entries_updated_at
  BEFORE UPDATE ON public.dictionary_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
