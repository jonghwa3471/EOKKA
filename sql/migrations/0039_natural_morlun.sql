CREATE TABLE "analysis_history_points" (
	"analysis_history_point_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_history_points_analysis_history_point_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"saved_on" date NOT NULL,
	"period_kind" text DEFAULT 'daily' NOT NULL,
	"goal_amount" bigint NOT NULL,
	"current_value" bigint NOT NULL,
	"total_cost" bigint NOT NULL,
	"profit" bigint NOT NULL,
	"return_rate" double precision NOT NULL,
	"goal_month" integer,
	"monthly_contribution" bigint DEFAULT 0 NOT NULL,
	"analysis_mode" text DEFAULT 'quick' NOT NULL,
	"managed_portfolio_id" bigint,
	"metrics" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_history_points" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "analysis_history_points" ADD CONSTRAINT "analysis_history_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_history_points" ADD CONSTRAINT "analysis_history_points_managed_portfolio_id_managed_portfolios_managed_portfolio_id_fk" FOREIGN KEY ("managed_portfolio_id") REFERENCES "public"."managed_portfolios"("managed_portfolio_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_history_points_user_goal_date_unique" ON "analysis_history_points" USING btree ("user_id","goal_amount","saved_on","analysis_mode");--> statement-breakpoint
CREATE POLICY "select-own-analysis-history-points" ON "analysis_history_points" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "analysis_history_points"."user_id");--> statement-breakpoint
CREATE POLICY "insert-own-analysis-history-points" ON "analysis_history_points" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "analysis_history_points"."user_id");--> statement-breakpoint
CREATE POLICY "update-own-analysis-history-points" ON "analysis_history_points" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "analysis_history_points"."user_id") WITH CHECK ((select auth.uid()) = "analysis_history_points"."user_id");--> statement-breakpoint
CREATE POLICY "delete-own-analysis-history-points" ON "analysis_history_points" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "analysis_history_points"."user_id");--> statement-breakpoint
REVOKE ALL ON TABLE "analysis_history_points" FROM anon;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "analysis_history_points" TO authenticated;--> statement-breakpoint
INSERT INTO "analysis_history_points" (
  "user_id", "saved_on", "period_kind", "goal_amount", "current_value",
  "total_cost", "profit", "return_rate", "goal_month",
  "monthly_contribution", "analysis_mode", "managed_portfolio_id", "metrics",
  "updated_at", "created_at"
)
SELECT
  snapshots."user_id",
  snapshots."saved_on",
  'daily',
  snapshots."goal_amount",
  snapshots."current_value",
  COALESCE(round((snapshots."result"->>'totalCost')::numeric)::bigint, snapshots."current_value" - snapshots."profit"),
  snapshots."profit",
  snapshots."return_rate",
  snapshots."goal_month",
  snapshots."monthly_contribution",
  snapshots."analysis_mode",
  snapshots."managed_portfolio_id",
  jsonb_set(
    jsonb_set(
      snapshots."result" - 'aiStrategy' - 'summary' - 'riskWarnings' - 'contributionChart',
      '{holdings}',
      COALESCE((
        SELECT jsonb_agg(holding - 'fundamentals' - 'purchasePosition')
        FROM jsonb_array_elements(COALESCE(snapshots."result"->'holdings', '[]'::jsonb)) AS holding
      ), '[]'::jsonb)
    ),
    '{chart}',
    COALESCE((
      SELECT jsonb_agg(point ORDER BY ordinal)
      FROM jsonb_array_elements(COALESCE(snapshots."result"->'chart', '[]'::jsonb))
        WITH ORDINALITY AS chart(point, ordinal)
      WHERE ordinal = 1
        OR ordinal = jsonb_array_length(COALESCE(snapshots."result"->'chart', '[]'::jsonb))
        OR COALESCE((point->>'month')::integer, 0) % 12 = 0
    ), '[]'::jsonb)
  ),
  snapshots."updated_at",
  snapshots."created_at"
FROM "analysis_snapshots" AS snapshots
ON CONFLICT ("user_id", "goal_amount", "saved_on", "analysis_mode") DO NOTHING;--> statement-breakpoint
WITH ranked AS (
  SELECT
    "analysis_history_point_id" AS id,
    CASE
      WHEN "saved_on" >= current_date - 90 THEN 'daily'
      WHEN "saved_on" >= current_date - 365 THEN 'weekly'
      ELSE 'monthly'
    END AS period_kind,
    row_number() OVER (
      PARTITION BY
        "user_id", "goal_amount", "analysis_mode", COALESCE("managed_portfolio_id", 0),
        CASE
          WHEN "saved_on" >= current_date - 90 THEN "saved_on"::text
          WHEN "saved_on" >= current_date - 365 THEN to_char("saved_on", 'IYYY-IW')
          ELSE to_char("saved_on", 'YYYY-MM')
        END
      ORDER BY "saved_on" DESC, "analysis_history_point_id" DESC
    ) AS bucket_rank
  FROM "analysis_history_points"
), deleted AS (
  DELETE FROM "analysis_history_points"
  WHERE "analysis_history_point_id" IN (SELECT id FROM ranked WHERE bucket_rank > 1)
)
UPDATE "analysis_history_points" AS points
SET "period_kind" = ranked.period_kind
FROM ranked
WHERE points."analysis_history_point_id" = ranked.id
  AND ranked.bucket_rank = 1;
