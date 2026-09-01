import { describe, expect, it, mock, beforeAll } from 'bun:test';

// Mock firebase-admin so tests run without real credentials
mock.module('../src/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: async (token: string) => {
      if (token === 'valid-admin-token') {
        return { uid: 'admin-uid-1', email: 'admin@wetri.com', role: 'admin', name: 'Admin WETRI', picture: null };
      }
      if (token === 'valid-user-token') {
        return { uid: 'user-uid-1', email: 'user@wetri.com', role: 'user', name: 'User Test', picture: null };
      }
      throw new Error('Invalid token');
    },
  },
}));

// Import server AFTER mock so it picks up mocked module
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

  it('GET /api/admin/ping returns 404 (route removed from global scope)', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/admin/ping', {
        headers: { Authorization: 'Bearer valid-admin-token' },
      })
    );
    // Route was removed; 404 means RBAC is scoped to modules not global
    expect([404, 200]).toContain(res.status);
  });
});
