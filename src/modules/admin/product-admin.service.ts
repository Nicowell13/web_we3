import { db } from '../../db';
import { auditTrails, products } from '../../db/schema';
import { and, desc, eq, ilike, inArray } from 'drizzle-orm';

const columns = {
  id: products.id, gameId: products.gameId, sku: products.sku, denomination: products.denomination,
  basePrice: products.basePrice, sellPrice: products.sellPrice, supplierCode: products.supplierCode,
  supplierProductCode: products.supplierProductCode, brand: products.brand, productType: products.productType,
  marginType: products.marginType, marginValue: products.marginValue, supplierStatus: products.supplierStatus,
  isActive: products.isActive, syncedAt: products.syncedAt, updatedAt: products.updatedAt,
};

export async function listAdminProducts(search?: string, active?: boolean) {
  return db.select(columns).from(products).where(and(
    search ? ilike(products.denomination, `%${search}%`) : undefined,
    active === undefined ? undefined : eq(products.isActive, active),
  )).orderBy(desc(products.updatedAt)).limit(200);
}

export async function updateAdminProduct(id: string, patch: { isActive?: boolean; sellPrice?: string; marginType?: 'fixed' | 'percentage' | null; marginValue?: string | null }) {
  const current = await db.query.products.findFirst({ where: eq(products.id, id), columns: { id: true, basePrice: true } });
  if (!current) return null;
  const [updated] = await db.update(products).set({ ...patch, updatedAt: new Date() }).where(eq(products.id, id)).returning(columns);
  await db.insert(auditTrails).values({ eventType: 'PRODUCT_CHANGE', referenceId: id, rawRequest: patch });
  return updated;
}

export async function bulkUpdateProducts(ids: string[], isActive: boolean) {
  if (!ids.length) return 0;
  await db.update(products).set({ isActive, updatedAt: new Date() }).where(inArray(products.id, ids));
  await db.insert(auditTrails).values(ids.map((id) => ({ eventType: 'PRODUCT_CHANGE', referenceId: id, rawRequest: { isActive } })));
  return ids.length;
}
