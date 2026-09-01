/**
 * advanceTransaction integration tests.
 * Isolated from payment.test.ts mocks by running in a separate file.
 * Uses injectable fakes — no real DB or supplier calls.
 */
import { describe, expect, it } from 'bun:test';
import { advanceTransaction } from '../src/modules/transaction/transaction.service';

const noop = async () => {};

describe('[FEAT-05] advanceTransaction: state machine + supplier + points', () => {
  it('PENDING → PAID triggers supplier order and advances to PROCESSING', async () => {
    const updated: string[] = [];
    const audited: string[] = [];

    const mockSupplier = {
      createOrder:       async () => ({ status: 'Pending', ref_id: 'DGFZ-001' }),
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
      async () => mockSupplier as any
    );

    expect(result.from).toBe('PENDING');
    expect(result.to).toBe('PAID');
    expect(audited).toContain('STATUS_CHANGE');
    expect(audited).toContain('SUPPLIER_ORDER_CREATED');
    expect(updated).toContain('PROCESSING');
  });

  it('PROCESSING → SUCCESS awards correct points (Rp 86.000 → 86 pts)', async () => {
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
      async (_uid: string, pts: number) => { pointsAwarded = pts; },
      async (ev: string) => { audited.push(ev); },
      async () => ({}) as any
    );

    expect(pointsAwarded).toBe(86);
    expect(audited).toContain('POINTS_AWARDED');
  });

  it('PROCESSING → SUCCESS with Rp 500 awards 0 points (no audit entry)', async () => {
    const audited: string[] = [];
    const fakeTx = { orderId: 'WETRI-003', status: 'PROCESSING', userId: 'u1', amount: '500', targetUserId: '1' };

    await advanceTransaction(
      'WETRI-003', 'SUCCESS', {},
      async () => fakeTx as any, noop, noop,
      async (ev: string) => { audited.push(ev); },
      async () => ({}) as any
    );

    expect(audited).not.toContain('POINTS_AWARDED');
  });

  it('throws on invalid transition PENDING → SUCCESS', async () => {
    const fakeTx = { orderId: 'WETRI-004', status: 'PENDING', userId: 'u1', amount: '25000', targetUserId: '1' };

    await expect(
      advanceTransaction(
        'WETRI-004', 'SUCCESS', {},
        async () => fakeTx as any, noop, noop, noop,
        async () => ({}) as any
      )
    ).rejects.toThrow('Invalid state transition');
  });

  it('throws when transaction not found', async () => {
    await expect(
      advanceTransaction(
        'WETRI-MISSING', 'PAID', {},
        async () => null, noop, noop, noop,
        async () => ({}) as any
      )
    ).rejects.toThrow('Transaction not found');
  });
});
