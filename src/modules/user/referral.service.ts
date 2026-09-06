import { db } from '../../db';
import { pointLedger, referrals, users } from '../../db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

export const REFERRAL_REWARD_POINTS = 100;

export function normalizeReferralCode(value: string) {
  return value.trim().toUpperCase();
}

export async function attachReferral(referredUserId: string, code: string) {
  const referrer = await db.query.users.findFirst({
    where: eq(users.referralCode, normalizeReferralCode(code)),
    columns: { id: true },
  });
  if (!referrer) throw new Error('Referral code not found');
  if (referrer.id === referredUserId) throw new Error('Self-referral is not allowed');

  await db.insert(referrals).values({ referredUserId, referrerUserId: referrer.id }).onConflictDoNothing();
  return { referrerUserId: referrer.id };
}

export async function rewardReferral(referredUserId: string, orderId: string) {
  return db.transaction(async (tx) => {
    const [referral] = await tx.update(referrals).set({
      qualifyingOrderId: orderId,
      rewardPoints: REFERRAL_REWARD_POINTS,
      rewardedAt: new Date(),
    }).where(and(eq(referrals.referredUserId, referredUserId), isNull(referrals.rewardedAt)))
      .returning({ referrerUserId: referrals.referrerUserId });
    if (!referral) return false;

    await tx.insert(pointLedger).values({
      userId: referral.referrerUserId,
      type: 'earn',
      points: REFERRAL_REWARD_POINTS,
      referenceId: `referral:${referredUserId}`,
      description: 'Referral first successful transaction',
    });
    await tx.update(users).set({
      points: sql`${users.points} + ${REFERRAL_REWARD_POINTS}`,
      updatedAt: new Date(),
    }).where(eq(users.id, referral.referrerUserId));
    return true;
  });
}
