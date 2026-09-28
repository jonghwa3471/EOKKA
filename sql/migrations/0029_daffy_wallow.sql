DROP TRIGGER IF EXISTS assign_profile_public_identity_before_write ON public.profiles;--> statement-breakpoint
DROP FUNCTION IF EXISTS public.assign_profile_public_identity();--> statement-breakpoint
ALTER TABLE "profiles" RENAME COLUMN "eokka_id" TO "username";--> statement-breakpoint
DROP INDEX "profiles_eokka_id_unique";--> statement-breakpoint
DROP INDEX "profiles_member_number_unique";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "member_number";--> statement-breakpoint
DROP SEQUENCE IF EXISTS public.profiles_member_number_seq;--> statement-breakpoint
UPDATE "profiles"
SET "username" = substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 8);--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_unique" ON "profiles" USING btree ("username");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_username_format_check" CHECK ("profiles"."username" ~ '^[a-z0-9_]{5,20}$');--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.assign_profile_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  candidate text;
BEGIN
  LOOP
    candidate := substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 8);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE username = candidate
    );
  END LOOP;

  NEW.username := candidate;
  RETURN NEW;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.assign_profile_username() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
CREATE TRIGGER assign_profile_username_before_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_profile_username();
