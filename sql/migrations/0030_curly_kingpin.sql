CREATE TABLE "admin_activity_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"actor_user_id" uuid,
	"target_type" text NOT NULL,
	"target_id" text,
	"target_label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_activity_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "admin_activity_events_created_idx" ON "admin_activity_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_activity_events_type_idx" ON "admin_activity_events" USING btree ("event_type");