CREATE TABLE "developer_portfolio_snapshots" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "developer_portfolio_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"as_of" date NOT NULL,
	"snapshot" jsonb NOT NULL,
	"published_by" uuid,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "developer_portfolio_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "developer_portfolio_snapshots" ADD CONSTRAINT "developer_portfolio_snapshots_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "developer_portfolio_snapshots_as_of_unique" ON "developer_portfolio_snapshots" USING btree ("as_of");--> statement-breakpoint
CREATE INDEX "developer_portfolio_snapshots_published_idx" ON "developer_portfolio_snapshots" USING btree ("published_at");