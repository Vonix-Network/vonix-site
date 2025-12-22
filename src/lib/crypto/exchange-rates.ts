import { db } from '@/db';
import { cryptoExchangeRates } from '@/db/crypto-schema';
import { eq } from 'drizzle-orm';

/**
 * Exchange Rate Service
 * Fetches and caches cryptocurrency exchange rates
 */

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
  };
}

const COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binancecoin',
};

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export class ExchangeRateService {
  /**
   * Gets the current USD exchange rate for a cryptocurrency
   */
  static async getRate(currency: string): Promise<string> {
    // Check cache first
    const cached = await this.getCachedRate(currency);
    if (cached && this.isCacheValid(cached.lastUpdated)) {
      return cached.usdRate;
    }

    // Fetch fresh rate
    const rate = await this.fetchRate(currency);
    
    // Update cache
    await this.updateCache(currency, rate);
    
    return rate;
  }

  /**
   * Gets cached rate from database
   */
  private static async getCachedRate(currency: string) {
    const [rate] = await db
      .select()
      .from(cryptoExchangeRates)
      .where(eq(cryptoExchangeRates.currency, currency))
      .limit(1);
    
    return rate;
  }

  /**
   * Checks if cached rate is still valid
   */
  private static isCacheValid(lastUpdated: Date): boolean {
    const now = Date.now();
    const cacheTime = new Date(lastUpdated).getTime();
    return (now - cacheTime) < CACHE_DURATION_MS;
  }

  /**
   * Fetches current exchange rate from CoinGecko
   */
  private static async fetchRate(currency: string): Promise<string> {
    const coinId = COIN_IDS[currency];
    if (!coinId) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const data: CoinGeckoResponse = await response.json();
      const rate = data[coinId]?.usd;

      if (!rate) {
        throw new Error(`No rate found for ${currency}`);
      }

      return rate.toString();
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      throw new Error('Failed to fetch exchange rate');
    }
  }

  /**
   * Updates cached rate in database
   */
  private static async updateCache(currency: string, rate: string) {
    const existing = await this.getCachedRate(currency);

    if (existing) {
      await db
        .update(cryptoExchangeRates)
        .set({
          usdRate: rate,
          lastUpdated: new Date(),
        })
        .where(eq(cryptoExchangeRates.currency, currency));
    } else {
      await db.insert(cryptoExchangeRates).values({
        currency,
        usdRate: rate,
        provider: 'coingecko',
      });
    }
  }

  /**
   * Gets rates for multiple currencies
   */
  static async getRates(currencies: string[]): Promise<Record<string, string>> {
    const rates: Record<string, string> = {};
    
    for (const currency of currencies) {
      try {
        rates[currency] = await this.getRate(currency);
      } catch (error) {
        console.error(`Failed to get rate for ${currency}:`, error);
      }
    }
    
    return rates;
  }
}
