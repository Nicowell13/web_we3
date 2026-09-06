import { Elysia } from 'elysia';
import { getAllActiveProducts, getProductById } from './product.service';

/**
 * Public product catalog API.
 * - GET /api/v1/products            → list active products with basic game info
 * - GET /api/v1/product/:id         → detailed product (requires auth for extra fields)
 */
export const productRoutes = new Elysia({ prefix: '/api/v1' })
  // Public list – no auth needed (catalog visible to anyone)
  .get('/products', async ({ query }) => {
    const q = query as { category?: string; group?: string; search?: string };
    const data = await getAllActiveProducts({ category: q.category?.trim(), group: q.group?.trim(), search: q.search?.trim() });
    return { ok: true, products: data };
  })

  // Public detail – returns only public-safe fields.
  .get('/product/:id', async ({ params }) => {
    const product = await getProductById(params.id);
    if (!product) return { ok: false, message: 'Product not found' };
    return { ok: true, product };
  });

