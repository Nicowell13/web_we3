import { describe, expect, it } from 'bun:test';
import { choose, hardFilter } from '../scripts/supplier-optimizer';
describe('supplier optimizer', () => { it('enforces filters and lowest price', () => { expect(hardFilter({ faktur_pajak: 'Tidak', multi: 'Ya', rating: 3, reviews: 11, status: 'Normal' })).toBe(true); expect(choose([{ buyer_sku_code: 'X', price: 20, faktur_pajak: 'Tidak', multi: 'Ya', rating: 3, reviews: 11, status: 'Normal' }, { buyer_sku_code: 'X', price: 10, faktur_pajak: 'Tidak', multi: 'Ya', rating: 4, reviews: 20, status: 'Aktif' }])[0].price).toBe(10); }); });
