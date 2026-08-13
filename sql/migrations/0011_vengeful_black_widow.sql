DROP INDEX "analysis_snapshots_user_portfolio_goal_date_unique";--> statement-breakpoint
DELETE FROM "analysis_snapshots" AS older
USING "analysis_snapshots" AS newer
WHERE older."user_id" = newer."user_id"
  AND older."goal_amount" = newer."goal_amount"
  AND older."saved_on" = newer."saved_on"
  AND older."analysis_snapshot_id" < newer."analysis_snapshot_id";--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_snapshots_user_goal_date_unique" ON "analysis_snapshots" USING btree ("user_id","goal_amount","saved_on");--> statement-breakpoint
ALTER TABLE "analysis_snapshots" DROP COLUMN "portfolio_key";
