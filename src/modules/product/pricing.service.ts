/**
 * Dynamic Pricing Calculation Engine
 * Handles ceiling-rounded profit margin calculation for products.
 */

export type MarginType = 'percentage' | 'fixed';

/**
 * Calculates selling price from base supplier cost, margin type, and margin value.
 * Always rounds up (Math.ceil) to the nearest integer.
 */
export function calculateSellPrice(
  basePrice: number | string,
  marginType: MarginType = 'percentage',
  marginValue: number | string = 5
): number {
  const numericBase = Number(basePrice);
  const numericMargin = Number(marginValue);

  if (isNaN(numericBase) || numericBase < 0) {
    throw new Error(`Invalid base price: ${basePrice}`);
  }

  if (isNaN(numericMargin) || numericMargin < 0) {
    throw new Error(`Invalid margin value: ${marginValue}`);
  }

  if (marginType === 'percentage') {
    return Math.ceil(numericBase * (1 + numericMargin / 100));
  }

  return Math.ceil(numericBase + numericMargin);
}
