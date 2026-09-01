let adminAuth: any = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
  adminAuth = admin.auth();
} catch {
  // In test environments or when firebase-admin is not installed, leave adminAuth undefined
}
export { adminAuth };