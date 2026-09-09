import fs from 'fs';
const env = fs.readFileSync('/home/ubuntu/web_we3/.env','utf8');
const match = env.match(/^FIREBASE_PRIVATE_KEY=(.+)$/m);
if(match){
  const key = match[1].trim();
  console.log('len=' + key.length);
  console.log('has_begin=' + key.includes('-----BEGIN PRIVATE KEY-----'));
  console.log('has_end=' + key.includes('-----END PRIVATE KEY-----'));
  console.log('has_backslash_n=' + key.includes('\\n'));
  console.log('quoted=' + (key.startsWith('"') || key.startsWith("'")));
  console.log('first60=' + key.slice(0,60));
} else {
  console.log('NOT_FOUND');
}
