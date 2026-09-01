import { createHash, createHmac } from 'crypto';

const DOKU_SANDBOX_URL = 'https://api-sandbox.doku.com';
const DOKU_PROD_URL    = 'https://api.doku.com';

function baseUrl() {
  return process.env.DOKU_ENV === 'production' ? DOKU_PROD_URL : DOKU_SANDBOX_URL;
}

/**
 * Build the DOKU request-id and signature headers required by every API call.
 * Spec: https://developers.doku.com/accept-payment/direct-api/authentication
 *
 * Signature = HMAC-SHA256(requestId + clientId + requestTarget + digest + timestamp, secretKey)
 * Digest    = "SHA-256=" + base64(SHA256(rawBody))
 */
export function buildDokuHeaders(
  requestTarget: string,
  rawBody: string,
  requestId: string
): Record<string, string> {
  const clientId  = process.env.DOKU_CLIENT_ID ?? '';
  const secretKey = process.env.DOKU_SECRET_KEY ?? '';
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

  const digest    = 'SHA-256=' + createHash('sha256').update(rawBody).digest('base64');

  const componentToSign =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${timestamp}\n` +
    `Request-Target:${requestTarget}\n` +
    `Digest:${digest}`;

  const signature = createHmac('sha256', secretKey)
    .update(componentToSign)
    .digest('base64');

  return {
    'Client-Id':          clientId,
    'Request-Id':         requestId,
    'Request-Timestamp':  timestamp,
    Digest:               digest,
    Signature:            `HMACSHA256=${signature}`,
    'Content-Type':       'application/json',
  };
}

/**
 * Verify an incoming DOKU webhook notification signature.
 * DOKU re-uses the same signing scheme — reconstruct and compare.
 */
export function verifyDokuWebhook(
  requestTarget: string,
  rawBody: string,
  incomingRequestId: string,
  incomingTimestamp: string,
  incomingSignature: string
): boolean {
  const secretKey = process.env.DOKU_SECRET_KEY ?? '';
  const clientId  = process.env.DOKU_CLIENT_ID  ?? '';

  const digest = 'SHA-256=' + createHash('sha256').update(rawBody).digest('base64');

  const componentToSign =
    `Client-Id:${clientId}\n` +
    `Request-Id:${incomingRequestId}\n` +
    `Request-Timestamp:${incomingTimestamp}\n` +
    `Request-Target:${requestTarget}\n` +
    `Digest:${digest}`;

  const expected = 'HMACSHA256=' + createHmac('sha256', secretKey)
    .update(componentToSign)
    .digest('base64');

  return expected === incomingSignature;
}

export type CreatePaymentLinkPayload = {
  orderId:      string;
  amount:       number;  // in IDR (integer)
  customerName: string;
  customerEmail: string;
  description:  string;
  expiryMinutes?: number;
};

export type DokuPaymentLinkResponse = {
  invoiceUrl: string;
  paymentReference: string;
  expiresAt: string;
};

/**
 * Create a DOKU payment link (checkout URL).
 * Returns invoice URL and reference for storing in the transactions table.
 */
export async function createDokuPaymentLink(
  payload: CreatePaymentLinkPayload
): Promise<DokuPaymentLinkResponse> {
  const requestTarget = '/checkout/v1/payment';
  const requestId     = payload.orderId;

  const body = JSON.stringify({
    client: {
      id: process.env.DOKU_CLIENT_ID,
    },
    order: {
      invoice_number: payload.orderId,
      line_items: [
        {
          name:     payload.description,
          price:    payload.amount,
          quantity: 1,
        },
      ],
      amount:   payload.amount,
      currency: 'IDR',
    },
    customer: {
      name:  payload.customerName,
      email: payload.customerEmail,
    },
    payment: {
      payment_due_date: payload.expiryMinutes ?? 60,
    },
  });

  const headers = buildDokuHeaders(requestTarget, body, requestId);

  const res = await fetch(`${baseUrl()}${requestTarget}`, {
    method:  'POST',
    headers,
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DOKU API error ${res.status}: ${err}`);
  }

  const data = await res.json() as any;

  return {
    invoiceUrl:       data.response?.payment?.url ?? data.url,
    paymentReference: data.response?.order?.invoice_number ?? payload.orderId,
    expiresAt:        data.response?.order?.expires_at ?? '',
  };
}
