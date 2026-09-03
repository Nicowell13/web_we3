import { db } from '../../db';
import { auditTrails, vouchers } from '../../db/schema';
import { desc, eq, ilike } from 'drizzle-orm';

const columns = {
  id: vouchers.id,
  code: vouchers.code,
  voucherType: vouchers.voucherType,
  discountType: vouchers.discountType,
  discountValue: vouchers.discountValue,
  minPurchase: vouchers.minPurchase,
  maxDiscount: vouchers.maxDiscount,
  quota: vouchers.quota,
  quotaUsed: vouchers.quotaUsed,
  dailyLimit: vouchers.dailyLimit,
  pointsRequired: vouchers.pointsRequired,
  isPublic: vouchers.isPublic,
  startAt: vouchers.startAt,
  expiresAt: vouchers.expiresAt,
  isActive: vouchers.isActive,
  createdAt: vouchers.createdAt,
};

export async function listAdminVouchers(search?: string) {
  return db.select(columns).from(vouchers).where(search ? ilike(vouchers.code, `%${search}%`) : undefined).orderBy(desc(vouchers.createdAt)).limit(200);
}

export async function createAdminVoucher(input: any) {
  const [created] = await db.insert(vouchers).values(input).returning(columns);
  await db.insert(auditTrails).values({ eventType: 'VOUCHER_CHANGE', referenceId: created.id, rawRequest: input });
  return created;
}

export async function updateAdminVoucher(id: string, input: any) {
  const [updated] = await db.update(vouchers).set(input).where(eq(vouchers.id, id)).returning(columns);
  if (!updated) return null;
  await db.insert(auditTrails).values({ eventType: 'VOUCHER_CHANGE', referenceId: id, rawRequest: input });
  return updated;
}
