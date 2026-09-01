import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

let adminAuth: any = null;

try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }
  adminAuth = admin.auth();
} catch (e) {
  // In test environments or when firebase-admin is not installed, leave adminAuth undefined
}

export { adminAuth };
