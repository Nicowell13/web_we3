import { describe, expect, it, mock } from 'bun:test';

// Mock Cloudinary helper
mock.module('../src/lib/cloudinary', () => ({
  uploadAvatarToCloudinary: async (file: any, id: string) => `https://res.cloudinary.com/wetri/image/upload/v1234/avatars/${id}.webp`,
  getDicebearAvatarUrl: (seed: string) => `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}`,
}));

// Mock DB
mock.module('../src/db', () => ({
  db: {
    query: {
      users: {
        findFirst: async () => ({
          id: 'test-user-123',
          email: 'gamer@wetri.com',
          name: 'CyberGamer',
          avatarUrl: 'https://api.dicebear.com/9.x/bottts/svg?seed=test-user-123',
          role: 'user',
          points: 250,
          streak: 3,
          lastCheckinAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    },
    update: () => ({
      set: () => ({
        where: () => Promise.resolve([{ id: 'test-user-123' }]),
      }),
    }),
  },
}));

// Mock firebase admin for auth token bypass
mock.module('../src/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: async () => ({ uid: 'test-user-123', email: 'gamer@wetri.com', role: 'user' }),
  },
}));

import { app } from '../server/index';

describe('[FEAT-12] User Profile & Avatar Routes', () => {
  it('GET /api/v1/user/profile returns authenticated user record', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/user/profile', {
        headers: { Authorization: 'Bearer mock-valid-token' },
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.user.id).toBe('test-user-123');
    expect(json.user.points).toBe(250);
  });

  it('POST /api/v1/user/avatar uploads string/base64 avatar', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/user/avatar', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.avatarUrl).toContain('cloudinary.com');
  });

  it('POST /api/v1/user/avatar rejects empty payload with 400', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/user/avatar', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
