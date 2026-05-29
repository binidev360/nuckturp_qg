
-- Allow authenticated users to insert their own blog_author (linked to their own profile)
CREATE POLICY "Users can create own blog author"
ON public.blog_authors
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id IS NOT NULL
  AND profile_id = (
    SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
  )
);

-- Allow users to update their own blog_author
CREATE POLICY "Users can update own blog author"
ON public.blog_authors
FOR UPDATE
TO authenticated
USING (
  profile_id = (
    SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
  )
)
WITH CHECK (
  profile_id = (
    SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
  )
);
