import { db } from '../../db';
import { users, transactions, userVouchers, vouchers, gamesCatalog } from '../../db/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { createDefaultAvatar } from '../../lib/cloudinary';

export interface TimelineItem {
  id: string;
  type: 'transaction' | 'voucher_claim' | 'checkin';
  title: string;
  description: string;
  amount?: string;
  pointsDelta?: number;
  status?: string;
  timestamp: string;
}

/**
 * Assemble rich dashboard data for a given user.
 * Returns profile, points, streak, checkin status, recent transactions,
 * available vouchers to claim, owned vouchers, and unified activity timeline.
 */
export async function getDashboardData(userId: string) {
  // 1. User profile
  let user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) {
    // Generate persistent random default avatar if user sync has not run yet.
    const fallbackAvatar = await createDefaultAvatar(userId);
    const [created] = await db
      .insert(users)
      .values({
        id: userId,
        email: `${userId}@anon.wetri.com`,
        avatarUrl: fallbackAvatar,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { avatarUrl: fallbackAvatar },
      })
      .returning();
    user = created;
  }

  // Migrate empty/legacy external avatar to persistent Cloudinary image.
  let avatar = user.avatarUrl;
  if (!avatar || !avatar.includes('res.cloudinary.com')) {
    avatar = await createDefaultAvatar(user.id);
    await db
      .update(users)
      .set({ avatarUrl: avatar, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  // 2. Recent transactions (limit 20)
  const recentTx = await db
    .select({
      orderId: transactions.orderId,
      amount: transactions.amount,
      status: transactions.status,
      targetUserId: transactions.targetUserId,
      targetServerId: transactions.targetServerId,
      productId: transactions.productId,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(20);

  // 3. User owned vouchers (history & active)
  const ownedVouchers = await db
    .select({
      id: userVouchers.id,
      voucherId: vouchers.id,
      code: vouchers.code,
      discountType: vouchers.discountType,
      discountValue: vouchers.discountValue,
      maxDiscount: vouchers.maxDiscount,
      minPurchase: vouchers.minPurchase,
      isUsed: userVouchers.isUsed,
      usedAt: userVouchers.usedAt,
      obtainedAt: userVouchers.obtainedAt,
      expiresAt: vouchers.expiresAt,
    })
    .from(userVouchers)
    .innerJoin(vouchers, eq(userVouchers.voucherId, vouchers.id))
    .where(eq(userVouchers.userId, userId))
    .orderBy(desc(userVouchers.obtainedAt));

  // 4. Available public vouchers ready to be claimed
  const now = new Date();
  const availableVouchers = await db
    .select({
      id: vouchers.id,
      code: vouchers.code,
      discountType: vouchers.discountType,
      discountValue: vouchers.discountValue,
      maxDiscount: vouchers.maxDiscount,
      minPurchase: vouchers.minPurchase,
      pointsRequired: vouchers.pointsRequired,
      quota: vouchers.quota,
      quotaUsed: vouchers.quotaUsed,
      expiresAt: vouchers.expiresAt,
    })
    .from(vouchers)
    .where(
      and(
        eq(vouchers.isActive, true),
        gte(vouchers.expiresAt, now)
      )
    )
    .orderBy(desc(vouchers.createdAt))
    .limit(10);

  // 5. Build Unified Activity Timeline
  const timeline: TimelineItem[] = [];

  // Add transactions
  for (const tx of recentTx) {
    timeline.push({
      id: `tx_${tx.orderId}`,
      type: 'transaction',
      title: `Order Top-up #${tx.orderId.slice(-8)}`,
      description: `Pembelian top up seharga Rp ${Number(tx.amount).toLocaleString('id-ID')}`,
      amount: `Rp ${Number(tx.amount).toLocaleString('id-ID')}`,
      status: tx.status,
      timestamp: tx.createdAt.toISOString(),
    });
  }

  // Add voucher claims
  for (const v of ownedVouchers) {
    timeline.push({
      id: `vc_${v.id}`,
      type: 'voucher_claim',
      title: `Klaim Voucher [${v.code}]`,
      description: v.isUsed ? 'Voucher telah digunakan pada transaksi' : 'Voucher tersimpan di akun kamu',
      status: v.isUsed ? 'USED' : 'ACTIVE',
      timestamp: v.obtainedAt.toISOString(),
    });
  }

  // Sort unified timeline descending
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Check if checked in today
  const lastCheckin = user.lastCheckinAt ? new Date(user.lastCheckinAt) : null;
  const isCheckedInToday =
    lastCheckin !== null &&
    lastCheckin.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);

  return {
    profile: {
      id: user.id,
      email: user.email,
      name: user.name || 'Gamer WETRI',
      avatarUrl: avatar,
      role: user.role,
      createdAt: user.createdAt,
    },
    points: user.points ?? 0,
    streak: user.streak ?? 0,
    lastCheckinAt: user.lastCheckinAt,
    isCheckedInToday,
    recentTransactions: recentTx,
    ownedVouchers,
    availableVouchers,
    activityTimeline: timeline.slice(0, 25),
  };
}
