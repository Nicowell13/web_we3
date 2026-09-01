/**
 * Daily Check-in Service
 *
 * Rules:
 *  - One check-in per calendar day (Asia/Jakarta, UTC+7)
 *  - Streak increments when consecutive days; resets on gap > 1 calendar day
 *  - Bonus +5 points on streak reaching multiples of 5
 */

export type CheckInResult = {
  success: boolean;
  reason?: 'already_checked_in';
  streak: number;
  pointsAwarded: number;
  bonusAwarded: number;
};

const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7 (WIB)

/** Returns calendar day string "YYYY-MM-DD" in WIB */
export function toWIBDateStr(date: Date = new Date()): string {
  const wib = new Date(date.getTime() + TZ_OFFSET_MS);
  return wib.toISOString().slice(0, 10);
}

/** Days between two calendar date strings (always >= 0) */
export function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.round(ms / 86_400_000);
}

/**
 * Core check-in logic — pure function.
 * @param now              Current timestamp
 * @param lastCheckinAt    DB value: last check-in timestamp (null = never checked in)
 * @param currentStreak    DB value: current streak count
 * @param basePoints       Points per check-in (default 1)
 * @param streakBonus      Bonus points at every 5-day milestone (default 5)
 */
export function computeCheckIn(
  now: Date,
  lastCheckinAt: Date | null,
  currentStreak: number,
  basePoints = 1,
  streakBonus = 5
): CheckInResult {
  const todayStr = toWIBDateStr(now);

  if (lastCheckinAt) {
    const lastStr = toWIBDateStr(lastCheckinAt);

    // Already checked in today
    if (lastStr === todayStr) {
      return { success: false, reason: 'already_checked_in', streak: currentStreak, pointsAwarded: 0, bonusAwarded: 0 };
    }

    const gap = daysBetween(lastStr, todayStr);

    // Gap > 1 day → streak reset
    if (gap > 1) currentStreak = 0;
  }

  const newStreak = currentStreak + 1;
  const bonus = newStreak % 5 === 0 ? streakBonus : 0;

  return {
    success: true,
    streak: newStreak,
    pointsAwarded: basePoints,
    bonusAwarded: bonus,
  };
}
