import { db } from '../../db';
import { gamesCatalog, products } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function mapDigiflazzProduct(item: Record<string, unknown>) {
  const sku = String(item.buyer_sku_code ?? item.sku ?? '').trim();
  const brand = String(item.brand ?? '').trim();
  const gameKey = normalize(item.game_id ?? brand);
  const price = String(item.price ?? item.cost_price ?? '').trim();
  return {
    sku,
    brand: brand || null,
    gameKey,
    productType: String(item.type ?? item.product_type ?? '').trim() || null,
    denomination: String(item.product_name ?? item.desc ?? sku).trim(),
    costPrice: price,
    supplierStatus: String(item.status ?? 'available').trim() || 'available',
    valid: Boolean(sku && gameKey && /^\\d+(\\.\\d{1,2})?$/.test(price) && Number(price) >= 0),
  };
}
import { getActiveSupplier } from '../suppliers/supplierFactory';

export async function syncDigiflazzProducts() {
  const supplier = await getActiveSupplier();
  if (!supplier.getProducts) throw new Error('Active supplier does not support product sync');
  const incoming = await supplier.getProducts();
  if (!Array.isArray(incoming)) throw new Error('Digiflazz product response is invalid');
  const games = await db.query.gamesCatalog.findMany({ columns: { id: true, name: true } });
  const gameByKey = new Map(games.flatMap((game) => [[normalize(game.id), game], [normalize(game.name), game]]));
  let created = 0, updated = 0, unchanged = 0, failed = 0;

  for (const raw of incoming) {
    const item = mapDigiflazzProduct(raw as Record<string, unknown>);
    const game = gameByKey.get(item.gameKey);
    if (!item.valid || !game) { failed++; continue; }
    try {
      const existing = await db.query.products.findFirst({ where: and(eq(products.supplierCode, 'digiflazz'), eq(products.supplierProductCode, item.sku)) });
      const now = new Date();
      if (existing) {
        const changes = { gameId: game.id, denomination: item.denomination, basePrice: item.costPrice, brand: item.brand, productType: item.productType, supplierStatus: item.supplierStatus, syncedAt: now, updatedAt: now };
        const same = existing.gameId === game.id && existing.denomination === item.denomination && existing.basePrice === item.costPrice && existing.brand === item.brand && existing.productType === item.productType && existing.supplierStatus === item.supplierStatus;
        if (same) { unchanged++; continue; }
        await db.update(products).set(changes).where(eq(products.id, existing.id));
        updated++;
      } else {
        await db.insert(products).values({ gameId: game.id, sku: item.sku, denomination: item.denomination, basePrice: item.costPrice, sellPrice: item.costPrice, supplierCode: 'digiflazz', supplierProductCode: item.sku, brand: item.brand, productType: item.productType, supplierStatus: item.supplierStatus, isActive: false, syncedAt: now });
        created++;
      }
    } catch { failed++; }
  }
  return { created, updated, unchanged, failed, total: incoming.length };
}
