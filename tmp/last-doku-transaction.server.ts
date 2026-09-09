import { db } from './src/db';
import { transactions, products, users } from './src/db/schema';
import { desc, eq } from 'drizzle-orm';

const [row] = await db.select({
  orderId: transactions.orderId,
  amount: transactions.amount,
  status: transactions.status,
  targetUserId: transactions.targetUserId,
  productId: transactions.productId,
  createdAt: transactions.createdAt,
  denomination: products.denomination,
  gameId: products.gameId,
  email: users.email,
  name: users.name,
}).from(transactions)
  .leftJoin(products, eq(transactions.productId, products.id))
  .leftJoin(users, eq(transactions.userId, users.id))
  .orderBy(desc(transactions.createdAt))
  .limit(1);

console.log(JSON.stringify({
  ...row,
  targetUserId: row?.targetUserId ? `${row.targetUserId.slice(0, 4)}***${row.targetUserId.slice(-3)}` : null,
  email: row?.email ? `${row.email[0]}***${row.email.slice(row.email.indexOf('@'))}` : null,
  name: row?.name ? `${row.name[0]}***` : null,
}));
process.exit(0);

