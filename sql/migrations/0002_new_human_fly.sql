CREATE TABLE "stocks" (
	"stock_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stocks_stock_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"name_en" text,
	"ticker" text NOT NULL,
	"country" text NOT NULL,
	"exchange" text NOT NULL,
	"currency" text NOT NULL,
	"security_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "stocks_exchange_ticker_unique" ON "stocks" USING btree ("exchange","ticker");--> statement-breakpoint
CREATE INDEX "stocks_name_idx" ON "stocks" USING btree ("name");--> statement-breakpoint
CREATE INDEX "stocks_name_en_idx" ON "stocks" USING btree ("name_en");--> statement-breakpoint
CREATE INDEX "stocks_ticker_idx" ON "stocks" USING btree ("ticker");--> statement-breakpoint
CREATE POLICY "public-read-stocks-policy" ON "stocks" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);