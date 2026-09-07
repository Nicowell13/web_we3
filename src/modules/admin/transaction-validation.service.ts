import { db } from '../../db';
import { products, auditTrails } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getActiveSupplier } from '../suppliers/supplierFactory';
import { calculateSellPrice, MarginType } from '../product/pricing.service';

/**
 * Validate transaction price before sending order to Digiflazz.
 * Called inside `advanceTransaction` when moving from PAID → PROCESSING.
 */
export async function validateTransactionPrice(orderId: string) {
  // 1. Load transaction & product
  const tx = await db.query.transactions.findFirst({ where: eq(transactions.orderId, orderId) });
  if (!tx) throw new Error(`Transaction not found: ${orderId}`);

  const prod = await db.query.products.findFirst({ where: eq(products.id, tx.productId) });
  if (!prod) throw new Error(`Product not found for transaction ${orderId}`);

  // 2. Ensure latest base price (price‑sync already ran)
  const latestBase = Number(prod.basePrice);
  const currentSell = Number(prod.sellPrice);

  if (currentSell < latestBase) {
    // price shrink – admin must review
    await db.update(transactions).set({ status: 'NEEDS_ADMIN_ACTION', updatedAt: new Date() }).where(eq(transactions.orderId, orderId));
    await db.insert(auditTrails).values({
      eventType: 'DIGIFLAZZ_TX_VALIDATION_FAIL',
      rawResponse: { orderId, reason: 'sellPrice lower than basePrice', base: latestBase, sell: currentSell },
    });
    return { ok: false, reason: 'sellPrice lower than basePrice' };
  }

  // 3. Build Digiflazz order payload with max_price safeguard
  const supplier = await getActiveSupplier();
  const maxPrice = latestBase * 1.05; // allow 5 % margin bump
  const payload = {
    username: supplier.username,
    buyer_sku_code: prod.sku,
    customer_no: tx.targetId,
    ref_id: tx.orderId,
    sign: '' as string, // will be generated inside DigiflazzAdapter.createOrder
    max_price: Math.ceil(maxPrice),
  };

  await db.insert(auditTrails).values({
    eventType: 'DIGIFLAZZ_TX_VALIDATION_PASS',
    rawResponse: { orderId, maxPrice, payload },
  });
  return { ok: true, payload };
}
