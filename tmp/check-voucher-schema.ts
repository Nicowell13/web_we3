import { db } from './src/db';
import { sql } from 'drizzle-orm';
console.log(JSON.stringify(await db.execute(sql`select column_name,data_type,udt_name from information_schema.columns where table_name='vouchers' order by ordinal_position`), null, 2));
console.log(JSON.stringify(await db.execute(sql`select enumlabel from pg_enum join pg_type on pg_enum.enumtypid=pg_type.oid where typname='voucher_type' order by enumsortorder`), null, 2));
process.exit(0);
