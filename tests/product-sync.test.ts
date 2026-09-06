import { describe, expect, it } from 'bun:test';
import { classifyDigiflazzProduct, mapDigiflazzProduct } from '../src/modules/admin/product-sync.service';

describe('[ADMIN-13] Digiflazz product mapping', () => {
  it('normalizes brand and maps valid product', () => {
    const product = mapDigiflazzProduct({ buyer_sku_code: 'ml86', brand: 'Mobile Legends', product_name: '86 Diamonds', price: 20000, type: 'Games', status: 'Normal' });
    expect(product.gameKey).toBe('mobile-legends');
    expect(product.category).toBe('Game');
    expect(product.costPrice).toBe('20000');
    expect(product.valid).toBe(true);
  });

  it('rejects empty brand and invalid price', () => {
    expect(mapDigiflazzProduct({ buyer_sku_code: 'x', price: 1000 }).valid).toBe(false);
    expect(mapDigiflazzProduct({ buyer_sku_code: 'x', brand: 'Game', price: 'nope' }).valid).toBe(false);
  });
});

describe('[ADMIN-14] Digiflazz product classification', () => {
  it('classifies games', () => {
    expect(classifyDigiflazzProduct({ brand: 'Mobile Legends' }).category).toBe('Game');
    expect(classifyDigiflazzProduct({ brand: 'Free Fire' }).category).toBe('Game');
  });

  it('classifies pulsa providers', () => {
    for (const brand of ['TELKOMSEL', 'XL', 'AXIS', 'INDOSAT', 'TRI', 'SMARTFREN', 'BY.U']) {
      expect(classifyDigiflazzProduct({ brand }).category).toBe('Pulsa');
    }
  });

  it('classifies PLN and e-wallets', () => {
    expect(classifyDigiflazzProduct({ brand: 'PLN' }).category).toBe('PLN');
    for (const brand of ['DANA', 'OVO', 'GoPay', 'ShopeePay']) {
      expect(classifyDigiflazzProduct({ brand }).category).toBe('E-Wallet');
    }
  });

  it('classifies voucher and unknown brands', () => {
    expect(classifyDigiflazzProduct({ brand: 'K-Vision', product_name: 'Voucher TV' }).category).toBe('Voucher');
    expect(classifyDigiflazzProduct({ brand: 'Pertamina Gas' }).category).toBe('Other');
  });
});
