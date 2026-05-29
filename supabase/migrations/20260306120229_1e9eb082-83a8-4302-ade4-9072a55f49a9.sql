
-- Function to generate a unique slug from an email
CREATE OR REPLACE FUNCTION public.generate_unique_slug_from_email(_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  candidate text;
  counter int := 1;
BEGIN
  -- Extract local part before @, replace dots/special chars with hyphens
  base_slug := split_part(lower(_email), '@', 1);
  -- Replace anything not alphanumeric, dot, hyphen, underscore
  base_slug := regexp_replace(base_slug, '[^a-z0-9.\-_]', '-', 'g');
  -- Replace dots with hyphens for URL friendliness but keep readable
  base_slug := regexp_replace(base_slug, '\.', '-', 'g');
  -- Trim leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  -- Limit length
  base_slug := left(base_slug, 35);
  
  -- If empty, fallback
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'mestre';
  END IF;
  
  candidate := base_slug;
  
  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = candidate) LOOP
    counter := counter + 1;
    candidate := base_slug || counter::text;
  END LOOP;
  
  RETURN candidate;
END;
$$;

-- Update handle_new_user to auto-generate slug
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_tenant_id UUID;
  is_banned boolean;
  auto_slug text;
BEGIN
  -- Check if email is banned
  SELECT EXISTS (
    SELECT 1 FROM public.banned_emails WHERE email = lower(NEW.email)
  ) INTO is_banned;

  IF is_banned THEN
    RAISE EXCEPTION 'This email address has been banned from the platform';
  END IF;

  -- Generate unique slug from email
  auto_slug := public.generate_unique_slug_from_email(NEW.email);

  -- Create profile with auto-generated slug
  INSERT INTO public.profiles (user_id, display_name, slug)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), auto_slug);

  -- Create tenant
  INSERT INTO public.tenants (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Meu QG'), NEW.id)
  RETURNING id INTO new_tenant_id;

  -- Create membership
  INSERT INTO public.memberships (tenant_id, user_id, role)
  VALUES (new_tenant_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

-- Backfill: generate slugs for existing profiles that don't have one
-- We need a DO block for this
DO $$
DECLARE
  r record;
  new_slug text;
  base_slug text;
  candidate text;
  counter int;
BEGIN
  FOR r IN SELECT p.id, p.user_id FROM public.profiles p WHERE p.slug IS NULL OR p.slug = ''
  LOOP
    -- Get email from auth.users
    SELECT split_part(lower(u.email), '@', 1) INTO base_slug
    FROM auth.users u WHERE u.id = r.user_id;
    
    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'mestre';
    END IF;
    
    base_slug := regexp_replace(base_slug, '[^a-z0-9.\-_]', '-', 'g');
    base_slug := regexp_replace(base_slug, '\.', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    base_slug := left(base_slug, 35);
    
    IF base_slug = '' THEN base_slug := 'mestre'; END IF;
    
    candidate := base_slug;
    counter := 1;
    
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = candidate AND id != r.id) LOOP
      counter := counter + 1;
      candidate := base_slug || counter::text;
    END LOOP;
    
    UPDATE public.profiles SET slug = candidate WHERE id = r.id;
  END LOOP;
END;
$$;
