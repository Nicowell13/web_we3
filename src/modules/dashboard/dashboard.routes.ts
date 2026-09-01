import { Elysia } from 'elysia';
import { authenticate } from '../../middleware/auth';
import { getDashboardData } from './dashboard.service';

/**
 * User dashboard API – protected.
 * GET /api/v1/dashboard returns JSON with points, streak, recent transactions, voucher history.
 */
export const dashboardRoutes = new Elysia({ prefix: '/api/v1' })
  .use(authenticate)
  .get('/dashboard', async ({ user }) => {
    try {
      const data = await getDashboardData(user.uid);
      return { ok: true, ...data };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  });

