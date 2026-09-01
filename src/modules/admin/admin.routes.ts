import { Elysia } from 'elysia';
import { authenticate } from '../../middleware/auth';
import { getAdminMetrics, getRecentAuditLogs, getSystemConfigs, updateSystemConfig } from './admin.service';

/**
 * Admin panel API – admin‑only protected.
 * GET /api/v1/admin/metrics – summary stats.
 * GET /api/v1/admin/audit‑logs – latest audit entries.
 * GET /api/v1/admin/configs – feature‑flag list.
 * POST /api/v1/admin/configs – update a config (key/value).
 */
export const adminRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authenticate)
  .get('/admin/metrics', async ({ user }) => {
    if (user.role !== 'admin') return { ok: false, message: 'Forbidden' };
    const data = await getAdminMetrics();
    return { ok: true, ...data };
  })
  .get('/admin/audit-logs', async ({ user }) => {
    if (user.role !== 'admin') return { ok: false, message: 'Forbidden' };
    const logs = await getRecentAuditLogs();
    return { ok: true, logs };
  })
  .get('/admin/configs', async ({ user }) => {
    if (user.role !== 'admin') return { ok: false, message: 'Forbidden' };
    const cfg = await getSystemConfigs();
    return { ok: true, configs: cfg };
  })
  .post('/admin/configs', async ({ user, body }) => {
    if (user.role !== 'admin') return { ok: false, message: 'Forbidden' };
    const { key, value } = body as { key: string; value: string };
    await updateSystemConfig(key, value);
    return { ok: true };
  });

