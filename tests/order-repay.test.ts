import { describe, expect, it, mock } from 'bun:test';
import { canCorrectPulsaDataTarget, correctAdminOrderTarget, repayAdminOrder, hasConfirmedSupplierFailure, validateTargetPhone } from '../src/modules/admin/order-admin.service';

let locked = false;
let failAudit = false;
let updates = 0;
let supplierCalls = 0;
let current: any;
let claimWins = false;
let audits: any[] = [];
const query: any = { from: () => query, innerJoin: () => query, where: () => query, limit: () => query, for: async () => { locked = true; return [current]; }, then: (resolve: any) => Promise.resolve([current]).then(resolve) };
const database: any = {
  query: { users: { findFirst: async () => ({ role: 'admin', status: 'active' }) } },
  select: () => query,
  update: () => ({ set: () => ({ where: () => { updates++; return { returning: async () => claimWins ? [{ orderId: 'TEST-100' }] : [] }; } }) }),
  insert: () => ({ values: async (value: any) => { if (failAudit) throw new Error('audit unavailable'); audits.push(value); } }),
  transaction: async (run: any) => { const before = updates; try { return await run(database); } catch (error) { updates = before; throw error; } },
};
mock.module('../src/db', () => ({ db: database }));
mock.module('../src/modules/suppliers/supplierFactory', () => ({ getActiveSupplier: async () => ({ createOrder: async () => { supplierCalls++; expect(audits.some(audit => audit.eventType === 'ADMIN_REPAY_CONFIRMED')).toBe(true); return { status: 'Pending' }; } }) }));

mock.module('../src/lib/firebase-admin', () => ({ adminAuth: { verifyIdToken: async () => ({ uid: 'authenticated-admin' }) } }));

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
    await expect(repayAdminOrder('TEST-100', { balanceConfirmed: true }, 'admin-test')).rejects.toThrow('Transaksi berubah');
    expect(supplierCalls).toBe(0);
  });
  it('requires strict boolean attestation and server-provided admin identity before any claim', async () => {
    updates = 0; supplierCalls = 0;
    for (const balanceConfirmed of [undefined, false, 'true', 1, 'Sudah cek Digiflazz']) {
      await expect(repayAdminOrder('TEST-100', { balanceConfirmed } as any, 'admin-test')).rejects.toThrow('Konfirmasi');
    }
    await expect(repayAdminOrder('TEST-100', { balanceConfirmed: true })).rejects.toThrow('Identitas admin');
    expect(updates).toBe(0); expect(supplierCalls).toBe(0);
  });
  it('does not let attestation replace paid failure evidence in backend', async () => {
    updates = 0; supplierCalls = 0;
    for (const tx of [
      ...['PENDING', 'PROCESSING', 'UNKNOWN', 'SUCCESS', 'REFUNDED', 'PAID'].map(status => ({ ...failed, status })),
      { ...failed, paidAt: null }, { ...failed, metadata: {} },
      { ...failed, metadata: { lastSupplierError: { message: 'Gagal: saldo sudah kembali' } } },
      { ...failed, metadata: { lastSupplierError: { message: 'timeout' } } },
      { ...failed, supplierSn: 'SUCCESS-SN' },
      { ...failed, metadata: { ...failed.metadata, lastSupplierResponse: { status: 'Sukses' } } },
    ]) {
      current = { transaction: tx };
      await expect(repayAdminOrder('TEST-100', { balanceConfirmed: true }, 'admin-test')).rejects.toThrow('kegagalan supplier terkonfirmasi');
    }
    expect(updates).toBe(0); expect(supplierCalls).toBe(0);
  });
  it('atomically audits confirmation before supplier call; audit failure rolls claim back', async () => {
    current = { transaction: { ...failed, targetUserId: '081234567890', updatedAt: new Date(), amount: '10000' }, defaultSupplierSku: 'T10', category: 'Pulsa', brand: 'Telkomsel' };
    claimWins = true; failAudit = true; updates = 0; supplierCalls = 0; audits = [];
    await expect(repayAdminOrder('TEST-100', { balanceConfirmed: true }, 'admin-test')).rejects.toThrow('audit unavailable');
    expect(updates).toBe(0); expect(supplierCalls).toBe(0);
    failAudit = false;
    await expect(repayAdminOrder('TEST-100', { balanceConfirmed: true }, 'admin-test')).resolves.toMatchObject({ ok: true, status: 'PROCESSING' });
    expect(supplierCalls).toBe(1);
    expect(audits[0]).toMatchObject({ eventType: 'ADMIN_REPAY_CONFIRMED', rawRequest: { adminId: 'admin-test', balanceConfirmed: true, previousSupplierReference: 'TEST-100' } });
    expect(audits[0].rawRequest.confirmedAt).toBeString();
    claimWins = false;
  });
  it('HTTP endpoint enforces attestation and audits authenticated identity, not body identity', async () => {
    const { adminRoutes } = await import('../src/modules/admin/admin.routes');
    const { Elysia } = await import('elysia');
    const app = new Elysia().use(adminRoutes);
    current = { transaction: { ...failed, targetUserId: '081234567890', updatedAt: new Date(), amount: '10000' }, defaultSupplierSku: 'T10', category: 'Pulsa', brand: 'Telkomsel' };
    const request = (body: unknown, authenticated = true) => app.handle(new Request('http://localhost/api/v1/old-school/orders/TEST-100/repay', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer test-only' } : {}) }, body: JSON.stringify(body),
    }));
    supplierCalls = 0; audits = []; claimWins = true;
    expect((await request({ balanceConfirmed: true }, false)).status).toBe(401);
    for (const balanceConfirmed of [undefined, false, 'true']) expect((await request({ balanceConfirmed })).status).toBe(400);
    expect(supplierCalls).toBe(0);
    const response = await request({ balanceConfirmed: true, adminId: 'forged-body-admin' });
    expect(response.status).toBe(200);
    expect(audits[0].rawRequest.adminId).toBe('authenticated-admin');
    expect(supplierCalls).toBe(1);
    claimWins = false;
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
