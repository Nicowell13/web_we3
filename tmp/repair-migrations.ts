import 'dotenv/config';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
try {
  await sql.begin(async tx => {
    await tx.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS user_vouchers_user_voucher_idx ON user_vouchers (user_id, voucher_id)`);
    await tx.unsafe(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key text`);
    await tx.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_key_idx ON transactions (idempotency_key)`);
    await tx.unsafe(`DO $$ BEGIN CREATE TYPE point_entry_type AS ENUM ('earn','spend','adjustment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS point_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type point_entry_type NOT NULL, points integer NOT NULL, reference_id text NOT NULL,
      description text, created_at timestamptz DEFAULT now() NOT NULL
    )`);
    await tx.unsafe(`CREATE INDEX IF NOT EXISTS point_ledger_user_id_idx ON point_ledger (user_id)`);
    await tx.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS point_ledger_type_reference_idx ON point_ledger (type, reference_id)`);
    await tx.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text`);
    await tx.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_idx ON users (referral_code)`);
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS referrals (
      referred_user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      referrer_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      qualifying_order_id text REFERENCES transactions(order_id) ON DELETE SET NULL,
      reward_points integer DEFAULT 0 NOT NULL, rewarded_at timestamptz,
      created_at timestamptz DEFAULT now() NOT NULL
    )`);
    await tx.unsafe(`CREATE INDEX IF NOT EXISTS referrals_referrer_user_id_idx ON referrals (referrer_user_id)`);
    await tx.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS referrals_qualifying_order_idx ON referrals (qualifying_order_id)`);
  });
  console.log('migration repair applied');
} finally { await sql.end(); }
