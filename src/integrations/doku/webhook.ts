import { db } from '../../db';
import { transactions, auditTrails } from '../../db/schema';
import { eq } from 'drizzle-orm';

export type DokuWebhookPayload = {
  order: {
    invoice_number: string;
    amount:         number;
  };
  transaction: {
    status:    string;  // 'SUCCESS' | 'FAILED' | 'PENDING'
    date:      string;
    original_request_id?: string;
  };
  service?: { id: string };
  channel?: { id: string };
};

const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILED', 'REFUNDED']);

// Thin repo functions — easy to mock in tests
async function findTx(orderId: string) {
  return db.query.transactions.findFirst({ where: eq(transactions.orderId, orderId) });
}

async function updateTxStatus(orderId: string, newStatus: string, paidAt: Date | null) {
  await db.update(transactions).set({
    status:    newStatus as any,
    updatedAt: new Date(),
    ...(paidAt ? { paidAt } : {}),
  }).where(eq(transactions.orderId, orderId));
}

async function writeAuditTrail(
  eventType: string,
  referenceId: string,
  rawRequest: string,
  rawResponse: unknown,
  ipAddress?: string
) {
  await db.insert(auditTrails).values({
    eventType,
    referenceId,
    rawRequest:  { body: rawRequest } as any,
    rawResponse: rawResponse as any,
    ipAddress,
  });
}

/**
 * Idempotent DOKU webhook handler.
 *
 * Guard:
 *  1. Load transaction by orderId.
 *  2. Already terminal (SUCCESS/FAILED/REFUNDED) → skip, no double-process.
 *  3. Otherwise update status + audit trail.
 */
export async function handleDokuWebhook(
  payload: DokuWebhookPayload,
  rawBody: string,
  ipAddress?: string,
  // Injectable for testing
  _findTx:           typeof findTx        = findTx,
  _updateTxStatus:   typeof updateTxStatus = updateTxStatus,
  _writeAuditTrail:  typeof writeAuditTrail = writeAuditTrail
) {
  const orderId        = payload.order.invoice_number;
  const incomingStatus = payload.transaction.status.toUpperCase();

  const tx = await _findTx(orderId);

  if (!tx) {
    await _writeAuditTrail('DOKU_WEBHOOK_UNKNOWN_ORDER', orderId, rawBody, null, ipAddress);
    return { skipped: true, reason: 'order_not_found', orderId };
  }

  if (TERMINAL_STATUSES.has(tx.status)) {
    await _writeAuditTrail('DOKU_WEBHOOK_DUPLICATE', orderId, rawBody, { existingStatus: tx.status }, ipAddress);
    return { skipped: true, reason: 'already_terminal', status: tx.status, orderId };
  }

  const newStatus = mapDokuStatus(incomingStatus);
  const paidAt    = newStatus === 'PAID' ? new Date() : null;

  await _updateTxStatus(orderId, newStatus, paidAt);
  await _writeAuditTrail('DOKU_WEBHOOK', orderId, rawBody, { newStatus }, ipAddress);

  return { processed: true, orderId, newStatus };
}

function mapDokuStatus(dokuStatus: string): string {
  switch (dokuStatus) {
    case 'SUCCESS': return 'PAID';
    case 'FAILED':  return 'FAILED';
    default:        return 'PENDING';
  }
}
