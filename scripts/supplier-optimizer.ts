/** Local-only supplier optimizer. Dry-run default; --apply updates existing DB rows. */
import { readFile } from 'node:fs/promises';

type Candidate = Record<string, unknown>;
const text = (v: unknown) => String(v ?? '').trim().toLowerCase();
const truth = (v: unknown) => ['ya', 'yes', 'true', '1'].includes(text(v));
const first = (row: Candidate, keys: string[]) => keys.map((key) => row[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '');

export function hardFilter(row: Candidate) {
  const fp = text(first(row, ['faktur_pajak', 'fp', 'tax_invoice']));
  const stock = text(first(row, ['stock', 'stok', 'buyer_product_status', 'status']));
  const rating = Number(first(row, ['rating', 'seller_rating']));
  const reviews = first(row, ['reviews', 'review_count', 'rating_qty']);
  return fp === 'tidak' && truth(first(row, ['multi', 'multi_transaction'])) && rating >= 3 &&
    (reviews === undefined || Number(reviews) > 10) && ['stok', 'available', 'aktif', 'normal', 'tersedia'].includes(stock);
}

export function choose(rows: Candidate[]) {
  const valid = rows.filter((r) => hardFilter(r) && Number.isFinite(Number(first(r, ['price', 'cost_price', 'buyer_product_price']))) && String(first(r, ['buyer_sku_code', 'sku'])).trim());
  const byProduct = new Map<string, Candidate>();
  for (const row of valid) {
    const key = text(first(row, ['product_name', 'buyer_product_name', 'name', 'buyer_sku_code', 'sku']));
    const price = Number(first(row, ['price', 'cost_price', 'buyer_product_price']));
    const old = byProduct.get(key);
    if (!old || price < Number(first(old, ['price', 'cost_price', 'buyer_product_price']))) byProduct.set(key, row);
  }
  return [...byProduct.values()];
}
function log(event: string, data: Record<string, unknown>) { console.log(JSON.stringify({ event, at: new Date().toISOString(), ...data })); }
function arg(name: string) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; }
async function main() {
  if (process.argv.includes('--self-check')) {
    const rows = [{ buyer_product_name: 'Telkomsel 5000', buyer_sku_code: 's5', buyer_product_price: 5000, faktur_pajak: 'Tidak', multi: 'Ya', rating: 3, rating_qty: 11, buyer_product_status: 'Stok' }];
    if (choose(rows).length !== 1) throw new Error('self-check failed'); return;
  }
  const input = arg('--input');
  const rows: Candidate[] = input ? JSON.parse(await readFile(input, 'utf8')) : await (async () => { const { DigiflazzAdapter } = await import('../src/integrations/digiflazz/adapter'); return new DigiflazzAdapter(process.env.DIGIFLAZZ_USERNAME ?? '', process.env.DIGIFLAZZ_API_KEY ?? '').getProducts(); })();
  if (!Array.isArray(rows)) throw new Error('Input must be JSON array');
  const selected = choose(rows);
  log('supplier_optimizer_plan', { candidates: rows.length, selected: selected.length, mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', source: input ? 'file' : 'Digiflazz API' });
  if (!process.argv.includes('--apply')) return;
  const { db } = await import('../src/db'); const { products } = await import('../src/db/schema'); const { eq } = await import('drizzle-orm');
  for (const row of selected) { const sku = String(first(row, ['buyer_sku_code', 'sku'])); const price = String(first(row, ['price', 'cost_price', 'buyer_product_price'])); const updated = await db.update(products).set({ basePrice: price, supplierProductCode: sku, updatedAt: new Date() }).where(eq(products.sku, sku)).returning({ id: products.id }); log('supplier_optimizer_update', { sku, price, updated: updated.length }); }
}
if (import.meta.main) main().catch((error) => { log('supplier_optimizer_error', { message: error instanceof Error ? error.message : String(error) }); process.exitCode = 1; });
