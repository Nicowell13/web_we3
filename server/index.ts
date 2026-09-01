import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authRoutes } from '../src/modules/auth/auth.routes';
import { supplierPublicRoutes, supplierAdminRoutes } from '../src/modules/suppliers/supplier.routes';
import { paymentRoutes, webhookRoutes } from '../src/modules/payment/payment.routes';
import { voucherRoutes } from '../src/modules/voucher/voucher.routes';
import { checkinRoutes } from '../src/modules/checkin/checkin.routes';
import { adminRoutes } from '../src/modules/admin/admin.routes';
import { userRoutes } from '../src/modules/user/user.routes';
let productRoutes;
try {
  productRoutes = require('../src/modules/product/product.routes').productRoutes;
} catch (e) {
  // In test environment without full deps, skip product routes.
  productRoutes = null;
}
import { dashboardRoutes } from '../src/modules/dashboard/dashboard.routes';

const port = Number(process.env.PORT) || 3001;

export const app = new Elysia()
  .use(cors())

  // Public routes
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
  }))

  // Auth module
  .use(authRoutes)

  // Supplier module (public then admin)
  .use(supplierPublicRoutes)
  .use(supplierAdminRoutes)

  // Payment module
  .use(paymentRoutes)
  .use(webhookRoutes)

  // Voucher / Loyalty module
  .use(voucherRoutes)
  .use(checkinRoutes)
  .use(userRoutes)
  // Product catalog (if present)
  .use(productRoutes || new Elysia())
  // Dashboard and Admin modules
  .use(dashboardRoutes)
  .use(adminRoutes);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[WETRI Server] ElysiaJS running on http://localhost:${port}`);
  });
}
