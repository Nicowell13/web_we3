import { describe, expect, it, mock } from 'bun:test';

// Mock service
mock.module('../src/modules/dashboard/dashboard.service', () => ({
  getDashboardData: async (userId: string) => ({
    profile: {
      id: userId,
      email: 'user@wetri.com',
      name: 'Gamer WETRI',
      avatarUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=user123',
      role: 'user',
      createdAt: new Date(),
    },
    points: 100,
    streak: 2,
    lastCheckinAt: new Date().toISOString(),
    isCheckedInToday: true,
    recentTransactions: [
      {
        orderId: 'ORD-999',
        amount: '50000',
        status: 'SUCCESS',
        gameId: 'mobile-legends',
        createdAt: new Date(),
      },
    ],
    ownedVouchers: [
      {
        id: 'uv-1',
        code: 'WETRIHEMAT',
        discountType: 'fixed',
        discountValue: 5000,
        isUsed: false,
        obtainedAt: new Date(),
      },
    ],
    availableVouchers: [
      {
        id: 'v-1',
        code: 'CYBERPROMO',
        discountType: 'percentage',
        discountValue: 10,
        pointsRequired: 50,
      },
    ],
    activityTimeline: [
      {
        id: 'tx_ORD-999',
        type: 'transaction',
        title: 'Order Top-up #ORD-999',
        description: 'Pembelian game Mobile Legends',
        amount: 'Rp 50.000',
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      },
    ],
  }),
}));

// Mock firebase admin for auth token bypass
mock.module('../src/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: async () => ({ uid: 'user-456', email: 'user@wetri.com', role: 'user' }),
  },
}));

import { app } from '../server/index';

describe('[FEAT-12] Dashboard Routes Expanded API', () => {
  it('GET /api/v1/dashboard returns comprehensive user dashboard payload', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/dashboard', {
        headers: { Authorization: 'Bearer mock-valid-token' },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.profile.id).toBe('user-456');
    expect(json.points).toBe(100);
    expect(json.recentTransactions.length).toBe(1);
    expect(json.availableVouchers.length).toBe(1);
    expect(json.activityTimeline.length).toBe(1);
  });
});
