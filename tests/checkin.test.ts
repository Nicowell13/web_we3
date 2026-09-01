import { describe, expect, it } from 'bun:test';
import { computeCheckIn, toWIBDateStr, daysBetween } from '../src/modules/checkin/checkin.service';

// Helper: build Date for a given WIB date string at noon
function wibNoon(dateStr: string): Date {
  // WIB = UTC+7; noon WIB = 05:00 UTC
  return new Date(`${dateStr}T05:00:00.000Z`);
}

describe('[FEAT-07] toWIBDateStr', () => {
  it('converts UTC+0 midnight to WIB next-day string', () => {
    // 2026-09-01T00:00:00Z = 2026-09-01 07:00 WIB
    const d = new Date('2026-09-01T00:00:00.000Z');
    expect(toWIBDateStr(d)).toBe('2026-09-01');
  });

  it('converts 16:59 UTC to WIB same-day (23:59 WIB)', () => {
    const d = new Date('2026-09-01T16:59:00.000Z');
    expect(toWIBDateStr(d)).toBe('2026-09-01');
  });

  it('converts 17:00 UTC to WIB next-day (00:00 WIB)', () => {
    const d = new Date('2026-09-01T17:00:00.000Z');
    expect(toWIBDateStr(d)).toBe('2026-09-02');
  });
});

describe('[FEAT-07] daysBetween', () => {
  it('same day → 0', () => expect(daysBetween('2026-09-01', '2026-09-01')).toBe(0));
  it('consecutive days → 1', () => expect(daysBetween('2026-09-01', '2026-09-02')).toBe(1));
  it('2-day gap → 2', () => expect(daysBetween('2026-09-01', '2026-09-03')).toBe(2));
  it('order-independent', () => expect(daysBetween('2026-09-03', '2026-09-01')).toBe(2));
});

describe('[FEAT-07] computeCheckIn', () => {
  const base = 1;
  const bonus = 5;

  it('first ever check-in (no prior): streak=1, 1 point, no bonus', () => {
    const r = computeCheckIn(wibNoon('2026-09-01'), null, 0);
    expect(r.success).toBe(true);
    expect(r.streak).toBe(1);
    expect(r.pointsAwarded).toBe(1);
    expect(r.bonusAwarded).toBe(0);
  });

  it('consecutive day increments streak', () => {
    const last = wibNoon('2026-09-01');
    const now  = wibNoon('2026-09-02');
    const r = computeCheckIn(now, last, 3);
    expect(r.success).toBe(true);
    expect(r.streak).toBe(4);
  });

  it('streak 4 → 5 triggers +5 bonus', () => {
    const last = wibNoon('2026-09-01');
    const now  = wibNoon('2026-09-02');
    const r = computeCheckIn(now, last, 4);
    expect(r.success).toBe(true);
    expect(r.streak).toBe(5);
    expect(r.bonusAwarded).toBe(5);
  });

  it('streak 9 → 10 also triggers bonus (every 5)', () => {
    const last = wibNoon('2026-09-01');
    const now  = wibNoon('2026-09-02');
    const r = computeCheckIn(now, last, 9);
    expect(r.streak).toBe(10);
    expect(r.bonusAwarded).toBe(5);
  });

  it('gap of 2 days resets streak to 1', () => {
    const last = wibNoon('2026-09-01');
    const now  = wibNoon('2026-09-03');  // skipped 2026-09-02
    const r = computeCheckIn(now, last, 7);
    expect(r.success).toBe(true);
    expect(r.streak).toBe(1);
    expect(r.bonusAwarded).toBe(0);
  });

  it('gap of 10 days resets streak to 1', () => {
    const last = wibNoon('2026-08-20');
    const now  = wibNoon('2026-09-01');
    const r = computeCheckIn(now, last, 10);
    expect(r.streak).toBe(1);
  });

  it('same calendar day (WIB) returns already_checked_in', () => {
    const last = wibNoon('2026-09-01');
    const now  = new Date(last.getTime() + 2 * 60 * 60 * 1000); // +2h same day
    const r = computeCheckIn(now, last, 3);
    expect(r.success).toBe(false);
    expect(r.reason).toBe('already_checked_in');
    expect(r.streak).toBe(3); // unchanged
  });

  it('check-in very late at night WIB (23:59) still counts as today', () => {
    // 23:59 WIB = 16:59 UTC
    const last = new Date('2026-08-31T16:59:00.000Z');
    const now  = new Date('2026-09-01T05:00:00.000Z'); // noon next WIB day
    const r = computeCheckIn(now, last, 2);
    expect(r.success).toBe(true);
    expect(r.streak).toBe(3);
  });
});
