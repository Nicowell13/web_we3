import { Elysia } from 'elysia';
import { getTopSpenders } from './ranking.service';

export const rankingRoutes = new Elysia({ prefix: '/api/v1/rankings' })
  .get('/top-spenders', async () => ({ ok: true, rankings: await getTopSpenders() }));
