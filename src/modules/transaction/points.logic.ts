/**
 * Points reward logic.
 * +1 point per Rp 1.000 spent (floor division).
 */
export function calculatePoints(amountIDR: number): number {
  return Math.floor(amountIDR / 1000);
}
