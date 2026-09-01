import { describe, expect, it } from 'bun:test';
import { calculatePoints } from '../../src/modules/transaction/points.logic';

describe('[FEAT-05] Points logic unit tests', () => {
  it('Rp 25.000 → 25 points', () => {
    expect(calculatePoints(25000)).toBe(25);
  });
  it('Rp 1.999 → 0 points (below 1k)', () => {
    expect(calculatePoints(1999)).toBe(0);
  });
  it('Rp 10.000 → 10 points (exact 1k multiple)', () => {
    expect(calculatePoints(10000)).toBe(10);
  });
  it('Rp 12.345 → 12 points (floor)', () => {
    expect(calculatePoints(12345)).toBe(12);
  });
});

