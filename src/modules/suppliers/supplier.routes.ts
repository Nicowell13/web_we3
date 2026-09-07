import { Elysia } from 'elysia';
import { requireRole } from '../../middleware/auth';
import { getActiveSupplier, resolveSupplier } from './supplierFactory';
import { db } from '../../db';
import { auditTrails, systemConfigs, transactions } from '../../db/schema';
import { eq, or } from 'drizzle-orm';
import { advanceTransaction } from '../transaction/transaction.service';
import { inquirePlnCustomer } from './pln-inquiry.service';
import { DigiflazzWebhookPayload, parsePlnToken, verifyDigiflazzWebhookSha1 } from '../../integrations/digiflazz/webhook';

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
  })
  .post('/inquire-pln', async ({ body, set }) => {
    const input = body as { customerNo?: string };
    const result = await inquirePlnCustomer(String(input?.customerNo || ''));
    if (!result.ok) {
      set.status = result.errorCode === 'SUPPLIER_UNAVAILABLE' ? 502 : 400;
      return result;
    }
    return result;
  })
  .post('/digiflazz/webhook', async ({ body, headers, set }) => {
    const signature = headers['x-hub-signature'];
    const webhookSecret = process.env.DIGIFLAZZ_WEBHOOK_SECRET || '';
    if (!webhookSecret) {
      set.status = 503;
      return { ok: false, message: 'Webhook secret is not configured' };
    }
    if (!signature) {
      set.status = 401;
      return { ok: false, message: 'Missing webhook signature' };
    }

    const rawString = String(body);
    if (!verifyDigiflazzWebhookSha1(rawString, webhookSecret, signature)) {
      set.status = 401;
      return { ok: false, message: 'Invalid webhook signature' };
    }

    let payload: DigiflazzWebhookPayload;
    try {
      payload = JSON.parse(rawString) as DigiflazzWebhookPayload;
    } catch {
      set.status = 400;
      return { ok: false, message: 'Invalid JSON payload' };
    }
    const data = payload?.data;
    if (!data?.ref_id) {
      set.status = 400;
      return { ok: false, message: 'Missing ref_id in webhook data' };
    }

    const tx = await db.query.transactions.findFirst({
      where: or(
        eq(transactions.orderId, data.ref_id),
        eq(transactions.supplierReference, data.ref_id)
      ),
    });

    if (!tx) {
      // Return 200 to acknowledge Digiflazz so they do not retry endlessly for non-existent local orders
      return { ok: true, message: 'Transaction not found or already archived' };
    }

    const supplierStatus = String(data.status || '').toLowerCase();
    const isSuccess = supplierStatus === 'sukses' || data.rc === '00';
    const isFailed = supplierStatus === 'gagal';

    let nextStatus: 'SUCCESS' | 'FAILED' | 'PROCESSING' = 'PROCESSING';
    if (isSuccess) nextStatus = 'SUCCESS';
    else if (isFailed) nextStatus = 'FAILED';

    const plnDetails = data.sn ? parsePlnToken(data.sn) : null;

    // Update metadata and token if PLN
    const currentMeta = (tx.metadata || {}) as Record<string, unknown>;
    const updatedMeta = {
      ...currentMeta,
      lastWebhookPayload: data,
      ...(plnDetails ? { plnToken: plnDetails } : {}),
      ...(isFailed ? { lastSupplierError: data.message || 'Supplier transaction failed' } : {}),
    };

    await db.update(transactions).set({
      supplierReference: data.ref_id,
      supplierSn: data.sn ?? tx.supplierSn,
      metadata: updatedMeta,
      ...(isFailed ? { needsAdminAction: true } : {}),
      updatedAt: new Date(),
    }).where(eq(transactions.orderId, tx.orderId));

    if (tx.status === 'PAID' && nextStatus === 'PROCESSING') {
      await advanceTransaction(tx.orderId, 'PROCESSING');
    }

    if (nextStatus !== 'PROCESSING' && tx.status !== nextStatus) {
      if (tx.status === 'PAID') {
        await advanceTransaction(tx.orderId, 'PROCESSING');
      }
      await advanceTransaction(tx.orderId, nextStatus);
    }

    await db.insert(auditTrails).values({
      eventType: `DIGIFLAZZ_WEBHOOK_${nextStatus}`,
      referenceId: tx.orderId,
      rawResponse: {
        ref_id: data.ref_id,
        status: data.status,
        rc: data.rc,
        sn: data.sn,
        plnDetails,
      },
    });

    return {
      ok: true,
      orderId: tx.orderId,
      status: nextStatus,
      sn: data.sn,
      plnToken: plnDetails?.tokenNumber,
    };
  }, { parse: 'text' });

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
    const plnDetails = result?.sn ? parsePlnToken(result.sn) : null;

    const currentMeta = (tx.metadata || {}) as Record<string, unknown>;
    const updatedMeta = {
      ...currentMeta,
      ...(plnDetails ? { plnToken: plnDetails } : {}),
    };

    await db.update(transactions).set({
      supplierReference: result?.ref_id ?? reference,
      supplierSn: result?.sn ?? tx.supplierSn,
      metadata: updatedMeta,
      updatedAt: new Date(),
    }).where(eq(transactions.orderId, tx.orderId));
    if (tx.status === 'PAID') await advanceTransaction(tx.orderId, 'PROCESSING');
    if (nextStatus !== 'PROCESSING') await advanceTransaction(tx.orderId, nextStatus);
    await db.insert(auditTrails).values({ eventType: 'SUPPLIER_RECONCILED', referenceId: tx.orderId, rawResponse: { status: nextStatus, plnDetails } });
    return { ok: true, orderId: tx.orderId, status: nextStatus, plnDetails };
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
