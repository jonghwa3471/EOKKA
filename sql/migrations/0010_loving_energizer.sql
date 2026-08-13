DROP INDEX "analysis_snapshots_user_date_unique";--> statement-breakpoint
ALTER TABLE "analysis_snapshots" ADD COLUMN "portfolio_key" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_snapshots_user_portfolio_goal_date_unique" ON "analysis_snapshots" USING btree ("user_id","portfolio_key","goal_amount","saved_on");