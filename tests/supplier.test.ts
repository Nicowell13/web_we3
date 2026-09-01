import { describe, expect, it, mock } from 'bun:test';
import { createHmac } from 'crypto';

// ── Mocks ────────────────────────────────────────────────────────────────────
mock.module('../src/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: async (token: string) => {
      if (token === 'valid-admin-token')
        return { uid: 'admin-uid-1', email: 'admin@wetri.com', role: 'admin' };
      throw new Error('Invalid token');
    },
  },
}));

mock.module('../src/db', () => ({
  db: {
    query: {
      systemConfigs: {
        findFirst: async () => ({ key: 'ACTIVE_SUPPLIER', value: 'digiflazz', isActive: true }),
      },
    },
    insert: () => ({ values: () => ({ onConflictDoUpdate: async () => {} }) }),
  },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────
import { DigiflazzAdapter } from '../src/integrations/digiflazz/adapter';
import { verifyDigiflazzWebhook } from '../src/integrations/digiflazz/webhook';
import { resolveSupplier } from '../src/modules/suppliers/supplierFactory';

const MOCK_USER = 'testuser';
const MOCK_KEY  = 'testapikey';

describe('[FEAT-03] DigiflazzAdapter', () => {
  it('implements TopUpProvider interface (checkBalance, createOrder, checkOrderStatus)', () => {
    const adapter = new DigiflazzAdapter(MOCK_USER, MOCK_KEY);
    expect(typeof adapter.checkBalance).toBe('function');
    expect(typeof adapter.inquireAccount).toBe('function');
    expect(typeof adapter.createOrder).toBe('function');
    expect(typeof adapter.checkOrderStatus).toBe('function');
  });

  it('inquireAccount returns targetId passthrough', async () => {
    const adapter = new DigiflazzAdapter(MOCK_USER, MOCK_KEY);
    const result = await adapter.inquireAccount('123456789');
    expect(result.targetId).toBe('123456789');
  });
});

describe('[FEAT-03] Digiflazz Webhook Signature Verification', () => {
  const payload = {
    data: {
      ref_id: 'WETRI-TEST-001',
      buyer_sku_code: 'mlbb-86',
      customer_no: '123456789',
      status: 'Sukses' as const,
    },
  };

  it('accepts a valid webhook signature', () => {
    const validSign = createHmac('md5', MOCK_KEY)
      .update(MOCK_USER + MOCK_KEY + payload.data.ref_id)
      .digest('hex');
    expect(verifyDigiflazzWebhook(payload, MOCK_USER, MOCK_KEY, validSign)).toBe(true);
  });

  it('rejects an invalid webhook signature', () => {
    expect(verifyDigiflazzWebhook(payload, MOCK_USER, MOCK_KEY, 'bad-signature')).toBe(false);
  });
});

describe('[FEAT-03] Supplier Factory', () => {
  it('resolveSupplier("digiflazz") returns a DigiflazzAdapter', () => {
    const supplier = resolveSupplier('digiflazz');
    expect(supplier).toBeInstanceOf(DigiflazzAdapter);
  });

  it('resolveSupplier throws for unknown supplier', () => {
    expect(() => resolveSupplier('unknown-supplier')).toThrow('Unknown supplier');
  });
});

describe('[FEAT-03] Supplier Routes (HTTP)', () => {
  it('GET /api/v1/supplier/active is public and returns supplier name', async () => {
    const { app } = await import('../server/index');
    const res = await app.handle(new Request('http://localhost:3001/api/v1/supplier/active'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.supplier).toBe('digiflazz');
  });

  it('GET /api/v1/supplier/balance returns 401 without token', async () => {
    const { app } = await import('../server/index');
    const res = await app.handle(new Request('http://localhost:3001/api/v1/supplier/balance'));
    expect(res.status).toBe(401);
  });
});
