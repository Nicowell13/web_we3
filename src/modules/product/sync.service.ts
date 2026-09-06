import { db } from '../../db';
import { products, gamesCatalog, auditTrails } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { getActiveSupplier } from '../suppliers/supplierFactory';
import { calculateSellPrice, MarginType } from './pricing.service';

export type SyncResult = {
  totalFetched: number;
  updatedCount: number;
  insertedCount: number;
  recalculatedCount: number;
};

/**
 * Syncs supplier product list with database products and recalculates selling prices dynamically.
 */
export async function syncDigiflazzProducts(): Promise<SyncResult> {
  const supplier = await getActiveSupplier();
  const rawList = await supplier.getProducts();

  let updatedCount = 0;
  let insertedCount = 0;
  let recalculatedCount = 0;

  if (!Array.isArray(rawList)) {
    throw new Error('Supplier did not return a valid products array');
  }

  // Pre-fetch all catalog game slugs to map products
  const catalogs = await db.query.gamesCatalog.findMany({ columns: { id: true, category: true, name: true } });
  const catalogMap = new Map(catalogs.map(c => [c.id, c]));

  for (const item of rawList) {
    if (!item.buyer_sku_code || item.price === undefined) continue;

    const sku = item.buyer_sku_code;
    const basePrice = Number(item.price);
    const brand = item.brand || 'General';
    const category = item.category || 'Game';

    // Normalize or match gameId
    const gameId = brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general';

    // Ensure parent game/service catalog exists if needed
    if (!catalogMap.has(gameId)) {
      await db.insert(gamesCatalog).values({
        id: gameId,
        name: brand,
        publisher: 'Digiflazz Supplier',
        category: category,
        thumbnailUrl: `/providers/${gameId}.png`,
        isActive: true,
      }).onConflictDoNothing();
      catalogMap.set(gameId, { id: gameId, category, name: brand });
    }

    const existing = await db.query.products.findFirst({
      where: eq(products.supplierProductCode, sku),
    });

    const isSupplierAvailable = Boolean(item.buyer_product_status && item.seller_product_status);
    const supplierStatus = isSupplierAvailable ? 'available' : 'unavailable';

    if (existing) {
      const marginType = (existing.marginType as MarginType) || 'percentage';
      const marginValue = Number(existing.marginValue ?? 5);
      const newSellPrice = calculateSellPrice(basePrice, marginType, marginValue);

      await db.update(products).set({
        basePrice: String(basePrice),
        sellPrice: String(newSellPrice),
        supplierStatus,
        syncedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(products.id, existing.id));

      updatedCount++;
      if (marginType === 'percentage') {
        recalculatedCount++;
      }
    } else {
      const defaultMarginType: MarginType = 'percentage';
      const defaultMarginValue = 5;
      const initialSellPrice = calculateSellPrice(basePrice, defaultMarginType, defaultMarginValue);

      await db.insert(products).values({
        gameId,
        sku,
        denomination: item.product_name || sku,
        basePrice: String(basePrice),
        sellPrice: String(initialSellPrice),
        supplierCode: 'digiflazz',
        supplierProductCode: sku,
        brand,
        productType: item.type || 'prepaid',
        marginType: defaultMarginType,
        marginValue: String(defaultMarginValue),
        supplierStatus,
        isActive: isSupplierAvailable,
        syncedAt: new Date(),
      });

      insertedCount++;
    }
  }

  await db.insert(auditTrails).values({
    eventType: 'DIGIFLAZZ_PRODUCTS_SYNCED',
    rawResponse: {
      totalFetched: rawList.length,
      updatedCount,
      insertedCount,
      recalculatedCount,
    },
  });

  return {
    totalFetched: rawList.length,
    updatedCount,
    insertedCount,
    recalculatedCount,
  };
}
