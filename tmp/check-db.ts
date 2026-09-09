import 'dotenv/config';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL!);
const columns = await sql("select column_name from information_schema.columns where table_name='users' and column_name='referral_code'");
const tables = await sql("select table_name from information_schema.tables where table_schema='public' and table_name in ('point_ledger','referrals') order by table_name");
const migrations = await sql("select count(*)::int as count, max(created_at) as latest from drizzle.__drizzle_migrations");
console.log(JSON.stringify({ referralCode: columns.length === 1, tables: tables.map(x => x.table_name), migrations: migrations[0] }));
await sql.end();
