import { db } from '../src/db';
import { transactions, products, gamesCatalog } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const rows = await db
    .select({
      transaction: transactions,
      brand: products.brand,
      productType: products.productType,
      category: gamesCatalog.category,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .innerJoin(gamesCatalog, eq(products.gameId, gamesCatalog.id))
    .where(eq(transactions.orderId, 'WETRI-20260908-PIIG_H8X'))
    .limit(1);
  console.log(JSON.stringify(rows, null, 2));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

