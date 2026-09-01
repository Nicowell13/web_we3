import { db } from '../../db';
import { transactions, auditTrails } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { advanceTransaction } from '../../modules/transaction/transaction.service';
import { TxStatus } from '../../modules/transaction/stateMachine';

export type DokuWebhookPayload = {
  order: {
    invoice_number: string;
    amount:         number;
  };
  transaction: {
    status:    string;
    date:      string;
    original_request_id?: string;
  };
  service?: { id: string };
  channel?: { id: string };
};

const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILED', 'REFUNDED']);

async function findTx(orderId: string) {
  return db.query.transactions.findFirst({ where: eq(transactions.orderId, orderId) });
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
 * Terminal status guard → delegates to advanceTransaction (state machine + supplier trigger + points).
 */
export async function handleDokuWebhook(
  payload: DokuWebhookPayload,
  rawBody: string,
  ipAddress?: string,
  _findTx:          typeof findTx          = findTx,
  _writeAuditTrail: typeof writeAuditTrail = writeAuditTrail
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

  const newStatus = mapDokuStatus(incomingStatus) as TxStatus;

  try {
    await advanceTransaction(orderId, newStatus);
  } catch {
    await _writeAuditTrail('DOKU_WEBHOOK_INVALID_TRANSITION', orderId, rawBody, { from: tx.status, to: newStatus }, ipAddress);
    return { skipped: true, reason: 'invalid_transition', orderId };
  }

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
