CREATE TABLE "auth_request_rate_limits" (
	"identifier_hash" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_request_rate_limits_identifier_hash_window_started_at_pk" PRIMARY KEY("identifier_hash","window_started_at")
);
--> statement-breakpoint
ALTER TABLE "auth_request_rate_limits" ENABLE ROW LEVEL SECURITY;