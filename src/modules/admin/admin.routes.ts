import { Elysia } from 'elysia';
import { requireRole } from '../../middleware/auth';
import { getAdminMetrics, getPaymentReconciliation, getRecentAuditLogs, getSystemConfigs, updateSystemConfig } from './admin.service';
import { db } from '../../db';
import { auditTrails, products, users } from '../../db/schema';
import { desc, eq, ilike } from 'drizzle-orm';
import { syncDigiflazzProducts } from './product-sync.service';
import { bulkUpdateProducts, calculatePriceFromMargin, getProductSummary, listAdminProducts, updateAdminProduct } from './product-admin.service';
import { createAdminVoucher, listAdminVouchers, updateAdminVoucher } from './voucher-admin.service';
import { correctAdminOrderTarget, listFailedOrActionOrders, repayAdminOrder } from './order-admin.service';
import { createCompensationVoucher } from './compensation-admin.service';
import { bulkUpdateProductStatus, bulkUpdateProductMargin } from './bulk-admin.service';

/**
 * Old-school admin panel API – admin‑only protected.
 * GET /api/v1/old-school/ping – RBAC probe.
 * GET /api/v1/old-school/metrics – summary stats.
 * GET /api/v1/old-school/audit‑logs – latest audit entries.
 * GET /api/v1/old-school/configs – feature‑flag list.
 * POST /api/v1/old-school/configs – update a config (key/value).
 */
// Public health‑check endpoint – no auth required, useful for external monitoring.
export const adminRoutes = new Elysia({ prefix: '/api/v1/old-school' })
  .get('/ping', () => ({ ok: true, scope: 'old-school' }))
  // Admin‑only routes are protected after the public ping.
  .use(requireRole('admin'))
  .post('/suppliers/digiflazz/sync-products', async ({ set }) => {
    try { return { ok: true, ...(await syncDigiflazzProducts()) }; }
    catch (error) { set.status = 502; return { ok: false, message: error instanceof Error ? error.message : 'Product sync failed' }; }
  })
  .get('/products/summary', async () => ({ ok: true, ...(await getProductSummary()) }))
  .get('/products', async ({ query }) => {
    const q = query as { search?: string; active?: string; supplierStatus?: string };
    const active = q.active === undefined ? undefined : q.active === 'true';
    return { ok: true, products: await listAdminProducts(q.search, active, q.supplierStatus) };
  })
  .patch('/products/:id', async ({ params, body, set }) => {
    const patch = body as { isActive?: boolean; sellPrice?: string; marginType?: 'fixed' | 'percentage' | null; marginValue?: string | null };
    if (patch.sellPrice !== undefined && (!/^\d+(\.\d{1,2})?$/.test(patch.sellPrice) || Number(patch.sellPrice) < 0)) {
      set.status = 400; return { ok: false, message: 'Invalid sellPrice' };
    }
    if (patch.marginType !== undefined && patch.marginType !== null && !['fixed', 'percentage'].includes(patch.marginType)) {
      set.status = 400; return { ok: false, message: 'Invalid marginType' };
    }
    if (patch.marginValue !== undefined && patch.marginValue !== null && (!/^\d+(\.\d{1,2})?$/.test(patch.marginValue) || Number(patch.marginValue) < 0)) {
      set.status = 400; return { ok: false, message: 'Invalid marginValue' };
    }
    if (patch.marginType === 'percentage' && Number(patch.marginValue ?? 0) > 100) {
      set.status = 400; return { ok: false, message: 'Percentage margin cannot exceed 100' };
    }
    if (patch.marginType && patch.marginValue !== undefined) {
      const current = await db.query.products.findFirst({ where: eq(products.id, params.id), columns: { basePrice: true } });
      if (!current) { set.status = 404; return { ok: false, message: 'Product not found' }; }
      patch.sellPrice = String(calculatePriceFromMargin(Number(current.basePrice), patch.marginType, Number(patch.marginValue)));
    }
    const product = await updateAdminProduct(params.id, patch);
    if (!product) { set.status = 404; return { ok: false, message: 'Product not found' }; }
    return { ok: true, product };
  })
  .post('/products/bulk-status', async ({ body, set }) => {
    const payload = body as { ids?: string[]; isActive?: boolean };
    if (!Array.isArray(payload.ids) || !payload.ids.length || typeof payload.isActive !== 'boolean') {
      set.status = 400; return { ok: false, message: 'ids and isActive are required' };
    }
    return { ok: true, updated: await bulkUpdateProducts(payload.ids, payload.isActive) };
  })
  .get('/vouchers', async ({ query }) => ({ ok: true, vouchers: await listAdminVouchers((query as { search?: string }).search) }))
  .post('/vouchers', async ({ body, set }) => {
    const input = body as any;
    if (!/^[A-Z0-9_-]{3,40}$/.test(input.code ?? '') || !['fixed', 'percentage'].includes(input.discountType) || Number(input.discountValue) <= 0 || Number(input.quota) < 0 || !input.expiresAt) {
      set.status = 400; return { ok: false, message: 'Invalid voucher payload' };
    }
    try { return { ok: true, voucher: await createAdminVoucher({ ...input, code: input.code.toUpperCase(), discountValue: String(input.discountValue), minPurchase: String(input.minPurchase ?? 0), maxDiscount: input.maxDiscount == null ? null : String(input.maxDiscount), quota: Number(input.quota), dailyLimit: input.dailyLimit == null ? null : Number(input.dailyLimit), pointsRequired: Number(input.pointsRequired ?? 0), targetUserId: input.targetUserId || null, isPublic: Boolean(input.isPublic ?? !input.targetUserId), startAt: input.startAt ? new Date(input.startAt) : new Date(), expiresAt: new Date(input.expiresAt) }) }; }
    catch { set.status = 409; return { ok: false, message: 'Voucher code already exists or payload conflicts' }; }
  })
  .post('/vouchers/create-compensation', async ({ body, set }) => {
    const input = body as any;
    if (!input?.targetUserId || !['fixed', 'percentage'].includes(input?.discountType) || Number(input?.discountValue) <= 0) {
      set.status = 400;
      return { ok: false, message: 'Invalid compensation voucher payload' };
    }
    try {
      const voucher = await createCompensationVoucher({
        targetUserId: input.targetUserId,
        discountType: input.discountType,
        discountValue: String(input.discountValue),
        minPurchase: String(input.minPurchase ?? 0),
        maxDiscount: input.maxDiscount ? String(input.maxDiscount) : null,
        expiryDays: Number(input.expiryDays || 30),
        reason: input.reason,
      });
      return { ok: true, voucher };
    } catch (err: any) {
      set.status = 400;
      return { ok: false, message: err?.message || 'Failed to create compensation voucher' };
    }
  })
  .patch('/vouchers/:id', async ({ params, body, set }) => {
    const input = body as any;
    const patch: any = {};
    for (const key of ['discountValue', 'minPurchase', 'maxDiscount']) if (input[key] !== undefined) patch[key] = input[key] == null ? null : String(input[key]);
    for (const key of ['quota', 'pointsRequired', 'dailyLimit']) if (input[key] !== undefined) patch[key] = input[key] == null ? null : Number(input[key]);
    if (input.targetUserId !== undefined) patch.targetUserId = input.targetUserId || null;
    for (const key of ['isActive', 'isPublic']) if (input[key] !== undefined) patch[key] = Boolean(input[key]);
    if (input.startAt !== undefined) patch.startAt = new Date(input.startAt);
    if (input.expiresAt !== undefined) patch.expiresAt = new Date(input.expiresAt);
    if (input.discountType !== undefined) { if (!['fixed', 'percentage'].includes(input.discountType)) { set.status = 400; return { ok: false, message: 'Invalid discountType' }; } patch.discountType = input.discountType; }
    const voucher = await updateAdminVoucher(params.id, patch);
    if (!voucher) { set.status = 404; return { ok: false, message: 'Voucher not found' }; }
    return { ok: true, voucher };
  })
  .get('/metrics', async () => {
    const data = await getAdminMetrics();
    return { ok: true, ...data };
  })
  .get('/audit-logs', async () => {
    const logs = await getRecentAuditLogs();
    return { ok: true, logs };
  })
  .get('/payments/reconciliation', async ({ query }) => {
    const raw = Number((query as { olderThanMinutes?: string }).olderThanMinutes ?? 15);
    const olderThanMinutes = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 10_080) : 15;
    return { ok: true, transactions: await getPaymentReconciliation(olderThanMinutes) };
  })
  .get('/configs', async () => {
    const cfg = await getSystemConfigs();
    return { ok: true, configs: cfg };
  })
  .post('/products/bulk-status', async ({ body, set }) => {
    const input = body as any;
    if (typeof input?.isActive !== 'boolean' || !['all', 'category', 'gameId', 'ids'].includes(input?.scope)) {
      set.status = 400;
      return { ok: false, message: 'Invalid bulk status payload' };
    }
    try {
      const result = await bulkUpdateProductStatus({
        isActive: input.isActive,
        scope: input.scope,
        target: input.target,
      });
      return result;
    } catch (err: any) {
      set.status = 500;
      return { ok: false, message: err?.message || 'Failed to bulk update status' };
    }
  })
  .post('/products/bulk-margin', async ({ body, set }) => {
    const input = body as any;
    if (!['percentage', 'fixed'].includes(input?.marginType) || Number(input?.marginValue) < 0 || !['all', 'category', 'gameId', 'ids'].includes(input?.scope)) {
      set.status = 400;
      return { ok: false, message: 'Invalid bulk margin payload' };
    }
    try {
      const result = await bulkUpdateProductMargin({
        marginType: input.marginType,
        marginValue: input.marginValue,
        scope: input.scope,
        target: input.target,
      });
      return result;
    } catch (err: any) {
      set.status = 500;
      return { ok: false, message: err?.message || 'Failed to bulk update margin' };
    }
  })
  .post('/products/sync-now', async ({ set }) => {
    try {
      const result = await syncDigiflazzProducts();
      return { ok: true, ...result };
    } catch (err: any) {
      set.status = 500;
      return { ok: false, message: err?.message || 'Manual sync failed' };
    }
  })
  .get('/orders/action-needed', async () => {
    return { ok: true, orders: await listFailedOrActionOrders() };
  })
  .post('/orders/:orderId/target', async ({ params, body, set }) => {
    try {
      const target = (body as { targetUserId?: unknown })?.targetUserId;
      if (typeof target !== 'string') throw new Error('Nomor HP wajib berupa teks');
      return await correctAdminOrderTarget(params.orderId, target);
    } catch (err: any) {
      set.status = 400;
      return { ok: false, message: err?.message || 'Target correction failed' };
    }
  })
  .post('/orders/:orderId/repay', async ({ params, body, set, user }) => {
    console.log('🔧 Repay request body →', body);
    const payload = (body as { overrideSupplierSku?: string; adminNotes?: string; balanceConfirmed?: boolean }) || {};
    try {
      const result = await repayAdminOrder(params.orderId, payload, user.uid);
      return result;
    } catch (err: any) {
      set.status = 400;
      return { ok: false, message: err?.message || 'Repay order failed' };
    }
  })
  .post('/configs', async ({ body }) => {
    const { key, value } = body as { key: string; value: string };
    await updateSystemConfig(key, value);
    return { ok: true };
  })
  .get('/users', async ({ query }) => {
    const search = (query as { search?: string }).search;
    const records = await db.query.users.findMany({
      where: search ? ilike(users.email, `%${search}%`) : undefined,
      columns: { id: true, email: true, name: true, role: true, status: true, bannedAt: true, bannedReason: true, createdAt: true, updatedAt: true },
      orderBy: desc(users.createdAt),
      limit: 100,
    });
    return { ok: true, users: records };
  })
  .post('/users/:id/status', async ({ params, body, set }) => {
    const payload = body as { status?: 'active' | 'suspended' | 'banned'; reason?: string };
    if (!['active', 'suspended', 'banned'].includes(payload.status ?? '')) {
      set.status = 400;
      return { ok: false, message: 'Invalid user status' };
    }
    if (payload.status === 'banned' && !payload.reason?.trim()) {
      set.status = 400;
      return { ok: false, message: 'Ban reason is required' };
    }
    const [updated] = await db.update(users).set({
      status: payload.status,
      bannedAt: payload.status === 'banned' ? new Date() : null,
      bannedReason: payload.status === 'banned' ? payload.reason!.trim() : null,
      updatedAt: new Date(),
    }).where(eq(users.id, params.id)).returning({ id: users.id, status: users.status, bannedAt: users.bannedAt, bannedReason: users.bannedReason });
    if (!updated) { set.status = 404; return { ok: false, message: 'User not found' }; }
    await db.insert(auditTrails).values({
      eventType: 'USER_STATUS_CHANGE',
      referenceId: params.id,
      rawRequest: { status: payload.status, reason: payload.reason ?? null },
    });
    return { ok: true, user: updated };
  });

