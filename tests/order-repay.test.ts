import { describe, expect, it, mock } from 'bun:test';
import { canCorrectPulsaDataTarget, correctAdminOrderTarget, repayAdminOrder, hasConfirmedSupplierFailure, validateTargetPhone } from '../src/modules/admin/order-admin.service';

let locked = false;
let failAudit = false;
let updates = 0;
let supplierCalls = 0;
let current: any;
const query: any = { from: () => query, innerJoin: () => query, where: () => query, limit: () => query, for: async () => { locked = true; return [current]; }, then: (resolve: any) => Promise.resolve([current]).then(resolve) };
const database: any = {
  select: () => query,
  update: () => ({ set: () => ({ where: () => { updates++; return { returning: async () => [] }; } }) }),
  insert: () => ({ values: async () => { if (failAudit) throw new Error('audit unavailable'); } }),
  transaction: async (run: any) => { const before = updates; try { return await run(database); } catch (error) { updates = before; throw error; } },
};
mock.module('../src/db', () => ({ db: database }));
mock.module('../src/modules/suppliers/supplierFactory', () => ({ getActiveSupplier: async () => ({ createOrder: async () => { supplierCalls++; } }) }));

const failed = {
  orderId: 'TEST-100', status: 'FAILED', paidAt: new Date(), supplierReference: 'TEST-100', supplierSn: null,
  metadata: { lastWebhookPayload: { ref_id: 'TEST-100', status: 'Gagal', rc: '14' } },
};

describe('admin correction and repay safety', () => {
  it('locks correction and rolls back when audit cannot be saved', async () => {
    current = { transaction: { ...failed, targetUserId: '081234567890', updatedAt: new Date() }, category: 'Pulsa', brand: 'Telkomsel' };
    failAudit = true; updates = 0; locked = false;
    await expect(correctAdminOrderTarget('TEST-100', '081298765432')).rejects.toThrow('audit unavailable');
    expect(locked).toBe(true); expect(updates).toBe(0);
    failAudit = false;
    await expect(correctAdminOrderTarget('TEST-100', '081298765432')).resolves.toMatchObject({ ok: true, targetUserId: '081298765432' });
    expect(updates).toBe(1);
  });
  it('never calls supplier when concurrent repay claim loses', async () => {
    current = { transaction: { ...failed, targetUserId: '081234567890', updatedAt: new Date(), amount: '10000' }, defaultSupplierSku: 'T10', category: 'Pulsa', brand: 'Telkomsel' };
    await expect(repayAdminOrder('TEST-100')).rejects.toThrow('Transaksi berubah');
    expect(supplierCalls).toBe(0);
  });
  it('accepts only exact catalog Pulsa/Data categories and confirmed paid failures', () => {
    for (const category of ['Pulsa', 'Data']) expect(canCorrectPulsaDataTarget(failed, { category })).toBe(true);
    for (const category of ['Game', 'Internet', 'PLN', 'Voucher Data', '', 'E-Wallet']) expect(canCorrectPulsaDataTarget(failed, { category })).toBe(false);
    expect(hasConfirmedSupplierFailure({ ...failed, paidAt: null })).toBe(false);
  });
  it('blocks pending, refunded, success, processing and unknown states', () => {
    for (const status of ['PENDING', 'REFUNDED', 'SUCCESS', 'PAID', 'PROCESSING', 'UNKNOWN']) expect(hasConfirmedSupplierFailure({ ...failed, status })).toBe(false);
  });
  it('blocks timeout, absent evidence, stale attempts and pending supplier responses', () => {
    for (const metadata of [{}, { lastSupplierError: { message: 'timeout' } }, { lastWebhookPayload: { ref_id: 'OLD', status: 'Gagal' } }, { lastWebhookPayload: { ref_id: 'TEST-100', status: 'Pending', rc: '03' } }, { ...failed.metadata, lastAdminRepay: { attemptRef: 'NEW' } }]) expect(hasConfirmedSupplierFailure({ ...failed, metadata })).toBe(false);
  });
  it('blocks every supported success signal even alongside failure', () => {
    expect(hasConfirmedSupplierFailure({ ...failed, supplierSn: 'SN' })).toBe(false);
    for (const evidence of [{ status: 'Sukses' }, { status: 'SUCCESS' }, { rc: '00' }, { sn: 'SN' }, { data: { status: 'Sukses' } }]) expect(hasConfirmedSupplierFailure({ ...failed, metadata: { ...failed.metadata, lastSupplierResponse: evidence } })).toBe(false);
  });
  it('accepts nested confirmed failure responses but rejects contradictory pending evidence', () => {
    expect(hasConfirmedSupplierFailure({ ...failed, metadata: { lastSupplierError: { rawResponse: { data: failed.metadata.lastWebhookPayload } } } })).toBe(true);
    expect(hasConfirmedSupplierFailure({ ...failed, metadata: { ...failed.metadata, lastSupplierResponse: { ref_id: 'TEST-100', status: 'Pending' } } })).toBe(false);
  });
  it('validates phone syntax and operator compatibility without stripping invalid input', () => {
    expect(validateTargetPhone('081234567890', 'TELKOMSEL')).toBe('081234567890');
    expect(validateTargetPhone('089512345678', 'Three')).toBe('089512345678');
    for (const phone of ['0812abc345678', '+6281234567890', '0812 345678', '08123', '0812345678901234']) expect(() => validateTargetPhone(phone, 'Telkomsel')).toThrow();
    for (const brand of ['XL', 'by.U', 'Unknown', null]) expect(() => validateTargetPhone('081234567890', brand)).toThrow();
  });
});
