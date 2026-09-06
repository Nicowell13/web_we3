CREATE TYPE "public"."point_entry_type" AS ENUM('earn', 'spend', 'adjustment');--> statement-breakpoint
CREATE TABLE "point_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "point_entry_type" NOT NULL,
	"points" integer NOT NULL,
	"reference_id" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "point_ledger_user_id_idx" ON "point_ledger" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "point_ledger_type_reference_idx" ON "point_ledger" USING btree ("type","reference_id");