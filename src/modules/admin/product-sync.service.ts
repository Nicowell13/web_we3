import { db } from '../../db';
import { gamesCatalog, products } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { getActiveSupplier } from '../suppliers/supplierFactory';

export async function syncDigiflazzProducts() {
  const supplier = await getActiveSupplier();
  if (!supplier.getProducts) throw new Error('Active supplier does not support product sync');
  const incoming = await supplier.getProducts();
  const items = Array.isArray(incoming) ? incoming : [];
  let created = 0, updated = 0, unchanged = 0, failed = 0;

  for (const item of items) {
    const sku = String(item.buyer_sku_code ?? item.sku ?? '').trim();
    const gameId = String(item.game_id ?? item.brand ?? '').trim().toLowerCase();
    if (!sku || !gameId) { failed++; continue; }
    const game = await db.query.gamesCatalog.findFirst({ where: eq(gamesCatalog.id, gameId), columns: { id: true } });
    if (!game) { failed++; continue; }
    const costPrice = String(item.price ?? item.cost_price ?? '0');
    const existing = await db.query.products.findFirst({
      where: and(eq(products.supplierCode, 'digiflazz'), eq(products.supplierProductCode, sku)),
    });
    if (existing) {
      await db.update(products).set({ basePrice: costPrice, supplierStatus: String(item.status ?? 'available'), syncedAt: new Date(), updatedAt: new Date() }).where(eq(products.id, existing.id));
      updated++;
    } else {
      await db.insert(products).values({ gameId: game.id, sku, denomination: String(item.product_name ?? item.desc ?? sku), basePrice: costPrice, sellPrice: costPrice, supplierCode: 'digiflazz', supplierProductCode: sku, supplierStatus: String(item.status ?? 'available'), isActive: false, syncedAt: new Date() });
      created++;
    }
  }
  return { created, updated, unchanged, failed, total: items.length };
}
