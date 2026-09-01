import { Elysia } from 'elysia';
import { authenticate } from '../../middleware/auth';
import { db } from '../../db';
import { vouchers, userVouchers, users } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

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

export async function applyVoucher(orderId: string, voucherCode: string, userId: string) {
  const voucher = await findActiveVoucher(voucherCode);
  if (!voucher || !voucher.isActive) throw new Error('Invalid or inactive voucher');

  if (new Date(voucher.expiresAt) < new Date()) throw new Error('Voucher expired');
  if (voucher.quotaUsed >= voucher.quota) throw new Error('Voucher quota exhausted');

  if (voucher.pointsRequired > 0) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new Error('User not found');
    if ((user.points ?? 0) < voucher.pointsRequired) {
      throw new Error('Insufficient loyalty points for voucher');
    }
    await db
      .update(users)
      .set({ points: sql`${users.points} - ${voucher.pointsRequired}` })
      .where(eq(users.id, userId));
  }

  // Idempotent mark-as-used
  await db
    .update(userVouchers)
    .set({ isUsed: true, usedAt: new Date() })
    .where(eq(userVouchers.userId, userId))
    .where(eq(userVouchers.voucherId, voucher.id));

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
