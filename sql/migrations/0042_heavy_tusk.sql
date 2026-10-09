CREATE TABLE "pending_quick_analyses" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"result" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_quick_analyses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pending_quick_analyses" ADD CONSTRAINT "pending_quick_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "select-own-pending-quick-analysis" ON "pending_quick_analyses" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "pending_quick_analyses"."user_id");--> statement-breakpoint
CREATE POLICY "insert-own-pending-quick-analysis" ON "pending_quick_analyses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = "pending_quick_analyses"."user_id");--> statement-breakpoint
CREATE POLICY "update-own-pending-quick-analysis" ON "pending_quick_analyses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "pending_quick_analyses"."user_id") WITH CHECK ((select auth.uid()) = "pending_quick_analyses"."user_id");--> statement-breakpoint
CREATE POLICY "delete-own-pending-quick-analysis" ON "pending_quick_analyses" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.uid()) = "pending_quick_analyses"."user_id");
--> statement-breakpoint
REVOKE ALL ON TABLE "pending_quick_analyses" FROM "anon";
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "pending_quick_analyses" TO "authenticated";
