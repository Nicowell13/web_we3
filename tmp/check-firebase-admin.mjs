import { adminAuth } from '../src/lib/firebase-admin.ts';
console.log(adminAuth ? 'FIREBASE_ADMIN_INIT=PASS' : 'FIREBASE_ADMIN_INIT=FAIL');
