import { Elysia } from 'elysia';
import { requireRole } from '../../middleware/auth';
import { getActiveSupplier, resolveSupplier } from './supplierFactory';
import { db } from '../../db';
import { systemConfigs } from '../../db/schema';
import { eq } from 'drizzle-orm';

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

  .post('/switch', async ({ body }) => {
    const { supplier } = body as { supplier: string };
    resolveSupplier(supplier); // validate before persisting
    await db
      .insert(systemConfigs)
      .values({ key: 'ACTIVE_SUPPLIER', value: supplier, description: 'Active top-up supplier', isActive: true })
      .onConflictDoUpdate({ target: systemConfigs.key, set: { value: supplier, updatedAt: new Date() } });
    return { ok: true, switched: supplier };
  });
