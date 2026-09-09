import 'dotenv/config';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { writeFileSync } from 'fs';
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
try {
  await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
  writeFileSync('tmp/migrate-result.json', JSON.stringify({ ok: true }));
} catch (error: any) {
  writeFileSync('tmp/migrate-result.json', JSON.stringify({ ok: false, name: error?.name, message: error?.message, code: error?.code, detail: error?.detail, cause: error?.cause && { name: error.cause.name, message: error.cause.message, code: error.cause.code, detail: error.cause.detail } }));
  process.exitCode = 1;
} finally { await client.end(); }
