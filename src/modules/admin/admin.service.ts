import { db } from '../../db';
import { transactions, auditTrails, systemConfigs } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';

/** Metrics for admin dashboard */
export async function getAdminMetrics() {
  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .then(res => res[0]?.count ?? 0);

  const sales = await db
    .select({ sum: sql<string>`sum(amount::text)` })
    .from(transactions)
    .then(res => Number(res[0]?.sum ?? 0));

  const statusCounts = await db
    .select({ status: transactions.status, cnt: sql<number>`count(*)` })
    .from(transactions)
    .groupBy(transactions.status)
    .then(rows => {
      const map: Record<string, number> = {};
      for (const r of rows) map[r.status] = Number(r.cnt);
      return map;
    });

  return { totalTransactions: total, totalSales: sales, statusCounts };
}

/** Recent audit logs */
export async function getRecentAuditLogs(limit = 20) {
  return db
    .select({
      id: auditTrails.id,
      eventType: auditTrails.eventType,
      referenceId: auditTrails.referenceId,
      createdAt: auditTrails.createdAt,
    })
    .from(auditTrails)
    .orderBy(desc(auditTrails.createdAt))
    .limit(limit);
}

/** System configs (feature flags, etc.) */
export async function getSystemConfigs() {
  return db.select().from(systemConfigs);
}

/** Update a config value */
export async function updateSystemConfig(key: string, value: string) {
  const result = await db
    .update(systemConfigs)
    .set({ value })
    .where(eq(systemConfigs.key, key));
  return result;
}

