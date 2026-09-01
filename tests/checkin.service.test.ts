import { describe, expect, it } from 'bun:test';
import { computeCheckIn } from '../../src/modules/checkin/checkin.service';

/** Helper to create a Date at UTC midnight */
function utc(date: string) {
  return new Date(date + 'T00:00:00Z');
}

describe('[FEAT-07] Daily check‑in service', () => {
  it('first check‑in creates streak=1', () => {
    const res = computeCheckIn(utc('2026-09-01'), null, 0);
    expect(res.success).toBe(true);
    expect(res.streak).toBe(1);
  });

  it('consecutive day increments streak', () => {
    const last = utc('2026-09-01');
    const now = utc('2026-09-02');
    const res = computeCheckIn(now, last, 3);
    expect(res.streak).toBe(4);
  });

  it('gap >1 resets streak', () => {
    const last = utc('2026-09-01');
    const now = utc('2026-09-03');
    const res = computeCheckIn(now, last, 5);
    expect(res.streak).toBe(1);
  });
});

