CREATE TABLE "analysis_snapshots" (
	"analysis_snapshot_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analysis_snapshots_analysis_snapshot_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"saved_on" date NOT NULL,
	"goal_amount" bigint NOT NULL,
	"current_value" bigint NOT NULL,
	"profit" bigint NOT NULL,
	"return_rate" double precision NOT NULL,
	"goal_month" integer,
	"monthly_contribution" bigint DEFAULT 0 NOT NULL,
	"result" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "analysis_snapshots" ADD CONSTRAINT "analysis_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_snapshots_user_date_unique" ON "analysis_snapshots" USING btree ("user_id","saved_on");--> statement-breakpoint
CREATE POLICY "select-own-analysis-snapshots" ON "analysis_snapshots" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "analysis_snapshots"."user_id");--> statement-breakpoint
CREATE POLICY "insert-own-analysis-snapshots" ON "analysis_snapshots" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "analysis_snapshots"."user_id");--> statement-breakpoint
CREATE POLICY "update-own-analysis-snapshots" ON "analysis_snapshots" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "analysis_snapshots"."user_id") WITH CHECK ((select auth.uid()) = "analysis_snapshots"."user_id");--> statement-breakpoint
CREATE POLICY "delete-own-analysis-snapshots" ON "analysis_snapshots" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "analysis_snapshots"."user_id");