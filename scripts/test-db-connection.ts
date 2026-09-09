import * as fs from 'fs';
import * as dotenv from 'dotenv';
import postgres from 'postgres';

const parsed = dotenv.parse(fs.readFileSync('.env.local'));
let url = parsed.DATABASE_URL;

const match = url.match(/^postgresql:\/\/([^:]+):(.*)@([^@]+)$/);
if (match) {
  const [, user, pass, hostAndDb] = match;
  // Properly encode the password
  let cleanPass = pass;
  if (cleanPass.includes('%fP92') || cleanPass.includes('%')) {
    cleanPass = cleanPass.replace(/%/g, '%25');
  }
  const fixedUrl = `postgresql://${user}:${cleanPass}@${hostAndDb}`;

  async function test() {
    try {
      const sql = postgres(fixedUrl, { connect_timeout: 7 });
      const r = await sql.unsafe('SELECT now() as server_time, current_database() as db');
      console.log('CONNECTED TO SUPABASE DATABASE:', r);
      await sql.end();

      // Write back to .env.local
      let content = fs.readFileSync('.env.local', 'utf8');
      content = content.replace(/^DATABASE_URL=.*/m, `DATABASE_URL="${fixedUrl}"`);
      fs.writeFileSync('.env.local', content, 'utf8');
      console.log('Successfully saved valid DATABASE_URL to .env.local');
    } catch (e: any) {
      console.error('Connection test error:', e.message);
    }
  }
  test();
}
