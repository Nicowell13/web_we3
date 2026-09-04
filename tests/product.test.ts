import { describe, expect, it, mock } from 'bun:test';
import { calculatePriceFromMargin } from '../src/modules/admin/product-admin.service';

 describe('Admin pricing calculation', () => {
  it('calculates fixed and percentage margins', () => {
    expect(calculatePriceFromMargin(10000, 'fixed', 1500)).toBe(11500);
    expect(calculatePriceFromMargin(10000, 'percentage', 10)).toBe(11000);
  });
  it('rejects percentage over 100', () => {
    expect(() => calculatePriceFromMargin(10000, 'percentage', 101)).toThrow();
  });
});

// Mock product service
mock.module('../src/modules/product/product.service', () => ({
  getAllActiveProducts: async () => [
    {
      id: 'p1',
      name: 'Test Product',
      denomination: '100 Coins',
      sellPrice: 1.0,
      gameId: 'g1',
      gameName: 'Game One',
      gameCategory: 'Game',
      thumbnailUrl: 'https://example.com/img.png',
    },
  ],
  getProductById: async (id) => {
    if (id === 'p1') {
      return {
        id: 'p1',
        name: 'Test Product',
        denomination: '100 Coins',
        sellPrice: 1.0,
        gameId: 'g1',
        supplierProductCode: 'SPC123',
        gameName: 'Game One',
        thumbnailUrl: 'https://example.com/img.png',
      };
    }
    return null;
  },
}));

// Mock auth middleware and firebase-admin before any server import
mock.module('../src/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: async () => ({ uid: 'testUser', role: 'user' }),
  },
}));

mock.module('../src/db', () => ({
  db: {
    query: {
      users: {
        findFirst: async () => ({ role: 'user' }),
      },
      systemConfigs: {
        findFirst: async () => ({ key: 'ACTIVE_SUPPLIER', value: 'digiflazz', isActive: true }),
      },
    },
  },
}));

import { app } from '../server/index';

function parseJson(res) {
  return res.text().then((txt) => {
    try { return JSON.parse(txt); } catch { return {}; };
  });
}

describe('[FEAT-08] Product catalog routes', () => {
  it('GET /api/v1/products returns list', async () => {
    const res = await app.handle(new Request('http://localhost:3001/api/v1/products'));
    const json = await parseJson(res);
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.products)).toBe(true);
    expect(json.products[0].id).toBe('p1');
  });

  it('GET /api/v1/product/:id returns product when exists', async () => {
    const res = await app.handle(new Request('http://localhost:3001/api/v1/product/p1', {
      headers: { Authorization: 'Bearer valid-token' },
    }));
    const txt = await res.text();
    let json = {} as any;
    try { json = JSON.parse(txt); } catch {}
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.product.id).toBe('p1');
    expect(json.product.supplierProductCode).toBe('SPC123');
  });

  it('GET /api/v1/product/:id returns not found for unknown', async () => {
    const res = await app.handle(new Request('http://localhost:3001/api/v1/product/unknown', {
      headers: { Authorization: 'Bearer valid-token' },
    }));
    const txt = await res.text();
    let json = {} as any;
    try { json = JSON.parse(txt); } catch {}
    expect(res.status).toBe(200);
    expect(json.ok).toBe(false);
    expect(json.message).toBe('Product not found');
  });
});
