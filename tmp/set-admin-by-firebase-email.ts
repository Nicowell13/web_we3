import * as dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });
const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const email = 'rian.ikanhiasbjb@gmail.com';
const firebaseUser = await admin.auth().getUserByEmail(email);
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
const rows = await sql`
  UPDATE users
  SET email = ${email}, role = 'admin', updated_at = NOW()
  WHERE id = ${firebaseUser.uid}
  RETURNING id, email, role, updated_at
`;

console.log(JSON.stringify({
  updated: rows.length,
  user: rows[0] ? {
    id: `${String(rows[0].id).slice(0, 6)}…`,
    email: 'ri***b@gmail.com',
    role: rows[0].role,
    updated_at: rows[0].updated_at,
  } : null,
}, null, 2));
await sql.end();
