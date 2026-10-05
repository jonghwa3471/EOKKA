-- Keep browser clients read-only for server-managed financial and membership data.
-- Application loaders/actions write these tables through the server database role.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.analysis_snapshots FROM authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON TABLE public.managed_portfolios FROM authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON TABLE public.portfolio_transactions FROM authenticated;--> statement-breakpoint

-- Profiles mix user-editable presentation fields with server-managed membership
-- fields. Restrict PostgREST writes to the fields users are allowed to edit.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE public.profiles TO authenticated;--> statement-breakpoint
GRANT INSERT (profile_id, username, name, avatar_url, marketing_consent)
  ON TABLE public.profiles TO authenticated;--> statement-breakpoint
GRANT UPDATE (username, name, avatar_url, marketing_consent)
  ON TABLE public.profiles TO authenticated;--> statement-breakpoint

-- Supabase service_role bypasses RLS but still needs the table privilege used
-- by the verified Toss payment callback.
GRANT INSERT ON TABLE public.payments TO service_role;
