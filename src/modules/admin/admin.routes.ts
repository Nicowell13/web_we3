import { Elysia } from 'elysia';
import { requireRole } from '../../middleware/auth';
import { getAdminMetrics, getRecentAuditLogs, getSystemConfigs, updateSystemConfig } from './admin.service';
import { db } from '../../db';
import { auditTrails, users } from '../../db/schema';
import { desc, eq, ilike } from 'drizzle-orm';
import { syncDigiflazzProducts } from './product-sync.service';

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

