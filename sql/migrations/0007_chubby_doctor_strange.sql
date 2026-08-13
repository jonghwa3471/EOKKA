CREATE POLICY "insert-profile-policy" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "profiles"."profile_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.handle_sign_up()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
DECLARE
  profile_name text;
  profile_avatar_url text;
  profile_marketing_consent boolean;
BEGIN
  profile_name := COALESCE(
    NULLIF(BTRIM(new.raw_user_meta_data ->> 'name'), ''),
    NULLIF(BTRIM(new.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(BTRIM(new.raw_user_meta_data ->> 'user_name'), ''),
    NULLIF(SPLIT_PART(COALESCE(new.email, ''), '@', 1), ''),
    '사용자'
  );

  profile_avatar_url := COALESCE(
    NULLIF(BTRIM(new.raw_user_meta_data ->> 'avatar_url'), ''),
    NULLIF(BTRIM(new.raw_user_meta_data ->> 'picture'), '')
  );

  profile_marketing_consent :=
    COALESCE(new.raw_user_meta_data ->> 'marketing_consent', 'false') = 'true';

  INSERT INTO public.profiles (
    profile_id,
    name,
    avatar_url,
    marketing_consent
  )
  VALUES (
    new.id,
    profile_name,
    profile_avatar_url,
    profile_marketing_consent
  )
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.handle_sign_up() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_sign_up() FROM anon;
REVOKE ALL ON FUNCTION public.handle_sign_up() FROM authenticated;
