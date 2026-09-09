import { db } from '../src/db';
import { products, gamesCatalog } from '../src/db/schema';
import { eq } from 'drizzle-orm';
const rows = await db.select({ category: gamesCatalog.category, group: gamesCatalog.name, gameId: products.gameId, type: products.productType, name: products.denomination, brand: products.brand, status: products.supplierStatus }).from(products).innerJoin(gamesCatalog, eq(products.gameId, gamesCatalog.id));
const operator = rows.filter(r => r.status === 'available' && /telkomsel|indosat|xl|axis|tri|smartfren|by\.u/i.test(`${r.brand} ${r.group}`));
const keywords = /data|kuota|internet|\bgb\b|unlimited|combo|flash|freedom/i;
const mismatches = operator.filter(r => (keywords.test(`${r.type} ${r.name}`) ? r.category !== 'Data' : r.category !== 'Pulsa'));
console.log(JSON.stringify({ total: rows.length, operator: operator.length, mismatches: mismatches.length, examples: mismatches.slice(0, 20) }, null, 2));
process.exit(0);
