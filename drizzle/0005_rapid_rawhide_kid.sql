CREATE TABLE "referrals" (
	"referred_user_id" text PRIMARY KEY NOT NULL,
	"referrer_user_id" text NOT NULL,
	"qualifying_order_id" text,
	"reward_points" integer DEFAULT 0 NOT NULL,
	"rewarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_qualifying_order_id_transactions_order_id_fk" FOREIGN KEY ("qualifying_order_id") REFERENCES "public"."transactions"("order_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referrals_referrer_user_id_idx" ON "referrals" USING btree ("referrer_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_qualifying_order_idx" ON "referrals" USING btree ("qualifying_order_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");