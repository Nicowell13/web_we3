import { db } from '../../db';
import { products, auditTrails } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getActiveSupplier } from '../suppliers/supplierFactory';

/**
 * Product / Status Check – runs every 1 hour.
 *   • Fetch only supplier status fields (`buyer_product_status`, `seller_product_status`, `status`).
 *   • If any product becomes unavailable, mark `supplierStatus='off'` and deactivate (`isActive=false`).
 */
export async function runStatusCheck() {
  const supplier = await getActiveSupplier();
  if (!supplier.getProducts) throw new Error('Supplier does not support status list');
  const rawList = await supplier.getProducts();
  if (!Array.isArray(rawList)) throw new Error('Invalid status list');

  let deactivated = 0, activated = 0;
  for (const raw of rawList) {
    const sku = String(raw.buyer_sku_code ?? raw.sku ?? '').trim();
    if (!sku) continue;

    const existing = await db.query.products.findFirst({ where: eq(products.supplierProductCode, sku) });
    if (!existing) continue;

    const buyerOk = Boolean(raw.buyer_product_status);
    const sellerOk = Boolean(raw.seller_product_status);
    const statusOk = !raw.status || ['available', 'normal'].includes(String(raw.status).toLowerCase());
    const shouldBeActive = buyerOk && sellerOk && statusOk;

    if (shouldBeActive && !existing.isActive) {
      await db.update(products).set({ isActive: true }).where(eq(products.id, existing.id));
      activated++;
    } else if (!shouldBeActive && existing.isActive) {
      await db.update(products).set({ isActive: false, supplierStatus: 'off' }).where(eq(products.id, existing.id));
      deactivated++;
    }
  }

  await db.insert(auditTrails).values({
    eventType: 'DIGIFLAZZ_STATUS_CHECK',
    rawResponse: { deactivated, activated },
  });

  return { deactivated, activated };
}
