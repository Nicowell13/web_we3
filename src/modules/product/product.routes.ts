import { Elysia } from 'elysia';
import { authenticate } from '../../middleware/auth';
import { getAllActiveProducts, getProductById } from './product.service';

/**
 * Public product catalog API.
 * - GET /api/v1/products            → list active products with basic game info
 * - GET /api/v1/product/:id         → detailed product (requires auth for extra fields)
 */
export const productRoutes = new Elysia({ prefix: '/api/v1' })
  // Public list – no auth needed (catalog visible to anyone)
  .get('/products', async () => {
    const data = await getAllActiveProducts();
    return { ok: true, products: data };
  })

  // Detailed view – user must be authenticated to see supplier codes, etc.
  .use(authenticate)
  .get('/product/:id', async ({ params }) => {
    const product = await getProductById(params.id);
    if (!product) return { ok: false, message: 'Product not found' };
    return { ok: true, product };
  });

