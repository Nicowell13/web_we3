import { db } from '../../db';
import { transactions, users, auditTrails, pointLedger } from '../../db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { assertTransition, isTerminal, TxStatus } from './stateMachine';
import { calculatePoints } from './points.logic';
import { getActiveSupplier } from '../suppliers/supplierFactory';
import { rewardReferral } from '../user/referral.service';

// ── Repo helpers (injectable for testing) ────────────────────────────────────
export async function findTx(orderId: string) {
  return db.query.transactions.findFirst({ where: eq(transactions.orderId, orderId) });
}

async function setTxStatus(
  orderId: string,
  status: TxStatus,
  extra: Partial<typeof transactions.$inferInsert> = {},
  expectedStatus?: TxStatus
) {
  const rows = await db
    .update(transactions)
    .set({ status, updatedAt: new Date(), ...extra } as any)
    .where(expectedStatus
      ? and(eq(transactions.orderId, orderId), eq(transactions.status, expectedStatus))
      : eq(transactions.orderId, orderId))
    .returning({ orderId: transactions.orderId });
  return rows.length === 1;
}

async function addUserPoints(userId: string, orderId: string, points: number) {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .update(transactions)
      .set({ pointsEarned: points } as any)
      .where(and(eq(transactions.orderId, orderId), eq(transactions.pointsEarned, 0)))
      .returning({ orderId: transactions.orderId });
    if (claimed.length !== 1) return false;

    await tx.insert(pointLedger).values({
      userId,
      type: 'earn',
      points,
      referenceId: orderId,
      description: 'Transaction reward',
    });
    await tx.update(users).set({
      points: sql`${users.points} + ${points}`,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
    return true;
  });
}

async function auditLog(
  eventType: string,
  referenceId: string,
  rawRequest?: unknown,
  rawResponse?: unknown
) {
  await db.insert(auditTrails).values({
    eventType,
    referenceId,
    rawRequest: rawRequest as any,
    rawResponse: rawResponse as any,
  });
}

// ── Core service ──────────────────────────────────────────────────────────────

/**
 * Advance a transaction through the state machine.
 * Enforces valid transitions, triggers supplier order on PAID,
 * and awards points on SUCCESS.
 *
 * All repo calls are injectable for unit-test isolation.
 */
export async function advanceTransaction(
  orderId: string,
  targetStatus: TxStatus,
  supplierPayload?: Record<string, unknown>,
  // Injectables
  _findTx     = findTx,
  _setStatus  = setTxStatus,
  _addPoints  = addUserPoints,
  _audit      = auditLog,
  _getSupplier = getActiveSupplier,
  _rewardReferral = rewardReferral
) {
  const tx = await _findTx(orderId);
  if (!tx) throw new Error(`Transaction not found: ${orderId}`);

  const from = tx.status as TxStatus;

  // 1. Validate transition
  assertTransition(from, targetStatus);

  // 2. Timestamp extras
  const now = new Date();
  const extra: Record<string, unknown> = {};
  if (targetStatus === 'PAID')    extra.paidAt = now;
  if (targetStatus === 'SUCCESS') extra.completedAt = now;

  // 3. Persist new status
  const transitioned = await _setStatus(orderId, targetStatus, extra, from);
  if (transitioned === false) throw new Error(`Transaction changed concurrently: ${orderId}`);
  await _audit('STATUS_CHANGE', orderId, { from, to: targetStatus }, null);

  // 4. PAID → trigger supplier order automatically
  if (targetStatus === 'PAID') {
    try {
      const supplier  = await _getSupplier();
      const product   = (tx as any).product ?? {};
      const orderResp = await supplier.createOrder(
        (tx as any).supplierProductCode ?? product.supplierProductCode ?? '',
        tx.targetUserId,
        Number(tx.amount),
        orderId
      );
      const supplierReference = orderResp?.ref_id ?? orderResp?.data?.ref_id ?? orderId;
      const supplierSn = orderResp?.sn ?? orderResp?.data?.sn ?? null;
      await _setStatus(orderId, 'PROCESSING', { supplierReference, supplierSn });
      await _audit('SUPPLIER_ORDER_CREATED', orderId, { targetStatus: 'PAID' }, orderResp);
    } catch (err: any) {
      await _audit('SUPPLIER_ORDER_FAILED', orderId, null, { error: err.message });
      // Keep PAID: payment is confirmed, fulfillment remains retryable.
      // ponytail: add retry queue when supplier reliability requires it
    }
  }

  // 5. SUCCESS → award points
  if (targetStatus === 'SUCCESS' && tx.userId) {
    const earned = calculatePoints(Number(tx.amount));
    if (earned > 0) {
      const awarded = await _addPoints(tx.userId, orderId, earned);
      if (awarded !== false) {
        await _audit('POINTS_AWARDED', orderId, null, { userId: tx.userId, points: earned });
      }
    }
    const referralRewarded = await _rewardReferral(tx.userId, orderId);
    if (referralRewarded) await _audit('REFERRAL_REWARDED', orderId, null, { referredUserId: tx.userId });
  }

  return { orderId, from, to: targetStatus };
}
