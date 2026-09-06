import { db } from '../../db';
import { products, gamesCatalog, auditTrails } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { calculateSellPrice, MarginType } from '../product/pricing.service';

export type BulkScope = 'all' | 'category' | 'gameId' | 'ids';

export async function bulkUpdateProductStatus(params: {
  isActive: boolean;
  scope: BulkScope;
  target?: string | string[];
}) {
  let targetProductIds: string[] = [];

  if (params.scope === 'all') {
    const all = await db.query.products.findMany({ columns: { id: true } });
    targetProductIds = all.map(p => p.id);
  } else if (params.scope === 'ids') {
    targetProductIds = Array.isArray(params.target) ? params.target : [String(params.target)];
  } else if (params.scope === 'gameId') {
    const matched = await db.query.products.findMany({
      where: eq(products.gameId, String(params.target)),
      columns: { id: true },
    });
    targetProductIds = matched.map(p => p.id);
  } else if (params.scope === 'category') {
    const games = await db.query.gamesCatalog.findMany({
      where: eq(gamesCatalog.category, String(params.target)),
      columns: { id: true },
    });
    const gameIds = games.map(g => g.id);
    if (gameIds.length > 0) {
      const matched = await db.query.products.findMany({
        where: inArray(products.gameId, gameIds),
        columns: { id: true },
      });
      targetProductIds = matched.map(p => p.id);
    }
  }

  if (targetProductIds.length > 0) {
    await db.update(products).set({
      isActive: params.isActive,
      updatedAt: new Date(),
    }).where(inArray(products.id, targetProductIds));
  }

  await db.insert(auditTrails).values({
    eventType: 'ADMIN_BULK_STATUS_UPDATE',
    rawRequest: params as any,
    rawResponse: { affectedCount: targetProductIds.length },
  });

  return { ok: true, affectedCount: targetProductIds.length };
}

export async function bulkUpdateProductMargin(params: {
  marginType: MarginType;
  marginValue: number | string;
  scope: BulkScope;
  target?: string | string[];
}) {
  let matchedProducts: { id: string; basePrice: string }[] = [];

  if (params.scope === 'all') {
    matchedProducts = await db.query.products.findMany({ columns: { id: true, basePrice: true } });
  } else if (params.scope === 'ids') {
    const ids = Array.isArray(params.target) ? params.target : [String(params.target)];
    matchedProducts = await db.query.products.findMany({
      where: inArray(products.id, ids),
      columns: { id: true, basePrice: true },
    });
  } else if (params.scope === 'gameId') {
    matchedProducts = await db.query.products.findMany({
      where: eq(products.gameId, String(params.target)),
      columns: { id: true, basePrice: true },
    });
  } else if (params.scope === 'category') {
    const games = await db.query.gamesCatalog.findMany({
      where: eq(gamesCatalog.category, String(params.target)),
      columns: { id: true },
    });
    const gameIds = games.map(g => g.id);
    if (gameIds.length > 0) {
      matchedProducts = await db.query.products.findMany({
        where: inArray(products.gameId, gameIds),
        columns: { id: true, basePrice: true },
      });
    }
  }

  let updatedCount = 0;
  for (const item of matchedProducts) {
    const newSellPrice = calculateSellPrice(item.basePrice, params.marginType, params.marginValue);
    await db.update(products).set({
      marginType: params.marginType,
      marginValue: String(params.marginValue),
      sellPrice: String(newSellPrice),
      updatedAt: new Date(),
    }).where(eq(products.id, item.id));
    updatedCount++;
  }

  await db.insert(auditTrails).values({
    eventType: 'ADMIN_BULK_MARGIN_UPDATE',
    rawRequest: params as any,
    rawResponse: { affectedCount: updatedCount },
  });

  return { ok: true, affectedCount: updatedCount };
}
