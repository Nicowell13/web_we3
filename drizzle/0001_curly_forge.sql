CREATE TYPE "public"."article_status" AS ENUM('draft', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'banned');--> statement-breakpoint
CREATE TYPE "public"."voucher_type" AS ENUM('new_user', 'promo', 'loyalty_points');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'editor';--> statement-breakpoint
CREATE TABLE "article_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"focus_keyword" text,
	"meta_description" text,
	"content_html" text NOT NULL,
	"cover_image_url" text,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"generated_by" text DEFAULT 'manual' NOT NULL,
	"associated_game_id" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"publish_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "margin_type" "discount_type";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "margin_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "supplier_status" text DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_reason" text;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "voucher_type" "voucher_type" DEFAULT 'promo' NOT NULL;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "daily_limit" integer;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "start_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "article_faqs" ADD CONSTRAINT "article_faqs_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_associated_game_id_games_catalog_id_fk" FOREIGN KEY ("associated_game_id") REFERENCES "public"."games_catalog"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_faqs_article_id_idx" ON "article_faqs" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "products_supplier_sku_idx" ON "products" USING btree ("supplier_code","supplier_product_code");--> statement-breakpoint
CREATE INDEX "vouchers_type_idx" ON "vouchers" USING btree ("voucher_type");