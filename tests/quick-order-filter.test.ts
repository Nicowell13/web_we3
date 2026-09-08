import { describe, expect, it } from 'bun:test';
import { matchesOperatorBrand } from '../src/components/home/QuickOrderWidget';

const product = (brand: string | null, gameName: string, name = '') => ({ brand, gameName, name } as any);

describe('QuickOrder operator grouping', () => {
  it('matches exact normalized operator metadata', () => {
    expect(matchesOperatorBrand(product('Tri', 'Pulsa'), 'Tri')).toBe(true);
    expect(matchesOperatorBrand(product(null, 'Three'), 'Tri')).toBe(true);
  });

  it('does not match loose operator text in unrelated products', () => {
    expect(matchesOperatorBrand(product('Games', 'Magic Chess', '3 Diamonds'), 'Tri')).toBe(false);
    expect(matchesOperatorBrand(product('Voucher', 'Streaming', 'Internet 3 Bulan'), 'Tri')).toBe(false);
    expect(matchesOperatorBrand(product('Extra', 'XL Extra'), 'XL')).toBe(false);
  });
});
