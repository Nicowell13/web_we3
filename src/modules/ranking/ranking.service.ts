import { db } from '../../db';
import { transactions, users } from '../../db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function getTopSpenders() {
  const rows = await db.select({ avatarUrl: users.avatarUrl, total: sql<string>`sum(${transactions.amount})` })
    .from(transactions).innerJoin(users, eq(transactions.userId, users.id))
    .where(eq(transactions.status, 'SUCCESS')).groupBy(users.id, users.avatarUrl)
    .orderBy(desc(sql`sum(${transactions.amount})`)).limit(5);
  const max = Number(rows[0]?.total || 0);
  return rows.map((row, index) => ({ rank: index + 1, avatarUrl: row.avatarUrl, score: max ? Math.round(Number(row.total) / max * 100) : 0 }));
}
