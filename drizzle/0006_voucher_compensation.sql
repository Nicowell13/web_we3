ALTER TYPE "public"."voucher_type" ADD VALUE IF NOT EXISTS 'compensation';--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "target_user_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
