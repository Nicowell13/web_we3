import { db } from '../../db';
import { transactions, users, auditTrails } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { assertTransition, isTerminal, TxStatus } from './stateMachine';
import { calculatePoints } from './points.logic';
import { getActiveSupplier } from '../suppliers/supplierFactory';

// ── Repo helpers (injectable for testing) ────────────────────────────────────
export async function findTx(orderId: string) {
  return db.query.transactions.findFirst({ where: eq(transactions.orderId, orderId) });
}

async function setTxStatus(
  orderId: string,
  status: TxStatus,
  extra: Partial<typeof transactions.$inferInsert> = {}
) {
  await db
    .update(transactions)
    .set({ status, updatedAt: new Date(), ...extra } as any)
    .where(eq(transactions.orderId, orderId));
}

async function addUserPoints(userId: string, points: number, earned: number) {
  await db
    .update(users)
    .set({
      points: sql`${users.points} + ${points}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await db
    .update(transactions)
    .set({ pointsEarned: earned } as any)
    .where(eq(transactions.userId, userId)); // ponytail: scope to orderId when needed
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
  _getSupplier = getActiveSupplier
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
  await _setStatus(orderId, targetStatus, extra);
  await _audit('STATUS_CHANGE', orderId, { from, to: targetStatus }, null);

  // 4. PAID → trigger supplier order automatically
  if (targetStatus === 'PAID') {
    try {
      const supplier  = await _getSupplier();
      const product   = (tx as any).product ?? {};
      const orderResp = await supplier.createOrder(
        (tx as any).supplierProductCode ?? product.supplierProductCode ?? '',
        tx.targetUserId,
        Number(tx.amount)
      );
      await _setStatus(orderId, 'PROCESSING', {});
      await _audit('SUPPLIER_ORDER_CREATED', orderId, { targetStatus: 'PAID' }, orderResp);
    } catch (err: any) {
      await _audit('SUPPLIER_ORDER_FAILED', orderId, null, { error: err.message });
      // Do NOT revert to PAID — leave as PROCESSING for manual retry
      // ponytail: add retry queue when supplier reliability requires it
    }
  }

  // 5. SUCCESS → award points
  if (targetStatus === 'SUCCESS' && tx.userId) {
    const earned = calculatePoints(Number(tx.amount));
    if (earned > 0) {
      await _addPoints(tx.userId, earned, earned);
      await _audit('POINTS_AWARDED', orderId, null, { userId: tx.userId, points: earned });
    }
  }

  return { orderId, from, to: targetStatus };
}
