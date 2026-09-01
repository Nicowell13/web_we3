import { db } from '../../db';
import { users, transactions, userVouchers, vouchers } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Assemble dashboard data for a given user.
 * Returns points, streak, last check‑in, recent transactions, and voucher history.
 */
export async function getDashboardData(userId: string) {
  // User profile
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) throw new Error('User not found');

  // Recent transactions (limit 10)
  const recentTx = await db
    .select({
      orderId: transactions.orderId,
      amount: transactions.amount,
      status: transactions.status,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(10);

  // Voucher history (joined with voucher details)
  const vouchersHistory = await db
    .select({
      code: vouchers.code,
      isUsed: userVouchers.isUsed,
      claimedAt: userVouchers.claimedAt,
    })
    .from(userVouchers)
    .innerJoin(vouchers, eq(userVouchers.voucherId, vouchers.id))
    .where(eq(userVouchers.userId, userId))
    .orderBy(desc(userVouchers.claimedAt));

  return {
    points: user.points,
    streak: user.streak,
    lastCheckinAt: user.lastCheckinAt,
    recentTransactions: recentTx,
    voucherHistory: vouchersHistory,
  };
}

