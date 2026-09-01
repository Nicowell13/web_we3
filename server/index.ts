import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

const port = Number(process.env.PORT) || 3001;

export const app = new Elysia()
  .use(cors())
  .get('/api/health', () => ({
    status: 'ok',
    service: 'wetri-backend',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  }))
  .get('/api/v1/config', () => ({
    brand: 'WETRI.COM',
    tagline: 'Vaporwave & Cyberpunk Top-up Destination',
    version: '1.0.0',
    maintenance: false,
  }));

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[WETRI Server] ElysiaJS running on http://localhost:${port}`);
  });
}
