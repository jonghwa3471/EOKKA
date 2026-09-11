CREATE TABLE "analysis_rate_limits" (
	"identifier_hash" text NOT NULL,
	"window_on" date NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analysis_rate_limits_identifier_hash_window_on_pk" PRIMARY KEY("identifier_hash","window_on")
);
--> statement-breakpoint
ALTER TABLE "analysis_rate_limits" ENABLE ROW LEVEL SECURITY;
