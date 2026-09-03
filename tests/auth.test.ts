import { describe, expect, it, mock } from 'bun:test';

let lastVerifiedUid: string | null = null;

// Mock firebase-admin so tests run without real credentials
mock.module('../src/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: async (token: string) => {
      if (token === 'valid-admin-token') {
        lastVerifiedUid = 'admin-uid-1';
        return { uid: 'admin-uid-1', email: 'admin@wetri.com', role: 'admin', name: 'Admin WETRI', picture: null };
      }
      if (token === 'valid-user-token') {
        lastVerifiedUid = 'user-uid-1';
        return { uid: 'user-uid-1', email: 'user@wetri.com', role: 'user', name: 'User Test', picture: null };
      }
      if (token === 'forged-admin-claim-token') {
        lastVerifiedUid = 'user-uid-1';
        return { uid: 'user-uid-1', email: 'user@wetri.com', role: 'admin', name: 'User Test', picture: null };
      }
      throw new Error('Invalid token');
    },
  },
}));

mock.module('../src/db', () => ({
  db: {
    query: {
      users: {
        findFirst: async () => {
          if (lastVerifiedUid === 'admin-uid-1') return { role: 'admin' };
          if (lastVerifiedUid === 'user-uid-1') return { role: 'user' };
          return null;
        },
      },
      systemConfigs: {
        findFirst: async () => ({ key: 'ACTIVE_SUPPLIER', value: 'digiflazz', isActive: true }),
      },
    },
  },
}));

// Import server AFTER mocks so it picks up mocked modules
const { app } = await import('../server/index');

describe('[FEAT-02] Auth Middleware & RBAC', () => {
  it('GET /api/health is public and returns 200', async () => {
    const res = await app.handle(new Request('http://localhost:3001/api/health'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
  });

  it('POST /api/auth/sync returns 401 without token', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/auth/sync', { method: 'POST' })
    );
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/sync returns 401 with invalid token', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/auth/sync', {
        method: 'POST',
        headers: { Authorization: 'Bearer bad-token' },
      })
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/supplier/balance returns 403 for non-admin user token', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/supplier/balance', {
        headers: { Authorization: 'Bearer valid-user-token' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('GET /api/v1/supplier/balance ignores forged Firebase admin claim and uses DB role', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/supplier/balance', {
        headers: { Authorization: 'Bearer forged-admin-claim-token' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('GET /api/v1/old-school/ping returns 401 without token', async () => {
    const res = await app.handle(new Request('http://localhost:3001/api/v1/old-school/ping'));
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/old-school/ping returns 403 for non-admin DB role', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/old-school/ping', {
        headers: { Authorization: 'Bearer valid-user-token' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('GET /api/v1/old-school/ping returns 200 for admin DB role', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/old-school/ping', {
        headers: { Authorization: 'Bearer valid-admin-token' },
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it('legacy admin ping routes return 404', async () => {
    const headers = { Authorization: 'Bearer valid-admin-token' };
    const oldGlobal = await app.handle(new Request('http://localhost:3001/api/admin/ping', { headers }));
    const oldV1 = await app.handle(new Request('http://localhost:3001/api/v1/admin/ping', { headers }));
    expect(oldGlobal.status).toBe(404);
    expect(oldV1.status).toBe(404);
  });
});
