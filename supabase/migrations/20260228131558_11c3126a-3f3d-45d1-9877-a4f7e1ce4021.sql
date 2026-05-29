
-- Create banned_emails table
CREATE TABLE public.banned_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  reason text,
  banned_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can manage banned emails
CREATE POLICY "Admins can manage banned emails"
  ON public.banned_emails
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Modify handle_new_user to check banned emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id UUID;
  is_banned boolean;
BEGIN
  -- Check if email is banned
  SELECT EXISTS (
    SELECT 1 FROM public.banned_emails WHERE email = lower(NEW.email)
  ) INTO is_banned;

  IF is_banned THEN
    RAISE EXCEPTION 'This email address has been banned from the platform';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  -- Create tenant
  INSERT INTO public.tenants (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Meu QG'), NEW.id)
  RETURNING id INTO new_tenant_id;

  -- Create membership
  INSERT INTO public.memberships (tenant_id, user_id, role)
  VALUES (new_tenant_id, NEW.id, 'owner');

  RETURN NEW;
END;
$function$;
