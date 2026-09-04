import { Elysia } from 'elysia';
import { requireRole } from '../../middleware/auth';
import { getAdminMetrics, getRecentAuditLogs, getSystemConfigs, updateSystemConfig } from './admin.service';
import { db } from '../../db';
import { auditTrails, products, users } from '../../db/schema';
import { desc, eq, ilike } from 'drizzle-orm';
import { syncDigiflazzProducts } from './product-sync.service';
import { bulkUpdateProducts, calculatePriceFromMargin, listAdminProducts, updateAdminProduct } from './product-admin.service';
import { createAdminVoucher, listAdminVouchers, updateAdminVoucher } from './voucher-admin.service';

/**
 * Old-school admin panel API – admin‑only protected.
 * GET /api/v1/old-school/ping – RBAC probe.
 * GET /api/v1/old-school/metrics – summary stats.
 * GET /api/v1/old-school/audit‑logs – latest audit entries.
 * GET /api/v1/old-school/configs – feature‑flag list.
 * POST /api/v1/old-school/configs – update a config (key/value).
 */
export const adminRoutes = new Elysia({ prefix: '/api/v1/old-school' })
  .use(requireRole('admin'))
  .get('/ping', () => ({ ok: true, scope: 'old-school' }))
  .post('/suppliers/digiflazz/sync-products', async ({ set }) => {
    try { return { ok: true, ...(await syncDigiflazzProducts()) }; }
    catch (error) { set.status = 502; return { ok: false, message: error instanceof Error ? error.message : 'Product sync failed' }; }
  })
  .get('/products', async ({ query }) => {
    const q = query as { search?: string; active?: string };
    const active = q.active === undefined ? undefined : q.active === 'true';
    return { ok: true, products: await listAdminProducts(q.search, active) };
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
    if (patch.marginType && patch.marginValue !== undefined && patch.sellPrice === undefined) {
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
    try { return { ok: true, voucher: await createAdminVoucher({ ...input, code: input.code.toUpperCase(), discountValue: String(input.discountValue), minPurchase: String(input.minPurchase ?? 0), maxDiscount: input.maxDiscount == null ? null : String(input.maxDiscount), quota: Number(input.quota), pointsRequired: Number(input.pointsRequired ?? 0), expiresAt: new Date(input.expiresAt) }) }; }
    catch { set.status = 409; return { ok: false, message: 'Voucher code already exists or payload conflicts' }; }
  })
  .patch('/vouchers/:id', async ({ params, body, set }) => {
    const input = body as any;
    const patch: any = {};
    for (const key of ['discountValue', 'minPurchase', 'maxDiscount']) if (input[key] !== undefined) patch[key] = input[key] == null ? null : String(input[key]);
    for (const key of ['quota', 'pointsRequired']) if (input[key] !== undefined) patch[key] = Number(input[key]);
    for (const key of ['isActive', 'isPublic']) if (input[key] !== undefined) patch[key] = Boolean(input[key]);
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
  .get('/configs', async () => {
    const cfg = await getSystemConfigs();
    return { ok: true, configs: cfg };
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

