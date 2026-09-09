import * as dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const email = 'rian.ikanhiasbjb@gmail.com';
const rows = await sql`
  UPDATE users
  SET role = 'admin', updated_at = NOW()
  WHERE email = ${email}
  RETURNING id, email, role, updated_at
`;

console.log(JSON.stringify({
  updated: rows.length,
  users: rows.map(({ id, email: value, role, updated_at }) => ({
    id: `${String(id).slice(0, 6)}…`,
    email: String(value).replace(/^(.{2}).*(@.*)$/, '$1***$2'),
    role,
    updated_at,
  })),
}, null, 2));

await sql.end();
