import { describe, expect, it } from 'bun:test';
import { getMillisecondsUntilMidnightWIB } from '../src/modules/product/scheduler.service';
import { calculateSellPrice } from '../src/modules/product/pricing.service';

describe('[FEAT-24] Admin Bulk Product Actions & Scheduler Unit Tests', () => {
  it('calculates positive remaining milliseconds until 00:00 WIB', () => {
    const ms = getMillisecondsUntilMidnightWIB();
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it('computes batch price updates with percentage margins', () => {
    const products = [
      { id: '1', basePrice: 10000 },
      { id: '2', basePrice: 25000 },
      { id: '3', basePrice: 50000 },
    ];

    const updated = products.map(p => ({
      id: p.id,
      sellPrice: calculateSellPrice(p.basePrice, 'percentage', 5),
    }));

    expect(updated[0].sellPrice).toBe(10500);
    expect(updated[1].sellPrice).toBe(26250);
    expect(updated[2].sellPrice).toBe(52500);
  });

  it('computes batch price updates with fixed margins', () => {
    const products = [
      { id: '1', basePrice: 10000 },
      { id: '2', basePrice: 25000 },
    ];

    const updated = products.map(p => ({
      id: p.id,
      sellPrice: calculateSellPrice(p.basePrice, 'fixed', 2000),
    }));

    expect(updated[0].sellPrice).toBe(12000);
    expect(updated[1].sellPrice).toBe(27000);
  });
});
