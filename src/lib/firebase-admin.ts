import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

let adminAuth: any = null;

try {
  // Bun may return ESM namespace; unwrap .default if needed
  const _mod = require('firebase-admin');
  const admin = _mod?.default ?? _mod;
  const appsArr: any[] = admin.apps ?? [];
  if (!appsArr.length) {
    const projectId   = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey  = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
  }
  adminAuth = admin.auth();
} catch (e: any) {
  console.error('[firebase-admin] init error:', e?.message ?? e);
}

export { adminAuth };
