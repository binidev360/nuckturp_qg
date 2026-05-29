
-- Add extra metadata column for connectors, shapes, lines, fonts
ALTER TABLE public.whiteboard_items
  ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- metadata stores:
-- For connectors: { "from_id": "uuid", "to_id": "uuid", "arrow": true }
-- For shapes: { "shape": "rect|circle|diamond|triangle" }
-- For lines: { "points": [[x1,y1],[x2,y2],...] }
-- For text/notes: { "font_family": "Inter" }
