import { db } from '../src/db';
import { users, transactions } from '../src/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getDashboardData } from '../src/modules/dashboard/dashboard.service';
const [row] = await db.select({userId: transactions.userId}).from(transactions).orderBy(desc(transactions.createdAt)).limit(1);
try { const d = await getDashboardData(row.userId!); console.log(JSON.stringify({ok:true,userId:row.userId?.slice(0,8),tx:d.recentTransactions.length,vouchers:d.availableVouchers.length,points:d.points})); }
catch(e){ console.error(e); process.exitCode=1; }
process.exit();
