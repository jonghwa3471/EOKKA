-- PostgREST still enforces the profiles RLS policies. These privileges allow
-- an authenticated user to read and maintain only the row permitted by RLS.
GRANT USAGE ON SCHEMA public TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
