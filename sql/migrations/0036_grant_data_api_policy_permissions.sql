-- Match PostgREST privileges to the operations explicitly allowed by RLS.
-- Tables without end-user RLS policies remain accessible only to server-side
-- service credentials.
GRANT USAGE ON SCHEMA public TO anon, authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE public.stocks TO anon, authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analysis_snapshots TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.managed_portfolios TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.portfolio_transactions TO authenticated;--> statement-breakpoint
GRANT SELECT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE public.payments TO authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE public.user_achievements TO authenticated;
