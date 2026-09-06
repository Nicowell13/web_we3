import { db } from '../../db';
import { transactions, auditTrails, pointLedger, products, systemConfigs, users } from '../../db/schema';
import { desc, eq, sql } from 'drizzle-orm';

/** Metrics for admin dashboard */
export async function getAdminMetrics() {
  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .then(res => res[0]?.count ?? 0);

  const [financials] = await db
    .select({
      gmv: sql<string>`coalesce(sum(case when ${transactions.status} = 'SUCCESS' then ${transactions.amount} else 0 end), 0)`,
      supplierCost: sql<string>`coalesce(sum(case when ${transactions.status} = 'SUCCESS' then ${products.basePrice} else 0 end), 0)`,
      successfulOrders: sql<number>`count(*) filter (where ${transactions.status} = 'SUCCESS')`,
      uniqueCustomers: sql<number>`count(distinct ${transactions.userId}) filter (where ${transactions.status} = 'SUCCESS')`,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id));
  const sales = Number(financials?.gmv ?? 0);
  const supplierCost = Number(financials?.supplierCost ?? 0);
  const grossProfit = sales - supplierCost;

  const statusCounts = await db
    .select({ status: transactions.status, cnt: sql<number>`count(*)` })
    .from(transactions)
    .groupBy(transactions.status)
    .then(rows => {
      const map: Record<string, number> = {};
      for (const r of rows) map[r.status] = Number(r.cnt);
      return map;
    });

  const [loyalty] = await db.select({
    outstandingPoints: sql<number>`coalesce(sum(${users.points}), 0)`,
  }).from(users);
  const [rewards] = await db.select({
    pointsAwarded: sql<number>`coalesce(sum(case when ${pointLedger.points} > 0 then ${pointLedger.points} else 0 end), 0)`,
  }).from(pointLedger);
  const rewardCost = Number(rewards?.pointsAwarded ?? 0);
  const rewardCostRate = sales > 0 ? rewardCost / sales : 0;

  return {
    totalTransactions: Number(total),
    totalSales: sales,
    gmv: sales,
    supplierCost,
    grossProfit,
    successfulOrders: Number(financials?.successfulOrders ?? 0),
    successRate: Number(total) > 0 ? Number(financials?.successfulOrders ?? 0) / Number(total) : 0,
    uniqueCustomers: Number(financials?.uniqueCustomers ?? 0),
    pendingOrders: (statusCounts.PENDING ?? 0) + (statusCounts.PAID ?? 0) + (statusCounts.PROCESSING ?? 0),
    failedOrders: statusCounts.FAILED ?? 0,
    referralCost: 0,
    statusCounts,
    outstandingPoints: Number(loyalty?.outstandingPoints ?? 0),
    rewardCost,
    rewardCostRate,
    rewardCostWithinCap: rewardCostRate <= 0.02,
  };
}

/** Paid/pending orders needing operator reconciliation. */
export async function getPaymentReconciliation(olderThanMinutes = 15) {
  const cutoff = new Date(Date.now() - Math.max(1, olderThanMinutes) * 60_000);
  return db
    .select({
      orderId: transactions.orderId,
      status: transactions.status,
      amount: transactions.amount,
      paymentReference: transactions.paymentReference,
      supplierReference: transactions.supplierReference,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
    })
    .from(transactions)
    .where(sql`${transactions.status} in ('PENDING', 'PAID', 'PROCESSING') and ${transactions.updatedAt} < ${cutoff}`)
    .orderBy(desc(transactions.updatedAt))
    .limit(100);
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

