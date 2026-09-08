import { db } from '../../db';
import { transactions, users, auditTrails, pointLedger, products } from '../../db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { assertTransition, isTerminal, TxStatus } from './stateMachine';
import { calculatePoints } from './points.logic';
import { getActiveSupplier } from '../suppliers/supplierFactory';
import { rewardReferral } from '../user/referral.service';

// ── Repo helpers (injectable for testing) ────────────────────────────────────
export async function findTx(orderId: string) {
  const rows = await db
    .select({ transaction: transactions, supplierProductCode: products.supplierProductCode, basePrice: products.basePrice })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .where(eq(transactions.orderId, orderId))
    .limit(1);
  return rows[0] ? { ...rows[0].transaction, supplierProductCode: rows[0].supplierProductCode } : undefined;
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

  // 4. PAID → trigger supplier order automatically with up to 2 retries
  if (targetStatus === 'PAID') {
    let finalFulfillmentStatus: TxStatus = 'PROCESSING';
    let finalResp: any = null;
    let lastErrorMsg: string | null = null;
    let supplierRef: string = orderId;
    let supplierSn: string | null = null;

    const supplier = await _getSupplier().catch(() => null);
    const supplierProductCode = (tx as any).supplierProductCode;
    const basePrice = Number((tx as any).basePrice);
    const maxPrice = Math.round(Number(tx.originalAmount ?? tx.amount));
    const baseCustomerNo = tx.targetServerId ? `${tx.targetUserId}${tx.targetServerId}` : tx.targetUserId;
    const fallbackCustomerNo = tx.targetServerId ? `${tx.targetUserId}|${tx.targetServerId}` : tx.targetUserId;
    const formats = tx.targetServerId ? [baseCustomerNo, fallbackCustomerNo] : [baseCustomerNo];

    const isFormatReject = (value: unknown) => {
      const text = String(value ?? '').toLowerCase();
      return /customer|format|no tujuan|target|user id|server id|zone|idpel|meter|invalid/.test(text);
    };

    if (Number.isFinite(basePrice) && basePrice > maxPrice) {
      lastErrorMsg = `Harga supplier Rp${basePrice} melebihi batas transaksi Rp${maxPrice}`;
      await _setStatus(orderId, 'PROCESSING', {
        metadata: { lastSupplierError: { message: lastErrorMsg, timestamp: new Date().toISOString() }, needsAdminAction: true },
      } as any);
      await _audit('SUPPLIER_PRICE_VALIDATION_FAILED', orderId, { basePrice, maxPrice }, null);
    } else if (!supplier || !supplierProductCode) {
      lastErrorMsg = !supplier ? 'Supplier adapter not available' : 'Supplier product code missing';
      await _setStatus(orderId, 'PROCESSING', {
        metadata: {
          lastSupplierError: { message: lastErrorMsg, timestamp: new Date().toISOString() },
          needsAdminAction: true,
        },
      } as any);
      await _audit('SUPPLIER_ORDER_FAILED', orderId, null, { error: lastErrorMsg });
    } else {
      const maxAttempts = 3; // 1 initial + 2 retries
      let formatIndex = 0;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const customerNo = formats[formatIndex] ?? baseCustomerNo;
          const resp = await supplier.createOrder(
            supplierProductCode,
            customerNo,
            Number(tx.amount),
            orderId,
            maxPrice
          );
          finalResp = resp;
          supplierRef = resp?.ref_id ?? resp?.data?.ref_id ?? orderId;
          supplierSn = resp?.sn ?? resp?.data?.sn ?? null;
          const statusStr = String(resp?.status ?? resp?.data?.status ?? '').toLowerCase();

          if (statusStr === 'sukses') {
            finalFulfillmentStatus = 'SUCCESS';
            lastErrorMsg = null;
            break; // Finished successfully
          } else if (statusStr === 'gagal') {
            finalFulfillmentStatus = 'FAILED';
            lastErrorMsg = resp?.message ?? resp?.data?.message ?? 'Digiflazz order failed';
            if (tx.targetServerId && formatIndex === 0 && isFormatReject(lastErrorMsg)) {
              formatIndex = 1;
              finalFulfillmentStatus = 'PROCESSING';
              lastErrorMsg = 'Retrying with split user_id and zone_id format';
              if (attempt < maxAttempts) {
                await new Promise((r) => setTimeout(r, 100));
                continue;
              }
            }
            break; // Terminal rejection by supplier, no transient retry
          } else {
            // Pending status from supplier
            finalFulfillmentStatus = 'PROCESSING';
            lastErrorMsg = resp?.message ?? resp?.data?.message ?? 'Supplier transaction pending';
            if (attempt < maxAttempts) {
              // Wait 100ms in unit tests, or small backoff
              await new Promise((r) => setTimeout(r, 100));
            }
          }
        } catch (err: any) {
          lastErrorMsg = err?.message || 'Supplier connection error';
          finalFulfillmentStatus = 'PROCESSING';
          if (tx.targetServerId && formatIndex === 0 && isFormatReject(lastErrorMsg)) {
            formatIndex = 1;
            lastErrorMsg = 'Retrying with split user_id and zone_id format';
          }
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 100));
          }
        }
      }

      const isSuccess = finalFulfillmentStatus === 'SUCCESS';
      const isFailed = finalFulfillmentStatus === 'FAILED';

      const metadataUpdate: Record<string, unknown> = {};
      if (!isSuccess) {
        metadataUpdate.lastSupplierError = {
          message: lastErrorMsg,
          rawResponse: finalResp,
          timestamp: new Date().toISOString(),
        };
        metadataUpdate.needsAdminAction = true;
      }

      await _setStatus(orderId, finalFulfillmentStatus, {
        supplierReference: supplierRef,
        supplierSn,
        ...(isSuccess ? { completedAt: new Date() } : {}),
        ...(Object.keys(metadataUpdate).length > 0 ? { metadata: metadataUpdate } : {}),
      } as any);

      if (isSuccess) {
        await _audit('SUPPLIER_ORDER_CREATED', orderId, { targetStatus: 'PAID' }, finalResp);
        if (tx.userId) {
          const earned = calculatePoints(Number(tx.amount));
          if (earned > 0) await _addPoints(tx.userId, orderId, earned);
          await _rewardReferral(tx.userId, orderId);
        }
      } else {
        await _audit('SUPPLIER_RETRY_EXHAUSTED', orderId, { attempts: maxAttempts }, { error: lastErrorMsg });
      }
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
