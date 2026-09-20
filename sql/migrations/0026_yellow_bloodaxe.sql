CREATE TABLE "site_announcement_recipients" (
	"announcement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "site_announcement_recipients_announcement_id_user_id_pk" PRIMARY KEY("announcement_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "site_announcement_recipients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "site_announcement_recipients" ADD CONSTRAINT "site_announcement_recipients_announcement_id_site_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."site_announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_announcement_recipients" ADD CONSTRAINT "site_announcement_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_announcement_recipients_user_idx" ON "site_announcement_recipients" USING btree ("user_id");