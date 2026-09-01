import { describe, expect, it, mock } from 'bun:test';
import { createHash, createHmac } from 'crypto';

// ── Mocks ────────────────────────────────────────────────────────────────────
mock.module('../src/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: async (token: string) => {
      if (token === 'valid-admin-token')
        return { uid: 'admin-uid-1', email: 'admin@wetri.com', role: 'admin' };
      if (token === 'valid-user-token')
        return { uid: 'user-uid-1', email: 'user@wetri.com', role: 'user' };
      throw new Error('Invalid token');
    },
  },
}));

mock.module('../src/db', () => ({
  db: {
    query: { systemConfigs: { findFirst: async () => ({ key: 'ACTIVE_SUPPLIER', value: 'digiflazz', isActive: true }) } },
    insert: () => ({ values: async () => {} }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
  },
}));

mock.module('../src/modules/transaction/transaction.service', () => ({
  advanceTransaction: async (orderId: string, status: string) => ({ orderId, from: 'PENDING', to: status }),
  findTx: async () => null,
}));

// ── Env for signature tests ───────────────────────────────────────────────────
const CLIENT_ID  = 'TEST-CLIENT';
const SECRET_KEY = '***';
process.env.DOKU_CLIENT_ID  = CLIENT_ID;
process.env.DOKU_SECRET_KEY = SECRET_KEY;

// ── Imports after mocks ───────────────────────────────────────────────────────
import { buildDokuHeaders, verifyDokuWebhook } from '../src/integrations/doku/client';
import { handleDokuWebhook } from '../src/integrations/doku/webhook';

// ── Fake DB rows for idempotency tests ───────────────────────────────────────
const fakeDb: Record<string, { status: string; paidAt: null }> = {
  'WETRI-PENDING-001': { status: 'PENDING', paidAt: null },
  'WETRI-SUCCESS-001': { status: 'SUCCESS', paidAt: null },
};
const fakeFindTx    = async (orderId: string) => fakeDb[orderId] ?? null;
const fakeAudit     = async () => {};

// ── Helper ────────────────────────────────────────────────────────────────────
function makeValidSignature(target: string, body: string, reqId: string, ts: string) {
  const digest = 'SHA-256=' + createHash('sha256').update(body).digest('base64');
  const comp   =
    `Client-Id:${CLIENT_ID}\n` +
    `Request-Id:${reqId}\n` +
    `Request-Timestamp:${ts}\n` +
    `Request-Target:${target}\n` +
    `Digest:${digest}`;
  return 'HMACSHA256=' + createHmac('sha256', SECRET_KEY).update(comp).digest('base64');
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('[FEAT-04] DOKU Signature: buildDokuHeaders', () => {
  it('returns all required DOKU headers', () => {
    const h = buildDokuHeaders('/checkout/v1/payment', '{"test":1}', 'REQ-001');
    expect(h['Client-Id']).toBe(CLIENT_ID);
    expect(h['Request-Id']).toBe('REQ-001');
    expect(h['Digest']).toMatch(/^SHA-256=/);
    expect(h['Signature']).toMatch(/^HMACSHA256=/);
    expect(h['Content-Type']).toBe('application/json');
  });
});

describe('[FEAT-04] DOKU Signature: verifyDokuWebhook', () => {
  const target = '/api/v1/payment/webhook';
  const body   = '{"order":{"invoice_number":"WETRI-TEST-001","amount":25000}}';
  const reqId  = 'HOOK-REQ-001';
  const ts     = '2026-09-01T14:00:00Z';

  it('accepts a correctly signed webhook', () => {
    const sig = makeValidSignature(target, body, reqId, ts);
    expect(verifyDokuWebhook(target, body, reqId, ts, sig)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    expect(verifyDokuWebhook(target, body, reqId, ts, 'HMACSHA256=bad')).toBe(false);
  });

  it('rejects when body is tampered (digest mismatch)', () => {
    const sig = makeValidSignature(target, body, reqId, ts);
    expect(verifyDokuWebhook(target, '{"tampered":true}', reqId, ts, sig)).toBe(false);
  });
});

describe('[FEAT-04] DOKU Idempotency Guard: handleDokuWebhook', () => {
  it('processes PENDING → PAID on SUCCESS webhook', async () => {
    const payload = {
      order:       { invoice_number: 'WETRI-PENDING-001', amount: 25000 },
      transaction: { status: 'SUCCESS', date: '2026-09-01T14:00:00Z' },
    };
    const result = await handleDokuWebhook(
      payload, JSON.stringify(payload), undefined,
      fakeFindTx, fakeAudit
    );
    expect(result.processed).toBe(true);
    expect(result.newStatus).toBe('PAID');
    expect(result.orderId).toBe('WETRI-PENDING-001');
  });

  it('skips when transaction already SUCCESS (idempotent duplicate)', async () => {
    const payload = {
      order:       { invoice_number: 'WETRI-SUCCESS-001', amount: 25000 },
      transaction: { status: 'SUCCESS', date: '2026-09-01T14:01:00Z' },
    };
    const result = await handleDokuWebhook(
      payload, JSON.stringify(payload), undefined,
      fakeFindTx, fakeAudit
    );
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('already_terminal');
  });

  it('returns order_not_found for unknown orderId', async () => {
    const payload = {
      order:       { invoice_number: 'WETRI-UNKNOWN-999', amount: 25000 },
      transaction: { status: 'SUCCESS', date: '2026-09-01T14:02:00Z' },
    };
    const result = await handleDokuWebhook(
      payload, JSON.stringify(payload), undefined,
      fakeFindTx, fakeAudit
    );
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('order_not_found');
  });
});

describe('[FEAT-04] Webhook HTTP: signature gate', () => {
  it('POST /api/v1/payment/webhook returns 401 with invalid signature', async () => {
    const { app } = await import('../server/index');
    const body = JSON.stringify({
      order:       { invoice_number: 'WETRI-TEST-001', amount: 25000 },
      transaction: { status: 'SUCCESS', date: '2026-09-01T14:00:00Z' },
    });
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/payment/webhook', {
        method:  'POST',
        headers: {
          'Content-Type':      'application/json',
          'Request-Id':        'HOOK-001',
          'Request-Timestamp': '2026-09-01T14:00:00Z',
          Signature:           'HMACSHA256=invalidsignature',
        },
        body,
      })
    );
    expect(res.status).toBe(401);
  });
});
