/**
 * Rank Pricing Utilities
 * 
 * Client-safe pricing calculations (no database imports)
 * Prices are configurable per rank in the admin panel
 */

// Default pricing per day for each rank (can be overridden by database)
export const DEFAULT_RANK_PRICING: Record<string, number> = {
  'supporter': 0.17,      // ~$5/month
  'patron': 0.33,         // ~$10/month
  'elite': 0.50,          // ~$15/month
  'legend': 0.83,         // ~$25/month
  'champion': 1.67,       // ~$50/month
};

// Runtime pricing cache (populated from database)
let RANK_PRICING: Record<string, number> = { ...DEFAULT_RANK_PRICING };

/**
 * Update pricing from database ranks
 */
export function updatePricingFromRanks(ranks: Array<{ id: string; minAmount: number; duration?: number }>) {
  ranks.forEach(rank => {
    const duration = rank.duration || 30;
    RANK_PRICING[rank.id.toLowerCase()] = rank.minAmount / duration;
  });
}

/**
 * Get current pricing
 */
export function getRankPricing(): Record<string, number> {
  return { ...RANK_PRICING };
}

/**
 * Calculate days for a given price and rank
 */
export function calculateDaysForPrice(rankId: string, price: number): number {
  const pricePerDay = RANK_PRICING[rankId.toLowerCase()] || 0.17;
  return Math.floor(price / pricePerDay);
}

/**
 * Calculate price for a given rank and duration
 */
export function calculatePriceForDays(rankId: string, days: number): number {
  const pricePerDay = RANK_PRICING[rankId.toLowerCase()] || 0.17;
  return Math.round(pricePerDay * days * 100) / 100; // Round to 2 decimals
}

/**
 * Get duration packages with pricing
 */
export function getDurationPackages(rankId: string): Array<{
  days: number;
  label: string;
  price: number;
  discount?: number;
}> {
  const basePrice = RANK_PRICING[rankId.toLowerCase()] || 0.17;
  
  return [
    {
      days: 30,
      label: '1 Month',
      price: Math.round(basePrice * 30 * 100) / 100,
    },
    {
      days: 90,
      label: '3 Months',
      price: Math.round(basePrice * 90 * 0.95 * 100) / 100, // 5% discount
      discount: 5,
    },
    {
      days: 180,
      label: '6 Months',
      price: Math.round(basePrice * 180 * 0.90 * 100) / 100, // 10% discount
      discount: 10,
    },
    {
      days: 365,
      label: '12 Months',
      price: Math.round(basePrice * 365 * 0.85 * 100) / 100, // 15% discount
      discount: 15,
    },
  ];
}

/**
 * Convert remaining days from one rank to another
 */
export function convertRankDays(
  fromRankId: string,
  toRankId: string,
  remainingDays: number
): number {
  const fromPrice = RANK_PRICING[fromRankId.toLowerCase()] || 0.17;
  const toPrice = RANK_PRICING[toRankId.toLowerCase()] || 0.17;
  
  const totalValue = fromPrice * remainingDays;
  return Math.floor(totalValue / toPrice);
}

/**
 * Get rank value info for display
 */
export function getRankValueInfo(rankId: string): {
  pricePerDay: number;
  pricePerMonth: number;
  pricePerYear: number;
} {
  const pricePerDay = RANK_PRICING[rankId.toLowerCase()] || 0.17;
  
  return {
    pricePerDay,
    pricePerMonth: Math.round(pricePerDay * 30 * 100) / 100,
    pricePerYear: Math.round(pricePerDay * 365 * 0.85 * 100) / 100,
  };
}
