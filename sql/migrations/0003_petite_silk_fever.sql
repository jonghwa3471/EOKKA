CREATE TABLE "stock_prices" (
	"stock_price_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_prices_stock_price_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"stock_id" bigint NOT NULL,
	"trading_date" date NOT NULL,
	"open" bigint,
	"high" bigint,
	"low" bigint,
	"close" bigint NOT NULL,
	"volume" bigint,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock_prices" ADD CONSTRAINT "stock_prices_stock_id_stocks_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("stock_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_prices_stock_date_unique" ON "stock_prices" USING btree ("stock_id","trading_date");--> statement-breakpoint
CREATE INDEX "stock_prices_stock_date_idx" ON "stock_prices" USING btree ("stock_id","trading_date");