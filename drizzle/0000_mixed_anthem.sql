CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'PAID', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "audit_trails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"reference_id" text NOT NULL,
	"raw_request" jsonb,
	"raw_response" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"publisher" text NOT NULL,
	"category" text NOT NULL,
	"thumbnail_url" text NOT NULL,
	"banner_url" text,
	"requires_server_id" boolean DEFAULT false NOT NULL,
	"input_placeholder" text DEFAULT 'User ID' NOT NULL,
	"server_placeholder" text,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" text NOT NULL,
	"sku" text NOT NULL,
	"denomination" text NOT NULL,
	"base_price" numeric(12, 2) NOT NULL,
	"sell_price" numeric(12, 2) NOT NULL,
	"supplier_code" text DEFAULT 'digiflazz' NOT NULL,
	"supplier_product_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "system_configs" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"order_id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"product_id" uuid NOT NULL,
	"target_user_id" text NOT NULL,
	"target_server_id" text,
	"customer_phone" text,
	"customer_email" text,
	"amount" numeric(12, 2) NOT NULL,
	"original_amount" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"voucher_code" text,
	"points_used" integer DEFAULT 0 NOT NULL,
	"points_earned" integer DEFAULT 0 NOT NULL,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"payment_method" text,
	"payment_invoice_url" text,
	"payment_reference" text,
	"supplier_reference" text,
	"supplier_sn" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"voucher_id" uuid NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp with time zone,
	"obtained_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_checkin_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"discount_type" "discount_type" NOT NULL,
	"discount_value" numeric(12, 2) NOT NULL,
	"min_purchase" numeric(12, 2) DEFAULT '0' NOT NULL,
	"max_discount" numeric(12, 2),
	"quota" integer DEFAULT 100 NOT NULL,
	"quota_used" integer DEFAULT 0 NOT NULL,
	"points_required" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vouchers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_game_id_games_catalog_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vouchers" ADD CONSTRAINT "user_vouchers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vouchers" ADD CONSTRAINT "user_vouchers_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_trails_event_type_idx" ON "audit_trails" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_trails_reference_id_idx" ON "audit_trails" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "audit_trails_created_at_idx" ON "audit_trails" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "games_catalog_category_idx" ON "games_catalog" USING btree ("category");--> statement-breakpoint
CREATE INDEX "games_catalog_active_idx" ON "games_catalog" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "products_game_id_idx" ON "products" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_active_idx" ON "products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "system_configs_active_idx" ON "system_configs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_vouchers_user_id_idx" ON "user_vouchers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_vouchers_is_used_idx" ON "user_vouchers" USING btree ("is_used");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "vouchers_code_idx" ON "vouchers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "vouchers_active_idx" ON "vouchers" USING btree ("is_active");