import fs from 'fs';

// Simulate what firebase-admin.ts does
const env = fs.readFileSync('/home/ubuntu/web_we3/.env','utf8');
for(const line of env.split('\n')){
  const idx = line.indexOf('=');
  if(idx>0){
    const k = line.slice(0,idx).trim();
    const v = line.slice(idx+1).trim();
    if(!process.env[k]) process.env[k] = v;
  }
}

const projectId   = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey      = process.env.FIREBASE_PRIVATE_KEY;
const privateKey  = rawKey ? rawKey.replace(/\\n/g, '\n') : undefined;

console.log('project_id=' + projectId);
console.log('client_email=' + clientEmail);
console.log('private_key_len=' + (privateKey?.length ?? 0));
console.log('private_key_has_begin=' + (privateKey?.includes('-----BEGIN PRIVATE KEY-----') ?? false));
console.log('all_present=' + !!(projectId && clientEmail && privateKey));

// Try actual init
try {
  const admin = await import('firebase-admin');
  if(!admin.default.apps.length){
    admin.default.initializeApp({
      credential: admin.default.credential.cert({ projectId, clientEmail, privateKey })
    });
  }
  const auth = admin.default.auth();
  console.log('FIREBASE_ADMIN_INIT=PASS');
} catch(e) {
  console.log('FIREBASE_ADMIN_INIT=FAIL: ' + e.message);
}
