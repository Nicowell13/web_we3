import { db } from '../../db';
import { products, gamesCatalog, auditTrails } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getActiveSupplier } from '../suppliers/supplierFactory';
import { calculateSellPrice, MarginType } from '../product/pricing.service';

/**
 * Price Sync – runs every 4 hours.
 *   • Fetch full price‑list from Digiflazz.
 *   • Update `basePrice` for existing products.
 *   • Re‑calculate `sellPrice` using stored margin.
 *   • Insert new products (inactive by default).
 */
export async function runPriceSync() {
  const supplier = await getActiveSupplier();
  if (!supplier.getProducts) throw new Error('Supplier does not support price list');
  const rawProducts = await supplier.getProducts();
  if (!Array.isArray(rawProducts)) throw new Error('Invalid Digiflazz price list');

  const catalogMap = new Map<string, { id: string; category: string }>();
  const catalogs = await db.query.gamesCatalog.findMany({ columns: { id: true, category: true } });
  catalogs.forEach(c => catalogMap.set(c.id, { id: c.id, category: c.category }));

  let updated = 0, inserted = 0, recalculated = 0;
  for (const raw of rawProducts) {
    const sku = String(raw.buyer_sku_code ?? raw.sku ?? '').trim();
    const basePrice = Number(raw.price);
    if (!sku || isNaN(basePrice)) continue;

    // ---- Classification (reuse existing helper) ----
    const classification = (await import('./product-sync.service')).classifyDigiflazzProduct(raw as any);
    const gameKey = classification.groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const category = classification.category;

    // Ensure catalog entry exists
    if (!catalogMap.has(gameKey)) {
      const [newCat] = await db.insert(gamesCatalog).values({
        id: gameKey,
        name: classification.groupName,
        publisher: 'Digiflazz',
        category,
        thumbnailUrl: '/logo.webp',
        isActive: true,
      }).onConflictDoNothing().returning({ id: gamesCatalog.id, category: gamesCatalog.category });
      if (newCat) catalogMap.set(gameKey, { id: newCat.id, category: newCat.category });
    }

    const existing = await db.query.products.findFirst({
      where: eq(products.supplierProductCode, sku),
    });

    if (existing) {
      // Update base price and recompute sell price if margin present
      const marginType: MarginType = (existing.marginType as MarginType) || 'percentage';
      const marginVal = Number(existing.marginValue ?? 5);
      const newSell = calculateSellPrice(basePrice, marginType, marginVal);

      await db.update(products).set({
        basePrice: String(basePrice),
        sellPrice: String(newSell),
        syncedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(products.id, existing.id));
      updated++;
      if (marginType === 'percentage') recalculated++;
    } else {
      // Insert new product – inactive until supplier marks it available
      await db.insert(products).values({
        gameId: catalogMap.get(gameKey)!.id,
        sku,
        denomination: String(raw.product_name ?? raw.desc ?? sku),
        basePrice: String(basePrice),
        sellPrice: String(basePrice), // start at cost, admin can set margin later
        supplierCode: 'digiflazz',
        supplierProductCode: sku,
        brand: String(raw.brand ?? ''),
        productType: classification.subCategory,
        supplierStatus: 'available',
        isActive: false,
        syncedAt: new Date(),
      });
      inserted++;
    }
  }

  await db.insert(auditTrails).values({
    eventType: 'DIGIFLAZZ_PRICE_SYNC_SUCCESS',
    referenceId: 'scheduled-price-sync',
    rawResponse: { updated, inserted, recalculated },
  });

  return { updated, inserted, recalculated };
}
