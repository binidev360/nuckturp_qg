
CREATE OR REPLACE FUNCTION public.admin_profile_insights()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_total int;
  v_with_bio int;
  v_with_avatar int;
  v_with_banner int;
  v_with_slug int;
  v_with_website int;
  v_with_mesaquest int;
  v_with_worldcraft_links int;
  v_with_instagram_posts int;
  v_with_youtube int;
  v_with_social_links int;
  v_blog_enabled int;
  v_onboarding_completed int;
  v_with_favorite_systems int;
  v_with_favorite_vtts int;
  v_with_preferred_days int;
  v_experience_levels jsonb;
  v_session_frequencies jsonb;
  v_top_systems jsonb;
  v_top_vtts jsonb;
  v_day_distribution jsonb;
  v_pronoun_distribution jsonb;
  v_locale_distribution jsonb;
BEGIN
  -- Only admins
  IF NOT is_admin(auth.uid()) THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT count(*) INTO v_total FROM profiles;
  SELECT count(*) INTO v_with_bio FROM profiles WHERE bio IS NOT NULL AND bio <> '';
  SELECT count(*) INTO v_with_avatar FROM profiles WHERE avatar_url IS NOT NULL AND avatar_url <> '';
  SELECT count(*) INTO v_with_banner FROM profiles WHERE banner_url IS NOT NULL AND banner_url <> '';
  SELECT count(*) INTO v_with_slug FROM profiles WHERE slug IS NOT NULL AND slug <> '';
  SELECT count(*) INTO v_with_website FROM profiles WHERE website IS NOT NULL AND website <> '';
  SELECT count(*) INTO v_with_mesaquest FROM profiles WHERE mesaquest_url IS NOT NULL AND mesaquest_url <> '';
  SELECT count(*) INTO v_with_social_links FROM profiles WHERE social_links IS NOT NULL AND social_links::text <> 'null' AND social_links::text <> '[]';
  SELECT count(*) INTO v_blog_enabled FROM profiles WHERE blog_enabled = true;
  SELECT count(*) INTO v_onboarding_completed FROM profiles WHERE onboarding_completed = true;

  -- Worldcraft links
  SELECT count(*) INTO v_with_worldcraft_links FROM profiles 
  WHERE worldcraft_links IS NOT NULL AND worldcraft_links::text <> 'null' AND worldcraft_links::text <> '[]';

  -- Instagram posts
  SELECT count(*) INTO v_with_instagram_posts FROM profiles 
  WHERE instagram_posts IS NOT NULL AND instagram_posts::text <> '[]';

  -- YouTube
  SELECT count(*) INTO v_with_youtube FROM profiles 
  WHERE youtube_videos IS NOT NULL AND youtube_videos::text <> '[]';

  -- Favorite systems
  SELECT count(*) INTO v_with_favorite_systems FROM profiles 
  WHERE favorite_systems IS NOT NULL AND favorite_systems::text <> '[]';

  -- Favorite VTTs
  SELECT count(*) INTO v_with_favorite_vtts FROM profiles 
  WHERE favorite_vtts IS NOT NULL AND favorite_vtts::text <> '[]';

  -- Preferred days
  SELECT count(*) INTO v_with_preferred_days FROM profiles 
  WHERE preferred_days IS NOT NULL AND preferred_days::text <> '[]';

  -- Experience level distribution
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', level, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_experience_levels
  FROM (
    SELECT coalesce(experience_level, 'Não informado') as level, count(*) as cnt
    FROM profiles GROUP BY experience_level
  ) t;

  -- Session frequency distribution
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', freq, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_session_frequencies
  FROM (
    SELECT coalesce(session_frequency, 'Não informado') as freq, count(*) as cnt
    FROM profiles GROUP BY session_frequency
  ) t;

  -- Top 15 systems
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', sys, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_top_systems
  FROM (
    SELECT s.value::text as sys, count(*) as cnt
    FROM profiles p, jsonb_array_elements(p.favorite_systems) s
    WHERE p.favorite_systems IS NOT NULL AND p.favorite_systems::text <> '[]'
    GROUP BY s.value::text
    ORDER BY cnt DESC
    LIMIT 15
  ) t;

  -- Top 10 VTTs
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', vtt, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_top_vtts
  FROM (
    SELECT v.value::text as vtt, count(*) as cnt
    FROM profiles p, jsonb_array_elements(p.favorite_vtts) v
    WHERE p.favorite_vtts IS NOT NULL AND p.favorite_vtts::text <> '[]'
    GROUP BY v.value::text
    ORDER BY cnt DESC
    LIMIT 10
  ) t;

  -- Day of week distribution
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', d, 'count', cnt) ORDER BY 
    CASE d 
      WHEN 'seg' THEN 1 WHEN 'ter' THEN 2 WHEN 'qua' THEN 3 
      WHEN 'qui' THEN 4 WHEN 'sex' THEN 5 WHEN 'sab' THEN 6 WHEN 'dom' THEN 7 
      ELSE 8 END
  ), '[]'::jsonb)
  INTO v_day_distribution
  FROM (
    SELECT d.value::text as d, count(*) as cnt
    FROM profiles p, jsonb_array_elements(p.preferred_days) d
    WHERE p.preferred_days IS NOT NULL AND p.preferred_days::text <> '[]'
    GROUP BY d.value::text
  ) t;

  -- Pronoun distribution
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', pron, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_pronoun_distribution
  FROM (
    SELECT coalesce(pronoun, 'Não informado') as pron, count(*) as cnt
    FROM profiles GROUP BY pronoun
  ) t;

  -- Locale distribution
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', loc, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_locale_distribution
  FROM (
    SELECT locale as loc, count(*) as cnt
    FROM profiles GROUP BY locale
  ) t;

  result := jsonb_build_object(
    'total_profiles', v_total,
    'with_bio', v_with_bio,
    'with_avatar', v_with_avatar,
    'with_banner', v_with_banner,
    'with_slug', v_with_slug,
    'with_website', v_with_website,
    'with_mesaquest', v_with_mesaquest,
    'with_worldcraft_links', v_with_worldcraft_links,
    'with_instagram_posts', v_with_instagram_posts,
    'with_youtube', v_with_youtube,
    'with_social_links', v_with_social_links,
    'blog_enabled', v_blog_enabled,
    'onboarding_completed', v_onboarding_completed,
    'with_favorite_systems', v_with_favorite_systems,
    'with_favorite_vtts', v_with_favorite_vtts,
    'with_preferred_days', v_with_preferred_days,
    'experience_levels', v_experience_levels,
    'session_frequencies', v_session_frequencies,
    'top_systems', v_top_systems,
    'top_vtts', v_top_vtts,
    'day_distribution', v_day_distribution,
    'pronoun_distribution', v_pronoun_distribution,
    'locale_distribution', v_locale_distribution
  );

  RETURN result;
END;
$$;
