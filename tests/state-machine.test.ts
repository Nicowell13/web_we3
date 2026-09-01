import { describe, expect, it } from 'bun:test';
import { canTransition, assertTransition, isTerminal, TxStatus } from '../../src/modules/transaction/stateMachine';
import { calculatePoints } from '../../src/modules/transaction/points.logic';

describe('[FEAT-05] State Machine: canTransition', () => {
  const valid: [TxStatus, TxStatus][] = [
    ['PENDING',    'PAID'],
    ['PENDING',    'FAILED'],
    ['PAID',       'PROCESSING'],
    ['PAID',       'FAILED'],
    ['PROCESSING', 'SUCCESS'],
    ['PROCESSING', 'FAILED'],
  ];

  for (const [from, to] of valid) {
    it(`allows ${from} → ${to}`, () => {
      expect(canTransition(from, to)).toBe(true);
    });
  }

  const invalid: [TxStatus, TxStatus][] = [
    ['PENDING',    'SUCCESS'],
    ['PENDING',    'PROCESSING'],
    ['PAID',       'PENDING'],
    ['SUCCESS',    'PAID'],
    ['FAILED',     'PROCESSING'],
    ['REFUNDED',   'SUCCESS'],
  ];

  for (const [from, to] of invalid) {
    it(`blocks ${from} → ${to}`, () => {
      expect(canTransition(from, to)).toBe(false);
    });
  }
});

describe('[FEAT-05] State Machine: assertTransition', () => {
  it('does not throw for valid transition', () => {
    expect(() => assertTransition('PENDING', 'PAID')).not.toThrow();
  });

  it('throws for invalid transition', () => {
    expect(() => assertTransition('SUCCESS', 'PAID')).toThrow('Invalid state transition');
  });
});

describe('[FEAT-05] State Machine: isTerminal', () => {
  it('SUCCESS is terminal',      () => expect(isTerminal('SUCCESS')).toBe(true));
  it('FAILED is terminal',       () => expect(isTerminal('FAILED')).toBe(true));
  it('REFUNDED is terminal',     () => expect(isTerminal('REFUNDED')).toBe(true));
  it('PENDING is not terminal',  () => expect(isTerminal('PENDING')).toBe(false));
  it('PAID is not terminal',     () => expect(isTerminal('PAID')).toBe(false));
  it('PROCESSING is not terminal', () => expect(isTerminal('PROCESSING')).toBe(false));
});

describe('[FEAT-05] Points Logic: calculatePoints', () => {
  it('Rp 25.000 → 25 points',             () => expect(calculatePoints(25000)).toBe(25));
  it('Rp 1.000  → 1 point',               () => expect(calculatePoints(1000)).toBe(1));
  it('Rp 500    → 0 points (below Rp1K)', () => expect(calculatePoints(500)).toBe(0));
  it('Rp 86.000 → 86 points',             () => expect(calculatePoints(86000)).toBe(86));
  it('Rp 1.999  → 1 point (floor)',        () => expect(calculatePoints(1999)).toBe(1));
});
