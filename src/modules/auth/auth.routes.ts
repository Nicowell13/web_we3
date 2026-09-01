import { Elysia, t } from 'elysia';
import { authenticate } from '../../middleware/auth';
import { syncUserFromFirebase } from './auth.service';

/**
 * Auth routes:
 *   POST /api/auth/sync  — sync Firebase user into DB on first login
 *   GET  /api/auth/me    — return current user info from DB
 */
export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .use(authenticate)

  /**
   * POST /api/auth/sync
   * Called by the frontend right after a successful Firebase login.
   * Upserts user record and returns it.
   */
  .post(
    '/sync',
    async ({ user }) => {
      const dbUser = await syncUserFromFirebase({
        id: user.uid,
        email: user.email ?? '',
        name: user.name ?? undefined,
        avatarUrl: user.picture ?? undefined,
      });
      return { ok: true, user: dbUser };
    },
    {
      detail: { summary: 'Sync Firebase user to DB on first login' },
    }
  )

  /**
   * GET /api/auth/me
   * Returns the authenticated user object from DB.
   */
  .get('/me', async ({ user }) => {
    const dbUser = await syncUserFromFirebase({
      id: user.uid,
      email: user.email ?? '',
    });
    return { ok: true, user: dbUser };
  });
