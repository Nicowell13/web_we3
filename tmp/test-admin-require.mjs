// Test actual firebase-admin.ts behavior in Bun with dotenv
import * as dotenv from 'dotenv';
dotenv.config({ path: '/home/ubuntu/web_we3/.env' });

const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey      = process.env.FIREBASE_PRIVATE_KEY;
const privateKey  = rawKey ? rawKey.replace(/\\n/g, '\n') : undefined;

console.log('env_project=' + projectId);
console.log('env_email=' + clientEmail);
console.log('env_key_present=' + !!privateKey);
console.log('env_key_len=' + (privateKey?.length ?? 0));

let adminAuth = null;
try {
  const admin = require('firebase-admin');
  console.log('admin_loaded=yes');
  console.log('apps_before_init=' + admin.apps.length);
  if (!admin.apps.length) {
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
      console.log('init=cert');
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
      console.log('init=default');
    }
  }
  adminAuth = admin.auth();
  console.log('adminAuth=' + (adminAuth ? 'PASS' : 'NULL'));
} catch(e) {
  console.log('CATCH_ERROR=' + e.message);
}
