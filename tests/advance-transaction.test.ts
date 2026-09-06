/**
 * advanceTransaction integration tests.
 * Isolated from payment.test.ts mocks by running in a separate file.
 * Uses injectable fakes â€” no real DB or supplier calls.
 */
import { describe, expect, it } from 'bun:test';
import { advanceTransaction } from '../src/modules/transaction/transaction.service';

const noop = async () => {};

describe('[FEAT-05] advanceTransaction: state machine + supplier + points', () => {
  it('PENDING â†’ PAID triggers supplier order and advances to PROCESSING', async () => {
    const updated: string[] = [];
    const audited: string[] = [];

    let supplierRef = '';
    const mockSupplier = {
      createOrder:       async (_sku: string, _target: string, _amount: number, ref: string) => {
        supplierRef = ref;
        return { status: 'Pending', ref_id: 'DGFZ-001' };
      },
      checkBalance:      async () => {},
      inquireAccount:    async () => {},
      checkOrderStatus:  async () => {},
    };

    const fakeTx = {
      orderId: 'WETRI-001', status: 'PENDING', userId: 'u1',
      amount: '25000', targetUserId: '123456789',
      supplierProductCode: 'MLBB-86',
    };

    const result = await advanceTransaction(
      'WETRI-001',
      'PAID',
      {},
      async () => fakeTx as any,
      async (_id: string, s: string) => { updated.push(s); },
      noop,
      async (ev: string) => { audited.push(ev); },
      async () => mockSupplier as any,
      async () => false
    );

    expect(result.from).toBe('PENDING');
    expect(result.to).toBe('PAID');
    expect(audited).toContain('STATUS_CHANGE');
    expect(audited).toContain('SUPPLIER_RETRY_EXHAUSTED');
    expect(updated).toContain('PROCESSING');
    expect(supplierRef).toBe('WETRI-001');
  });

  it('uses supplier SKU and combines game user + zone for Digiflazz customer_no', async () => {
    let receivedSku = '';
    let receivedTarget = '';
    const fakeTx = {
      orderId: 'WETRI-ZONE', status: 'PENDING', userId: 'u1', amount: '25000',
      targetUserId: '12345678', targetServerId: '2024', supplierProductCode: 'ML86',
    };
    const mockSupplier = {
      createOrder: async (sku: string, target: string) => {
        receivedSku = sku;
        receivedTarget = target;
        return { status: 'Pending', ref_id: 'DGFZ-ZONE' };
      },
    };

    await advanceTransaction(
      fakeTx.orderId, 'PAID', {}, async () => fakeTx as any, noop, noop, noop,
      async () => mockSupplier as any, async () => false
    );

    expect(receivedSku).toBe('ML86');
    expect(receivedTarget).toBe('123456782024');
  });

  it('marks immediately successful supplier response SUCCESS', async () => {
    const updated: string[] = [];
    const fakeTx = {
      orderId: 'WETRI-INSTANT', status: 'PENDING', userId: 'u1', amount: '25000',
      targetUserId: '08123456789', supplierProductCode: 'TSEL25',
    };
    const mockSupplier = {
      createOrder: async () => ({ status: 'Sukses', ref_id: 'DGFZ-OK', sn: 'SN123' }),
    };

    await advanceTransaction(
      fakeTx.orderId, 'PAID', {}, async () => fakeTx as any,
      async (_id: string, status: string) => { updated.push(status); }, noop, noop,
      async () => mockSupplier as any, async () => false
    );

    expect(updated).toContain('SUCCESS');
  });

  it('retries up to 2x on Pending and succeeds when second attempt returns Sukses', async () => {
    let callCount = 0;
    const updated: string[] = [];
    const audited: string[] = [];

    const mockSupplier = {
      createOrder: async () => {
        callCount++;
        if (callCount === 1) return { status: 'Pending', ref_id: 'DGFZ-P1' };
        return { status: 'Sukses', ref_id: 'DGFZ-P1', sn: 'SN-RETRY-OK' };
      },
    };

    const fakeTx = {
      orderId: 'WETRI-RETRY-OK', status: 'PENDING', userId: 'u1', amount: '25000',
      targetUserId: '089612345678', supplierProductCode: 'TRI25',
    };

    await advanceTransaction(
      fakeTx.orderId, 'PAID', {}, async () => fakeTx as any,
      async (_id: string, status: string) => { updated.push(status); }, noop,
      async (ev: string) => { audited.push(ev); },
      async () => mockSupplier as any, async () => false
    );

    expect(callCount).toBe(2);
    expect(updated).toContain('SUCCESS');
    expect(audited).toContain('SUPPLIER_ORDER_CREATED');
  });

  it('exhausts 3 attempts on persistent Pending/error and sets needsAdminAction flag', async () => {
    let callCount = 0;
    let finalMetadata: any = null;
    const updated: string[] = [];
    const audited: string[] = [];

    const mockSupplier = {
      createOrder: async () => {
        callCount++;
        return { status: 'Pending', message: 'Stok supplier sedang kosong' };
      },
    };

    const fakeTx = {
      orderId: 'WETRI-EXHAUSTED', status: 'PENDING', userId: 'u1', amount: '50000',
      targetUserId: '08123456789', supplierProductCode: 'TSEL50',
    };

    await advanceTransaction(
      fakeTx.orderId, 'PAID', {}, async () => fakeTx as any,
      async (_id: string, status: string, extra: any) => {
        updated.push(status);
        if (extra?.metadata) finalMetadata = extra.metadata;
      }, noop,
      async (ev: string) => { audited.push(ev); },
      async () => mockSupplier as any, async () => false
    );

    expect(callCount).toBe(3);
    expect(updated).toContain('PROCESSING');
    expect(audited).toContain('SUPPLIER_RETRY_EXHAUSTED');
    expect(finalMetadata?.needsAdminAction).toBe(true);
    expect(finalMetadata?.lastSupplierError?.message).toBe('Stok supplier sedang kosong');
  });

  it('PROCESSING â†’ SUCCESS awards correct points (Rp 86.000 â†’ 86 pts)', async () => {
    let pointsAwarded = 0;
    const audited: string[] = [];

    const fakeTx = {
      orderId: 'WETRI-002', status: 'PROCESSING', userId: 'u1',
      amount: '86000', targetUserId: '123456789',
    };

    await advanceTransaction(
      'WETRI-002',
      'SUCCESS',
      {},
      async () => fakeTx as any,
      noop,
      async (_uid: string, orderId: string, pts: number) => {
        expect(orderId).toBe('WETRI-002');
        pointsAwarded = pts;
      },
      async (ev: string) => { audited.push(ev); },
      async () => ({}) as any,
      async () => false
    );

    expect(pointsAwarded).toBe(86);
    expect(audited).toContain('POINTS_AWARDED');
  });

  it('PROCESSING â†’ SUCCESS with Rp 500 awards 0 points (no audit entry)', async () => {
    const audited: string[] = [];
    const fakeTx = { orderId: 'WETRI-003', status: 'PROCESSING', userId: 'u1', amount: '500', targetUserId: '1' };

    await advanceTransaction(
      'WETRI-003', 'SUCCESS', {},
      async () => fakeTx as any, noop, noop,
      async (ev: string) => { audited.push(ev); },
      async () => ({}) as any,
      async () => false
    );

    expect(audited).not.toContain('POINTS_AWARDED');
  });

  it('throws on invalid transition PENDING â†’ SUCCESS', async () => {
    const fakeTx = { orderId: 'WETRI-004', status: 'PENDING', userId: 'u1', amount: '25000', targetUserId: '1' };

    await expect(
      advanceTransaction(
        'WETRI-004', 'SUCCESS', {},
        async () => fakeTx as any, noop, noop, noop,
        async () => ({}) as any,
        async () => false
      )
    ).rejects.toThrow('Invalid state transition');
  });

  it('throws when transaction not found', async () => {
    await expect(
      advanceTransaction(
        'WETRI-MISSING', 'PAID', {},
        async () => null, noop, noop, noop,
        async () => ({}) as any,
        async () => false
      )
    ).rejects.toThrow('Transaction not found');
  });
});
