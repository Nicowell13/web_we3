import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
dotenv.config({ path: '.env.local' }); dotenv.config();
const { db } = await import('../src/db');
const [counts, latest, games] = await Promise.all([
  db.execute(sql.raw("select count(*)::int total, count(*) filter (where supplier_code='digiflazz')::int digiflazz, count(*) filter (where supplier_code='digiflazz' and synced_at is not null)::int synced from products")),
  db.execute(sql.raw("select sku, denomination, brand, product_type, supplier_status, synced_at from products where supplier_code='digiflazz' order by synced_at desc nulls last limit 10")),
  db.execute(sql.raw("select count(*)::int total, array_agg(id order by id) ids from games_catalog")),
]);
console.log(JSON.stringify({ counts, latest, games }));
process.exit(0);
