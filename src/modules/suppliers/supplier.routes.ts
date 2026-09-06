import { Elysia } from 'elysia';
import { requireRole } from '../../middleware/auth';
import { getActiveSupplier, resolveSupplier } from './supplierFactory';
import { db } from '../../db';
import { auditTrails, systemConfigs, transactions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { advanceTransaction } from '../transaction/transaction.service';

/**
 * Public supplier routes (no auth required).
 */
export const supplierPublicRoutes = new Elysia({ prefix: '/api/v1/supplier' })
  .get('/active', async () => {
    try {
      const row = await db.query.systemConfigs.findFirst({
        where: eq(systemConfigs.key, 'ACTIVE_SUPPLIER'),
      });
      return { supplier: row?.value ?? 'digiflazz', isActive: row?.isActive ?? true };
    } catch {
      return { supplier: 'digiflazz', isActive: true };
    }
  });

/**
 * Admin-only supplier routes.
 */
export const supplierAdminRoutes = new Elysia({ prefix: '/api/v1/supplier' })
  .use(requireRole('admin'))

  .get('/balance', async () => {
    const supplier = await getActiveSupplier();
    const balance = await supplier.checkBalance();
    return { ok: true, balance };
  })

  .post('/orders/:orderId/reconcile', async ({ params, set }) => {
    const tx = await db.query.transactions.findFirst({ where: eq(transactions.orderId, params.orderId) });
    if (!tx || !['PAID', 'PROCESSING'].includes(tx.status)) {
      set.status = 409;
      return { ok: false, message: 'Transaction is not eligible for reconciliation' };
    }

    const supplier = await getActiveSupplier();
    const reference = tx.supplierReference ?? tx.orderId;
    const result = await supplier.checkOrderStatus(reference);
    const status = String(result?.status ?? '').toLowerCase();
    const nextStatus = status === 'sukses' ? 'SUCCESS' : status === 'gagal' ? 'FAILED' : 'PROCESSING';
    await db.update(transactions).set({
      supplierReference: result?.ref_id ?? reference,
      supplierSn: result?.sn ?? tx.supplierSn,
      updatedAt: new Date(),
    }).where(eq(transactions.orderId, tx.orderId));
    if (tx.status === 'PAID') await advanceTransaction(tx.orderId, 'PROCESSING');
    if (nextStatus !== 'PROCESSING') await advanceTransaction(tx.orderId, nextStatus);
    await db.insert(auditTrails).values({ eventType: 'SUPPLIER_RECONCILED', referenceId: tx.orderId, rawResponse: { status: nextStatus } });
    return { ok: true, orderId: tx.orderId, status: nextStatus };
  })

  .post('/switch', async ({ body }) => {
    const { supplier } = body as { supplier: string };
    resolveSupplier(supplier); // validate before persisting
    await db
      .insert(systemConfigs)
      .values({ key: 'ACTIVE_SUPPLIER', value: supplier, description: 'Active top-up supplier', isActive: true })
      .onConflictDoUpdate({ target: systemConfigs.key, set: { value: supplier, updatedAt: new Date() } });
    return { ok: true, switched: supplier };
  });
