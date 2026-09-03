import { Elysia } from 'elysia';
import { authenticate } from '../../middleware/auth';
import { db } from '../../db';
import { transactions, vouchers, userVouchers, users } from '../../db/schema';
import { and, eq, sql } from 'drizzle-orm';

/**
 * Thin helpers — all faked in tests via injection.
 * Keep logic in these pure-ish functions so they are unit-testable.
 */
export async function findActiveVoucher(code: string) {
  return db.query.vouchers.findFirst({
    where: eq(vouchers.code, code),
  });
}

export async function claimVoucher(userId: string, voucherId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(vouchers)
      .set({ quotaUsed: sql`${vouchers.quotaUsed} + 1` })
      .where(eq(vouchers.id, voucherId))
      .returning();
    await tx.insert(userVouchers).values({ userId, voucherId });
  });
}

export async function validateVoucherEligibility(
  voucher: typeof vouchers.$inferSelect,
  userId?: string
): Promise<{ eligible: boolean; reason?: string }> {
  if (!voucher || !voucher.isActive) {
    return { eligible: false, reason: 'Invalid or inactive voucher' };
  }

  if (new Date(voucher.expiresAt) <= new Date()) {
    return { eligible: false, reason: 'Voucher expired' };
  }

  if (voucher.quotaUsed >= voucher.quota) {
    return { eligible: false, reason: 'Voucher quota exhausted' };
  }

  if (voucher.voucherType === 'new_user') {
    if (!userId) {
      return { eligible: false, reason: 'Login required for new user voucher' };
    }

    const previousSuccess = await db.query.transactions.findFirst({
      where: and(eq(transactions.userId, userId), eq(transactions.status, 'SUCCESS')),
      columns: { orderId: true },
    });

    if (previousSuccess) {
      return { eligible: false, reason: 'Voucher khusus untuk user baru' };
    }

    if (voucher.dailyLimit && voucher.dailyLimit > 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const usedToday = await db.query.userVouchers.findMany({
        where: and(
          eq(userVouchers.voucherId, voucher.id),
          eq(userVouchers.isUsed, true),
          sql`${userVouchers.usedAt} >= ${startOfDay}`
        ),
        columns: { id: true },
      });

      if (usedToday.length >= voucher.dailyLimit) {
        return { eligible: false, reason: 'Limit harian voucher user baru telah habis' };
      }
    }
  }

  if (voucher.voucherType === 'loyalty_points' || voucher.pointsRequired > 0) {
    if (!userId) {
      return { eligible: false, reason: 'Login required to redeem loyalty points voucher' };
    }
    const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { points: true } });
    if (!user || (user.points ?? 0) < voucher.pointsRequired) {
      return { eligible: false, reason: 'Insufficient loyalty points for voucher' };
    }
  }

  return { eligible: true };
}

export async function applyVoucher(orderId: string, voucherCode: string, userId: string) {
  const voucher = await findActiveVoucher(voucherCode);
  if (!voucher) throw new Error('Invalid or inactive voucher');

  const check = await validateVoucherEligibility(voucher, userId);
  if (!check.eligible) throw new Error(check.reason || 'Voucher ineligible');

  if (orderId) {
    const trx = await db.query.transactions.findFirst({ where: eq(transactions.orderId, orderId), columns: { originalAmount: true } });
    if (trx && Number(trx.originalAmount ?? 0) < Number(voucher.minPurchase)) {
      throw new Error('Minimum purchase not met');
    }
  }

  if (voucher.pointsRequired > 0) {
    await db
      .update(users)
      .set({ points: sql`${users.points} - ${voucher.pointsRequired}` })
      .where(eq(users.id, userId));
  }

  // Idempotent mark-as-used
  await db
    .update(userVouchers)
    .set({ isUsed: true, usedAt: new Date() })
    .where(and(eq(userVouchers.userId, userId), eq(userVouchers.voucherId, voucher.id)));

  return voucher;
}

/** Percentage / fixed discount calculator — pure, heavily tested. */
export function calcDiscount(
  amount: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
  maxDiscount?: number
): number {
  let raw = discountType === 'percentage' ? Math.floor((amount * discountValue) / 100) : discountValue;
  if (maxDiscount && raw > maxDiscount) raw = maxDiscount;
  return Math.min(raw, amount);
}

export const voucherRoutes = new Elysia({ prefix: '/api/v1/voucher' })
  .get('/validate/:code', async ({ params }) => {
    const voucher = await findActiveVoucher(params.code);
    if (!voucher) return { ok: false, message: 'Voucher not found' };
    return { ok: true, voucher };
  })
  .use(authenticate)
  .post('/claim', async ({ user, body }) => {
    const { code } = body as { code: string };
    const voucher = await findActiveVoucher(code);
    if (!voucher) return { ok: false, message: 'Voucher not found' };
    await claimVoucher(user.uid, voucher.id);
    return { ok: true, message: 'Voucher claimed' };
  })
  .post('/apply', async ({ user, body }) => {
    const { orderId, code } = body as { orderId: string; code: string };
    const voucher = await applyVoucher(orderId, code, user.uid);
    return { ok: true, applied: voucher };
  });
