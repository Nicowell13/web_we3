import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/wetri';

const client = postgres(connectionString, {
  prepare: false, // Recommended for Supabase transaction pooler
});

export const db = drizzle(client, { schema });
