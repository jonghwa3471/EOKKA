CREATE TABLE "admin_members" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_announcements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_announcements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" uuid,
	"is_staff" text DEFAULT 'no' NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_tickets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_members" ADD CONSTRAINT "admin_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_announcements" ADD CONSTRAINT "site_announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_messages_ticket_idx" ON "support_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_user_idx" ON "support_tickets" USING btree ("user_id","created_at");
--> statement-breakpoint
REVOKE ALL ON admin_members, support_tickets, support_messages, site_announcements FROM anon, authenticated;
