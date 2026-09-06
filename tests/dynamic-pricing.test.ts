import { describe, expect, it } from 'bun:test';
import { calculateSellPrice } from '../src/modules/product/pricing.service';

describe('[FEAT-23] Dynamic Pricing Calculation & Auto-Recalculate Engine', () => {
  it('calculates percentage margin with ceiling rounding', () => {
    // 10.000 + 5% = 10.500
    expect(calculateSellPrice(10000, 'percentage', 5)).toBe(10500);

    // 10.001 + 5% = 10.501,05 -> ceil = 10502
    expect(calculateSellPrice(10001, 'percentage', 5)).toBe(10502);

    // 25.430 + 7.5% = 27.337,25 -> ceil = 27338
    expect(calculateSellPrice(25430, 'percentage', 7.5)).toBe(27338);

    // 0% margin returns exact base price
    expect(calculateSellPrice(50000, 'percentage', 0)).toBe(50000);
  });

  it('calculates fixed margin correctly', () => {
    // 10.000 + Rp 1.500 = 11.500
    expect(calculateSellPrice(10000, 'fixed', 1500)).toBe(11500);

    // 99.999 + Rp 2.500 = 102.499
    expect(calculateSellPrice(99999, 'fixed', 2500)).toBe(102499);
  });

  it('handles string inputs gracefully', () => {
    expect(calculateSellPrice('15000', 'percentage', '10')).toBe(16500);
    expect(calculateSellPrice('20000.50', 'fixed', '1000')).toBe(21001);
  });

  it('throws error for invalid basePrice or marginValue', () => {
    expect(() => calculateSellPrice(-500, 'percentage', 5)).toThrow('Invalid base price');
    expect(() => calculateSellPrice('abc', 'percentage', 5)).toThrow('Invalid base price');
    expect(() => calculateSellPrice(10000, 'percentage', -10)).toThrow('Invalid margin value');
    expect(() => calculateSellPrice(10000, 'percentage', 'xyz')).toThrow('Invalid margin value');
  });
});
