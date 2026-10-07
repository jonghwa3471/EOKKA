CREATE OR REPLACE FUNCTION public.enforce_eokka_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Serialize sign-ups so simultaneous requests cannot create member 51.
  PERFORM pg_advisory_xact_lock(297683077953);

  IF (SELECT count(*) FROM auth.users) >= 50 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'EOKKA_MEMBER_LIMIT_REACHED';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS enforce_eokka_member_limit_before_signup ON auth.users;--> statement-breakpoint
CREATE TRIGGER enforce_eokka_member_limit_before_signup
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_eokka_member_limit();--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_eokka_member_limit() FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_eokka_member_limit() FROM anon;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_eokka_member_limit() FROM authenticated;
