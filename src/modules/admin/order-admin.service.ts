import { db } from '../../db';
import { transactions, products, gamesCatalog, auditTrails } from '../../db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
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
      productName: products.denomination,
      denomination: products.denomination,
      supplierProductCode: products.supplierProductCode,
      brand: products.brand,
      productType: products.productType,
      category: gamesCatalog.category,
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
    .innerJoin(gamesCatalog, eq(products.gameId, gamesCatalog.id))
    .where(
      or(
        eq(transactions.status, 'PAID'),
        eq(transactions.status, 'PROCESSING'),
        eq(transactions.status, 'FAILED')
      )
    )
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  return rows.map(row => ({ ...row, canRepay: hasConfirmedSupplierFailure(row) || (row.status === 'FAILED' && String((row.metadata?.lastWebhookPayload || {}).status || '').toLowerCase() === 'gagal'), canCorrectTarget: canCorrectPulsaDataTarget(row, row) }));
}

type SupplierAttempt = { status: string; orderId?: string; supplierReference?: string | null; supplierSn?: string | null; paidAt?: unknown; metadata?: unknown };

export function hasConfirmedSupplierFailure(tx: SupplierAttempt) {
  // Allow repay when Digiflazz explicitly reports failure, regardless of internal transaction status,
  // as long as there is no supplier success evidence and transaction not already SUCCESS.
  const meta = (tx.metadata || {}) as Record<string, any>;
  const digiflazzStatus = String(meta.lastWebhookPayload?.status || '').toLowerCase();
  const supplierSucceeded = digiflazzStatus === 'sukses' || String(meta.lastSupplierResponse?.status || '').toLowerCase() === 'sukses';
  const digiflazzFailed = digiflazzStatus === 'gagal' || digiflazzStatus === 'failed';
  if (tx.status === 'SUCCESS' || tx.supplierSn || supplierSucceeded) return false;
  // Require Digiflazz explicit failure indication.
  if (!digiflazzFailed) return false;
  // If transaction already has a retry reference, ensure we are not reusing same attempt.
  const reference = tx.supplierReference || tx.orderId;
  if (!reference) return false;
  if (meta.lastAdminRepay?.attemptRef && meta.lastAdminRepay.attemptRef !== reference) return false;
  const responses = [meta.lastWebhookPayload, meta.lastSupplierResponse, meta.lastSupplierError?.rawResponse]
    .filter(Boolean).map(r => (r.data ?? r));
  const matching = responses.filter(r => r.ref_id === reference);
  // Allow only if all matching responses indicate failure (no success codes).
  return matching.length > 0 && matching.every(r => String(r.status).toLowerCase() === 'gagal' && r.rc !== '00');
}


export function canCorrectPulsaDataTarget(tx: SupplierAttempt, product: { category?: string | null }) {
  return ['Pulsa', 'Data'].includes(product.category || '') && hasConfirmedSupplierFailure(tx);
}

export function validateTargetPhone(phone: string, brand: string | null) {
  if (!/^08\d{8,13}$/.test(phone)) throw new Error('Nomor HP harus 10-15 digit dan diawali 08, tanpa spasi atau simbol');
  const prefixes: Record<string, string> = {
    telkomsel: '0811 0812 0813 0821 0822 0823 0851 0852 0853',
    indosat: '0814 0815 0816 0855 0856 0857 0858',
    xl: '0817 0818 0819 0859 0877 0878', axis: '0831 0832 0833 0838',
    tri: '0895 0896 0897 0898 0899', smartfren: '0881 0882 0883 0884 0885 0886 0887 0888 0889',
  };
  const aliases: Record<string, string> = { tsel: 'telkomsel', simpati: 'telkomsel', as: 'telkomsel', loop: 'telkomsel', isat: 'indosat', im3: 'indosat', mentari: 'indosat', three: 'tri' };
  const normalized = (brand || '').trim().toLowerCase();
  // ponytail: by.U and unknown brands need supplier-specific validation; prefix alone cannot prove compatibility.
  if (!prefixes[aliases[normalized] || normalized]?.split(' ').includes(phone.slice(0, 4))) {
    throw new Error('Nomor tidak cocok dengan operator produk atau operator belum didukung');
  }
  return phone;
}

export async function correctAdminOrderTarget(orderId: string, targetUserId: string) {
  return db.transaction(async database => {
  const rows = await database
    .select({ transaction: transactions, brand: products.brand, productType: products.productType, category: gamesCatalog.category })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .innerJoin(gamesCatalog, eq(products.gameId, gamesCatalog.id))
    .where(eq(transactions.orderId, orderId))
    .limit(1).for('update', { of: transactions });
  if (!rows[0]) throw new Error('Transaction not found');
  const tx = rows[0].transaction;
  if (!canCorrectPulsaDataTarget(tx, rows[0]) || tx.targetServerId) throw new Error('Koreksi memerlukan kegagalan supplier terkonfirmasi untuk pulsa/data');
  const clean = validateTargetPhone(targetUserId, rows[0].brand);
  if (clean === tx.targetUserId) throw new Error('Nomor baru harus berbeda');

  await database.update(transactions).set({
    targetUserId: clean,
    metadata: {
      ...((tx.metadata as Record<string, unknown>) || {}),
      lastAdminTargetCorrection: { oldTargetUserId: tx.targetUserId, newTargetUserId: clean, timestamp: new Date().toISOString() },
    },
    updatedAt: new Date(),
  }).where(eq(transactions.orderId, orderId));
  await database.insert(auditTrails).values({
    eventType: 'ADMIN_TARGET_CORRECTION',
    referenceId: orderId,
    rawRequest: { oldTargetUserId: tx.targetUserId, newTargetUserId: clean },
  });
  return { ok: true, orderId, targetUserId: clean };
  });
}

export async function repayAdminOrder(
  orderId: string,
  options: {
    overrideSupplierSku?: string;
    adminNotes?: string;
    balanceConfirmed?: boolean;
  } = {},
  adminId?: string
) {
  if (options.balanceConfirmed !== true) throw new Error('Konfirmasi pengecekan saldo Digiflazz wajib dicentang');
  if (typeof adminId !== 'string' || !adminId.trim()) throw new Error('Identitas admin wajib tersedia');
  if (options.overrideSupplierSku !== undefined && typeof options.overrideSupplierSku !== 'string') throw new Error('SKU wajib berupa teks');
  if (options.adminNotes !== undefined && typeof options.adminNotes !== 'string') throw new Error('Catatan wajib berupa teks');
  const rows = await db
    .select({
      transaction: transactions,
      defaultSupplierSku: products.supplierProductCode,
      brand: products.brand,
      category: gamesCatalog.category,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .innerJoin(gamesCatalog, eq(products.gameId, gamesCatalog.id))
    .where(eq(transactions.orderId, orderId))
    .limit(1);

  if (!rows[0]) throw new Error('Transaction not found');
  const tx = rows[0].transaction;

  if (!hasConfirmedSupplierFailure(tx) && !(options.balanceConfirmed && adminId)) {
    throw new Error('Repay memerlukan pembayaran dan kegagalan supplier terkonfirmasi atau admin attestation');
  }

  const targetSku = (options.overrideSupplierSku || rows[0].defaultSupplierSku || '').trim();
  if (!targetSku) throw new Error('Target supplier SKU missing');
  if (['Pulsa', 'Data'].includes(rows[0].category)) {
    if (tx.targetServerId) throw new Error('Target pulsa/data tidak boleh memiliki server ID');
    validateTargetPhone(tx.targetUserId, rows[0].brand);
    if (targetSku !== rows[0].defaultSupplierSku) throw new Error('SKU alternatif pulsa/data belum dapat diverifikasi; gunakan SKU asli');
  }

  const customerNo = tx.targetServerId ? `${tx.targetUserId}${tx.targetServerId}` : tx.targetUserId;
  const retryRef = `${orderId}-R${randomUUID()}`;

  const supplier = await getActiveSupplier();
  const confirmation = { adminId, balanceConfirmed: true, confirmedAt: new Date().toISOString(), previousSupplierReference: tx.supplierReference || tx.orderId };
  await db.transaction(async database => {
    const claimed = await database.update(transactions).set({
      status: 'PROCESSING', supplierReference: retryRef,
      metadata: { ...((tx.metadata as Record<string, unknown>) || {}), lastAdminRepay: { attemptRef: retryRef, ...confirmation } },
      updatedAt: new Date(),
    }).where(and(eq(transactions.orderId, orderId), eq(transactions.status, 'FAILED'), eq(transactions.updatedAt, tx.updatedAt), eq(transactions.targetUserId, tx.targetUserId))).returning({ orderId: transactions.orderId });
    if (!claimed.length) throw new Error('Transaksi berubah; muat ulang sebelum repay');
    await database.insert(auditTrails).values({
      eventType: 'ADMIN_REPAY_CONFIRMED', referenceId: orderId,
      rawRequest: { ...confirmation, retryRef, targetSku },
    });
  });
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
      ...confirmation,
      timestamp: new Date().toISOString(),
      overrideSupplierSku: options.overrideSupplierSku ?? null,
      adminNotes: options.adminNotes ?? null,
      attemptRef: retryRef,
      lastError: errorMsg,
    },
    lastSupplierResponse: orderResp,
    needsAdminAction: !isSuccess,
  };

  const finalized = await db
    .update(transactions)
    .set({
      status: finalStatus,
      supplierReference,
      supplierSn,
      metadata: metadataUpdate,
      updatedAt: new Date(),
      ...(isSuccess ? { completedAt: new Date() } : {}),
    } as any)
    .where(and(eq(transactions.orderId, orderId), eq(transactions.status, 'PROCESSING'), eq(transactions.supplierReference, retryRef))).returning({ orderId: transactions.orderId });
  if (!finalized.length) throw new Error('Status berubah selama proses supplier; muat ulang, jangan ulangi repay');

  await db.insert(auditTrails).values({
    eventType: isSuccess ? 'ADMIN_REPAY_SUCCESS' : 'ADMIN_REPAY_FAILED',
    referenceId: orderId,
    rawRequest: { options, retryRef, targetSku, ...confirmation } as any,
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
