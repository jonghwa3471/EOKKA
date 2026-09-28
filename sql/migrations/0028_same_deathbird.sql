CREATE SEQUENCE "public"."profiles_member_number_seq" AS bigint START WITH 1 INCREMENT BY 1 NO CYCLE;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "eokka_id" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "member_number" bigint;--> statement-breakpoint
WITH ordered_profiles AS (
  SELECT
    p.profile_id,
    row_number() OVER (ORDER BY COALESCE(u.created_at, p.created_at), p.profile_id) AS member_number
  FROM "profiles" p
  LEFT JOIN auth.users u ON u.id = p.profile_id
)
UPDATE "profiles" p
SET "member_number" = ordered_profiles.member_number
FROM ordered_profiles
WHERE ordered_profiles.profile_id = p.profile_id;--> statement-breakpoint
UPDATE "profiles"
SET "eokka_id" =
  translate(
    substring(md5(profile_id::text || clock_timestamp()::text) FROM 1 FOR 5),
    '0123456789abcdef',
    'abcdefghjkmnpqrs'
  ) || lpad(member_number::text, greatest(5, length(member_number::text)), '0');--> statement-breakpoint
SELECT setval(
  'public.profiles_member_number_seq',
  COALESCE((SELECT max(member_number) FROM "profiles"), 1),
  EXISTS (SELECT 1 FROM "profiles")
);--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "eokka_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "member_number" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_eokka_id_unique" ON "profiles" USING btree ("eokka_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_member_number_unique" ON "profiles" USING btree ("member_number");--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.assign_profile_public_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  assigned_number bigint;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.member_number := OLD.member_number;
    NEW.eokka_id := OLD.eokka_id;
    RETURN NEW;
  END IF;

  assigned_number := nextval('public.profiles_member_number_seq');
  NEW.member_number := assigned_number;
  NEW.eokka_id :=
    translate(
      substring(md5(gen_random_uuid()::text) FROM 1 FOR 5),
      '0123456789abcdef',
      'abcdefghjkmnpqrs'
    ) || lpad(assigned_number::text, greatest(5, length(assigned_number::text)), '0');

  RETURN NEW;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.assign_profile_public_identity() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
CREATE TRIGGER assign_profile_public_identity_before_write
BEFORE INSERT OR UPDATE OF eokka_id, member_number ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_profile_public_identity();
