import { db } from '../../db';
import { auditTrails, gamesCatalog, products } from '../../db/schema';
import { and, desc, eq, ilike, inArray } from 'drizzle-orm';

export function calculatePriceFromMargin(basePrice: number, marginType: 'fixed' | 'percentage', marginValue: number) {
  if (!Number.isFinite(basePrice) || basePrice < 0 || !Number.isFinite(marginValue) || marginValue < 0) throw new Error('Invalid pricing values');
  if (marginType === 'percentage' && marginValue > 100) throw new Error('Percentage margin cannot exceed 100');
  return Number((basePrice + (marginType === 'percentage' ? basePrice * marginValue / 100 : marginValue)).toFixed(2));
}

const columns = {
  id: products.id, gameId: products.gameId, sku: products.sku, denomination: products.denomination,
  basePrice: products.basePrice, sellPrice: products.sellPrice, supplierCode: products.supplierCode,
  supplierProductCode: products.supplierProductCode, brand: products.brand, productType: products.productType,
  marginType: products.marginType, marginValue: products.marginValue, supplierStatus: products.supplierStatus,
  isActive: products.isActive, syncedAt: products.syncedAt, updatedAt: products.updatedAt,
  category: gamesCatalog.category, groupName: gamesCatalog.name,
};

export async function getProductSummary() {
  const rows = await db.select({ category: gamesCatalog.category, groupName: gamesCatalog.name, isActive: products.isActive, syncedAt: products.syncedAt }).from(products).innerJoin(gamesCatalog, eq(products.gameId, gamesCatalog.id));
  const order = ['Game', 'Pulsa', 'PLN', 'E-Wallet', 'Voucher', 'Other'];
  const map = new Map<string, { name: string; count: number; activeCount: number; groups: Map<string, { name: string; count: number; activeCount: number }> }>();
  for (const row of rows) {
    const category = row.category || 'Other';
    const groupName = row.groupName || 'Other';
    let bucket = map.get(category);
    if (!bucket) { bucket = { name: category, count: 0, activeCount: 0, groups: new Map() }; map.set(category, bucket); }
    bucket.count++;
    if (row.isActive) bucket.activeCount++;
    let group = bucket.groups.get(groupName);
    if (!group) { group = { name: groupName, count: 0, activeCount: 0 }; bucket.groups.set(groupName, group); }
    group.count++;
    if (row.isActive) group.activeCount++;
  }
  const categories = [...map.values()].sort((a, b) => (order.indexOf(a.name) < 0 ? 99 : order.indexOf(a.name)) - (order.indexOf(b.name) < 0 ? 99 : order.indexOf(b.name))).map(({ groups, ...category }) => ({ ...category, groups: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name)) }));
  const synced = rows.map(row => row.syncedAt).filter((value): value is Date => value instanceof Date);
  return { categories, totalProducts: rows.length, activeProducts: rows.filter(row => row.isActive).length, lastSyncedAt: synced.sort((a, b) => b.getTime() - a.getTime())[0] ?? null };
}

export async function listAdminProducts(search?: string, active?: boolean, supplierStatus?: string) {
  const term = search?.trim();
  const status = supplierStatus?.trim();
  return db.select(columns).from(products).innerJoin(gamesCatalog, eq(products.gameId, gamesCatalog.id)).where(and(
    term ? ilike(products.denomination, `%${term}%`) : undefined,
    active === undefined ? undefined : eq(products.isActive, active),
    status ? eq(products.supplierStatus, status) : undefined,
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
