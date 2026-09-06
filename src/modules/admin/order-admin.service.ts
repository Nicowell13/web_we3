import { db } from '../../db';
import { transactions, products, auditTrails } from '../../db/schema';
import { eq, and, or, inArray, desc } from 'drizzle-orm';
import { getActiveSupplier } from '../suppliers/supplierFactory';
import { calculatePoints } from '../transaction/points.logic';
import { rewardReferral } from '../user/referral.service';
import { TxStatus } from '../transaction/stateMachine';

export async function listFailedOrActionOrders() {
  const rows = await db
    .select({
      orderId: transactions.orderId,
      userId: transactions.userId,
      productId: transactions.productId,
      productName: products.name,
      denomination: products.denomination,
      supplierProductCode: products.supplierProductCode,
      targetUserId: transactions.targetUserId,
      targetServerId: transactions.targetServerId,
      amount: transactions.amount,
      status: transactions.status,
      supplierReference: transactions.supplierReference,
      supplierSn: transactions.supplierSn,
      metadata: transactions.metadata,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      paidAt: transactions.paidAt,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .where(
      or(
        eq(transactions.status, 'PAID'),
        eq(transactions.status, 'PROCESSING'),
        eq(transactions.status, 'FAILED')
      )
    )
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  return rows;
}

export async function repayAdminOrder(
  orderId: string,
  options: {
    overrideSupplierSku?: string;
    adminNotes?: string;
  } = {}
) {
  const rows = await db
    .select({
      transaction: transactions,
      defaultSupplierSku: products.supplierProductCode,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .where(eq(transactions.orderId, orderId))
    .limit(1);

  if (!rows[0]) throw new Error('Transaction not found');
  const tx = rows[0].transaction;

  if (tx.status === 'SUCCESS') {
    throw new Error('Transaction is already marked SUCCESS');
  }

  const targetSku = (options.overrideSupplierSku || rows[0].defaultSupplierSku || '').trim();
  if (!targetSku) throw new Error('Target supplier SKU missing');

  const customerNo = tx.targetServerId ? `${tx.targetUserId}${tx.targetServerId}` : tx.targetUserId;
  const retryRef = `${orderId}-R${Date.now().toString().slice(-4)}`;

  const supplier = await getActiveSupplier();
  let orderResp: any = null;
  let finalStatus: TxStatus = 'PROCESSING';
  let errorMsg: string | null = null;

  try {
    orderResp = await supplier.createOrder(
      targetSku,
      customerNo,
      Number(tx.amount),
      retryRef
    );
    const statusStr = String(orderResp?.status ?? orderResp?.data?.status ?? '').toLowerCase();
    if (statusStr === 'sukses') finalStatus = 'SUCCESS';
    else if (statusStr === 'gagal') {
      finalStatus = 'FAILED';
      errorMsg = orderResp?.message ?? orderResp?.data?.message ?? 'Digiflazz order failed';
    } else {
      finalStatus = 'PROCESSING';
      errorMsg = orderResp?.message ?? orderResp?.data?.message ?? 'Supplier transaction pending';
    }
  } catch (err: any) {
    errorMsg = err?.message || 'Supplier connection error';
    finalStatus = 'PROCESSING';
  }

  const supplierReference = orderResp?.ref_id ?? orderResp?.data?.ref_id ?? retryRef;
  const supplierSn = orderResp?.sn ?? orderResp?.data?.sn ?? tx.supplierSn;
  const isSuccess = finalStatus === 'SUCCESS';

  const metadataUpdate = {
    ...((tx.metadata as Record<string, unknown>) || {}),
    lastAdminRepay: {
      timestamp: new Date().toISOString(),
      overrideSupplierSku: options.overrideSupplierSku ?? null,
      adminNotes: options.adminNotes ?? null,
      attemptRef: retryRef,
      lastError: errorMsg,
    },
    needsAdminAction: !isSuccess,
  };

  await db
    .update(transactions)
    .set({
      status: finalStatus,
      supplierReference,
      supplierSn,
      metadata: metadataUpdate,
      updatedAt: new Date(),
      ...(isSuccess ? { completedAt: new Date() } : {}),
    } as any)
    .where(eq(transactions.orderId, orderId));

  await db.insert(auditTrails).values({
    eventType: isSuccess ? 'ADMIN_REPAY_SUCCESS' : 'ADMIN_REPAY_FAILED',
    referenceId: orderId,
    rawRequest: { options, retryRef, targetSku } as any,
    rawResponse: orderResp as any,
  });

  if (isSuccess && tx.userId) {
    const earned = calculatePoints(Number(tx.amount));
    if (earned > 0) {
      await db.update(transactions).set({ pointsEarned: earned } as any).where(eq(transactions.orderId, orderId));
    }
    await rewardReferral(tx.userId, orderId);
  }

  return {
    ok: true,
    orderId,
    status: finalStatus,
    targetSku,
    supplierReference,
    supplierSn,
    error: errorMsg,
  };
}
