import { Elysia } from 'elysia';
import { requireRole } from '../../middleware/auth';
import { getAdminMetrics, getRecentAuditLogs, getSystemConfigs, updateSystemConfig } from './admin.service';

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
  });

