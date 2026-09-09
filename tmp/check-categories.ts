import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
dotenv.config({ path: '.env.local' }); dotenv.config();
const { db } = await import('../src/db');
const rows = await db.execute(sql.raw("select category, count(*)::int from games_catalog group by category order by category"));
console.log(JSON.stringify(rows));
process.exit(0);
