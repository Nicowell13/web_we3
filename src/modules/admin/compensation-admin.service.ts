import { db } from '../../db';
import { vouchers, userVouchers, auditTrails, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function createCompensationVoucher(params: {
  targetUserId: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  minPurchase?: string;
  maxDiscount?: string | null;
  expiryDays?: number;
  reason?: string;
}) {
  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, params.targetUserId),
  });
  if (!targetUser) throw new Error('Target user not found');

  const expiryDays = params.expiryDays && params.expiryDays > 0 ? params.expiryDays : 30;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  const code = `COMP-${nanoid(6).toUpperCase()}`;

  return await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(vouchers)
      .values({
        code,
        voucherType: 'compensation',
        discountType: params.discountType,
        discountValue: params.discountValue,
        minPurchase: params.minPurchase ?? '0',
        maxDiscount: params.maxDiscount ?? null,
        quota: 1,
        quotaUsed: 0,
        targetUserId: params.targetUserId,
        isPublic: false,
        isActive: true,
        expiresAt,
      })
      .returning();

    // Auto-link to target user vouchers
    await tx.insert(userVouchers).values({
      userId: params.targetUserId,
      voucherId: created.id,
      isUsed: false,
    });

    await tx.insert(auditTrails).values({
      eventType: 'COMPENSATION_VOUCHER_CREATED',
      referenceId: created.id,
      rawRequest: params as any,
      rawResponse: { voucherCode: code, targetUserId: params.targetUserId },
    });

    return created;
  });
}
