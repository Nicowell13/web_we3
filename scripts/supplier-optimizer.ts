/** Local-only supplier optimizer. Dry-run default; no product discovery because schema has no seller metrics. */
import { readFile } from 'node:fs/promises';

type Candidate = Record<string, unknown>;
const truth = (v: unknown) => ['ya', 'yes', 'true', 'aktif', 'normal'].includes(String(v ?? '').trim().toLowerCase());
export function hardFilter(row: Candidate) {
  const rating = Number(row.rating);
  const reviews = Number(row.reviews ?? row.review_count);
  return String(row.faktur_pajak ?? row.tax_invoice ?? '').toLowerCase() === 'tidak' && truth(row.multi) && rating >= 3 && reviews > 10 && ['aktif', 'normal'].includes(String(row.status ?? '').toLowerCase());
}
export function choose(rows: Candidate[]) {
  const valid = rows.filter((r) => hardFilter(r) && Number.isFinite(Number(r.price ?? r.cost_price)) && String(r.buyer_sku_code ?? r.sku ?? '').trim());
  const bySku = new Map<string, Candidate>();
  for (const row of valid) {
    const sku = String(row.buyer_sku_code ?? row.sku).trim();
    if (!bySku.has(sku) || Number(row.price ?? row.cost_price) < Number(bySku.get(sku)!.price ?? bySku.get(sku)!.cost_price)) bySku.set(sku, row);
  }
  return [...bySku.values()];
}
function log(event: string, data: Record<string, unknown>) { console.log(JSON.stringify({ event, at: new Date().toISOString(), ...data })); }
function arg(name: string) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; }
async function main() {
  if (process.argv.includes('--self-check')) { if (choose([{ buyer_sku_code: 'X', price: 10, faktur_pajak: 'Tidak', multi: 'Ya', rating: 3, reviews: 11, status: 'Normal' }]).length !== 1) throw new Error('self-check failed'); return; }
  const input = arg('--input');
  const rows: Candidate[] = input ? JSON.parse(await readFile(input, 'utf8')) : await (async () => { const { DigiflazzAdapter } = await import('../src/integrations/digiflazz/adapter'); return new DigiflazzAdapter(process.env.DIGIFLAZZ_USERNAME ?? '', process.env.DIGIFLAZZ_API_KEY ?? '').getProducts(); })();
  if (!Array.isArray(rows)) throw new Error('Input must be JSON array');
  const selected = choose(rows);
  log('supplier_optimizer_plan', { candidates: rows.length, selected: selected.length, mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', limitation: 'Product discovery unavailable: schema has no seller rating/review fields.' });
  if (!process.argv.includes('--apply')) return;
  const { db } = await import('../src/db'); const { products } = await import('../src/db/schema'); const { eq } = await import('drizzle-orm');
  for (const row of selected) { const sku = String(row.buyer_sku_code ?? row.sku).trim(); const price = String(row.price ?? row.cost_price); const updated = await db.update(products).set({ basePrice: price, supplierProductCode: sku, updatedAt: new Date() }).where(eq(products.sku, sku)).returning({ id: products.id }); log('supplier_optimizer_update', { sku, price, updated: updated.length }); }
}
if (import.meta.main) main().catch((error) => { log('supplier_optimizer_error', { message: error instanceof Error ? error.message : String(error) }); process.exitCode = 1; });
