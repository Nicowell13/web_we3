import { db } from '../src/db';
import { sql } from 'drizzle-orm';
await db.execute(sql.raw(`ALTER TYPE "public"."voucher_type" ADD VALUE IF NOT EXISTS 'compensation'`));
await db.execute(sql.raw(`ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "target_user_id" text REFERENCES "public"."users"("id") ON DELETE cascade`));
console.log('voucher migration applied');
process.exit(0);
