import { describe, expect, it } from 'bun:test';
import { mapDigiflazzProduct } from '../src/modules/admin/product-sync.service';

describe('[ADMIN-13] Digiflazz product mapping', () => {
  it('normalizes brand and maps valid product', () => {
    const product = mapDigiflazzProduct({ buyer_sku_code: 'ml86', brand: 'Mobile Legends', product_name: '86 Diamonds', price: 20000, type: 'Games', status: 'Normal' });
    expect(product.gameKey).toBe('mobile-legends');
    expect(product.costPrice).toBe('20000');
    expect(product.valid).toBe(true);
  });

  it('rejects empty brand and invalid price', () => {
    expect(mapDigiflazzProduct({ buyer_sku_code: 'x', price: 1000 }).valid).toBe(false);
    expect(mapDigiflazzProduct({ buyer_sku_code: 'x', brand: 'Game', price: 'nope' }).valid).toBe(false);
  });
});
