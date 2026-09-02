DROP INDEX "analysis_snapshots_user_goal_date_unique";--> statement-breakpoint
ALTER TABLE "analysis_snapshots" ADD COLUMN "analysis_mode" text DEFAULT 'quick' NOT NULL;--> statement-breakpoint
ALTER TABLE "analysis_snapshots" ADD COLUMN "managed_portfolio_id" bigint;--> statement-breakpoint
ALTER TABLE "analysis_snapshots" ADD CONSTRAINT "analysis_snapshots_managed_portfolio_id_managed_portfolios_managed_portfolio_id_fk" FOREIGN KEY ("managed_portfolio_id") REFERENCES "public"."managed_portfolios"("managed_portfolio_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_snapshots_user_goal_date_unique" ON "analysis_snapshots" USING btree ("user_id","goal_amount","saved_on","analysis_mode");