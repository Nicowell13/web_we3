import { db } from '../../db';
import { products, gamesCatalog } from '../../db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * Fetch all active products with minimal game data.
 */
export async function getAllActiveProducts() {
  const rows = await db
    .select({
      id: products.id,
      name: products.denomination,
      denomination: products.denomination,
      sellPrice: products.sellPrice,
      gameId: products.gameId,
      gameName: gamesCatalog.name,
      gameCategory: gamesCatalog.category,
      thumbnailUrl: gamesCatalog.thumbnailUrl,
    })
    .from(products)
    .innerJoin(gamesCatalog, eq(products.gameId, gamesCatalog.id))
    .where(and(eq(products.isActive, true), eq(gamesCatalog.isActive, true)))
    .orderBy(products.displayOrder);

  return rows;
}

/**
 * Fetch a single product by its UUID.
 */
export async function getProductById(productId: string) {
  const rows = await db
    .select({
      id: products.id,
      name: products.denomination,
      denomination: products.denomination,
      sellPrice: products.sellPrice,
      gameId: products.gameId,
      supplierProductCode: products.supplierProductCode,
      gameName: gamesCatalog.name,
      thumbnailUrl: gamesCatalog.thumbnailUrl,
    })
    .from(products)
    .innerJoin(gamesCatalog, eq(products.gameId, gamesCatalog.id))
    .where(eq(products.id, productId))
    .limit(1);

  return rows[0] ?? null;
}
