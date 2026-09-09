import * as dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const rows = await sql`SELECT email, role FROM users ORDER BY created_at DESC LIMIT 10`;
const mask = (email: string) => {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
};
console.log(rows.map((row) => ({ email: mask(String(row.email)), role: row.role })));
await sql.end();
