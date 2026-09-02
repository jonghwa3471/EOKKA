CREATE TABLE "managed_portfolios" (
	"managed_portfolio_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "managed_portfolios_managed_portfolio_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"name" text DEFAULT '내 포트폴리오' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"transitioned_at" timestamp with time zone,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "managed_portfolios" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "portfolio_transactions" (
	"portfolio_transaction_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portfolio_transactions_portfolio_transaction_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"managed_portfolio_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"stock_id" bigint NOT NULL,
	"transaction_type" text NOT NULL,
	"traded_on" date NOT NULL,
	"quantity" double precision NOT NULL,
	"unit_price" double precision NOT NULL,
	"currency" text NOT NULL,
	"exchange_rate" double precision DEFAULT 1 NOT NULL,
	"fee_krw" bigint DEFAULT 0 NOT NULL,
	"tax_krw" bigint DEFAULT 0 NOT NULL,
	"memo" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "managed_portfolios" ADD CONSTRAINT "managed_portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_managed_portfolio_id_managed_portfolios_managed_portfolio_id_fk" FOREIGN KEY ("managed_portfolio_id") REFERENCES "public"."managed_portfolios"("managed_portfolio_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_stock_id_stocks_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("stock_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "managed_portfolios_user_unique" ON "managed_portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portfolio_transactions_portfolio_date_idx" ON "portfolio_transactions" USING btree ("managed_portfolio_id","traded_on");--> statement-breakpoint
CREATE POLICY "manage-own-managed-portfolio" ON "managed_portfolios" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "managed_portfolios"."user_id") WITH CHECK ((select auth.uid()) = "managed_portfolios"."user_id");--> statement-breakpoint
CREATE POLICY "manage-own-portfolio-transactions" ON "portfolio_transactions" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "portfolio_transactions"."user_id") WITH CHECK ((select auth.uid()) = "portfolio_transactions"."user_id");