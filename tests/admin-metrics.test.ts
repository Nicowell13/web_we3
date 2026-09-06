import { describe, expect, it } from 'bun:test';

export function calculateLaunchMetrics(rows: Array<{ status: string; amount: number; basePrice: number; userId?: string }>) {
  const successful = rows.filter(row => row.status === 'SUCCESS');
  const gmv = successful.reduce((sum, row) => sum + row.amount, 0);
  const supplierCost = successful.reduce((sum, row) => sum + row.basePrice, 0);
  return {
    gmv,
    supplierCost,
    grossProfit: gmv - supplierCost,
    successfulOrders: successful.length,
    successRate: rows.length ? successful.length / rows.length : 0,
    uniqueCustomers: new Set(successful.map(row => row.userId).filter(Boolean)).size,
    pendingOrders: rows.filter(row => ['PENDING', 'PAID', 'PROCESSING'].includes(row.status)).length,
    failedOrders: rows.filter(row => row.status === 'FAILED').length,
  };
}

describe('[ADMIN-21] launch metrics', () => {
  it('counts GMV and profit from SUCCESS orders only', () => {
    const metrics = calculateLaunchMetrics([
      { status: 'SUCCESS', amount: 11000, basePrice: 10000, userId: 'u1' },
      { status: 'FAILED', amount: 90000, basePrice: 80000, userId: 'u2' },
      { status: 'PROCESSING', amount: 22000, basePrice: 20000, userId: 'u1' },
    ]);
    expect(metrics.gmv).toBe(11000);
    expect(metrics.supplierCost).toBe(10000);
    expect(metrics.grossProfit).toBe(1000);
    expect(metrics.successRate).toBeCloseTo(1 / 3);
    expect(metrics.pendingOrders).toBe(1);
    expect(metrics.failedOrders).toBe(1);
    expect(metrics.uniqueCustomers).toBe(1);
  });
});
