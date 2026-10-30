/**
 * Real-time currency & crypto live data service
 * Fetches real Forex rates from open.er-api.com / Frankfurter
 * and real Crypto rates from CoinGecko / Binance / CryptoCompare
 */

export interface FiatRateInfo {
  name: string;
  rate: number; // 1 unit in CZK
  flag: string;
}

export interface CryptoRateInfo {
  name: string;
  symbol: string;
  usdPrice: number;
  czkPrice?: number;
  change24h: number;
}

export const INITIAL_FIAT_RATES: Record<string, FiatRateInfo> = {
  CZK: { name: 'Česká koruna', rate: 1, flag: '🇨🇿' },
  EUR: { name: 'Euro', rate: 25.25, flag: '🇪🇺' },
  USD: { name: 'Americký dolar', rate: 23.65, flag: '🇺🇸' },
  GBP: { name: 'Britská libra', rate: 30.15, flag: '🇬🇧' },
  CHF: { name: 'Švýcarský frank', rate: 26.85, flag: '🇨🇭' },
  PLN: { name: 'Polský zlotý', rate: 5.92, flag: '🇵🇱' },
  RUB: { name: 'Ruský rubl', rate: 0.25, flag: '🇷🇺' },
  JPY: { name: 'Japonský jen', rate: 0.155, flag: '🇯🇵' },
  CAD: { name: 'Kanadský dolar', rate: 17.10, flag: '🇨🇦' },
  AUD: { name: 'Australský dolar', rate: 15.45, flag: '🇦🇺' },
  HUF: { name: 'Maďarský forint', rate: 0.062, flag: '🇭🇺' },
  SEK: { name: 'Švédská koruna', rate: 2.22, flag: '🇸🇪' },
  NOK: { name: 'Norská koruna', rate: 2.16, flag: '🇳🇴' },
  DKK: { name: 'Dánská koruna', rate: 3.38, flag: '🇩🇰' },
  CNY: { name: 'Čínský jüan', rate: 3.28, flag: '🇨🇳' },
  INR: { name: 'Indická rupie', rate: 0.28, flag: '🇮🇳' },
  BRL: { name: 'Brazilský real', rate: 4.15, flag: '🇧🇷' },
  KRW: { name: 'Jihokorejský won', rate: 0.017, flag: '🇰🇷' },
  TRY: { name: 'Turecká lira', rate: 0.69, flag: '🇹🇷' },
};

export const INITIAL_CRYPTO_RATES: Record<string, CryptoRateInfo> = {
  BTC: { name: 'Bitcoin', symbol: 'BTC', usdPrice: 71200, change24h: 3.4 },
  ETH: { name: 'Ethereum', symbol: 'ETH', usdPrice: 2650, change24h: 2.1 },
  SOL: { name: 'Solana', symbol: 'SOL', usdPrice: 185, change24h: 4.8 },
  BNB: { name: 'BNB Chain', symbol: 'BNB', usdPrice: 605, change24h: 0.9 },
  XRP: { name: 'Ripple', symbol: 'XRP', usdPrice: 0.52, change24h: -1.2 },
  ADA: { name: 'Cardano', symbol: 'ADA', usdPrice: 0.36, change24h: 1.1 },
  DOGE: { name: 'Dogecoin', symbol: 'DOGE', usdPrice: 0.165, change24h: 6.2 },
  AVAX: { name: 'Avalanche', symbol: 'AVAX', usdPrice: 27.5, change24h: 2.4 },
  DOT: { name: 'Polkadot', symbol: 'DOT', usdPrice: 4.25, change24h: -0.5 },
  LINK: { name: 'Chainlink', symbol: 'LINK', usdPrice: 11.9, change24h: 3.1 },
  TON: { name: 'Toncoin', symbol: 'TON', usdPrice: 5.2, change24h: 1.8 },
  NEAR: { name: 'NEAR Protocol', symbol: 'NEAR', usdPrice: 4.95, change24h: 5.6 },
  SUI: { name: 'Sui Network', symbol: 'SUI', usdPrice: 2.05, change24h: 7.4 },
  SHIB: { name: 'Shiba Inu', symbol: 'SHIB', usdPrice: 0.000019, change24h: 3.2 },
};

const COINGECKO_MAP: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  binancecoin: 'BNB',
  ripple: 'XRP',
  cardano: 'ADA',
  dogecoin: 'DOGE',
  'avalanche-2': 'AVAX',
  polkadot: 'DOT',
  chainlink: 'LINK',
  'the-open-network': 'TON',
  near: 'NEAR',
  sui: 'SUI',
  'shiba-inu': 'SHIB',
};

const STORAGE_KEY_FIAT = 'omnidesk_cached_fiat_rates_v1';
const STORAGE_KEY_CRYPTO = 'omnidesk_cached_crypto_rates_v1';
const STORAGE_KEY_TIME = 'omnidesk_rates_timestamp_v1';

/**
 * Loads cached rates from localStorage
 */
export function getSavedRates() {
  let fiat = INITIAL_FIAT_RATES;
  let crypto = INITIAL_CRYPTO_RATES;
  let timestamp = '';

  try {
    const rawFiat = localStorage.getItem(STORAGE_KEY_FIAT);
    if (rawFiat) fiat = { ...INITIAL_FIAT_RATES, ...JSON.parse(rawFiat) };

    const rawCrypto = localStorage.getItem(STORAGE_KEY_CRYPTO);
    if (rawCrypto) crypto = { ...INITIAL_CRYPTO_RATES, ...JSON.parse(rawCrypto) };

    timestamp = localStorage.getItem(STORAGE_KEY_TIME) || '';
  } catch {
    // fallback to defaults
  }

  return { fiat, crypto, timestamp };
}

/**
 * Fetch real live fiat rates relative to CZK
 */
export async function fetchLiveFiatRates(): Promise<Record<string, FiatRateInfo> | null> {
  try {
    // 1. Primary: open.er-api.com
    const res = await fetch('https://open.er-api.com/v6/latest/CZK', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const nextFiat: Record<string, FiatRateInfo> = { ...INITIAL_FIAT_RATES };
        Object.keys(nextFiat).forEach(curr => {
          if (curr === 'CZK') {
            nextFiat.CZK.rate = 1;
            return;
          }
          const rateFromCZK = data.rates[curr]; // How many curr in 1 CZK
          if (rateFromCZK && rateFromCZK > 0) {
            nextFiat[curr] = {
              ...nextFiat[curr],
              rate: +(1 / rateFromCZK).toFixed(4), // 1 curr in CZK
            };
          }
        });
        localStorage.setItem(STORAGE_KEY_FIAT, JSON.stringify(nextFiat));
        return nextFiat;
      }
    }
  } catch (err) {
    // try fallback
  }

  // 2. Fallback: Frankfurter API (EUR base)
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && data.rates.CZK) {
        const eurInCzk = data.rates.CZK;
        const nextFiat: Record<string, FiatRateInfo> = { ...INITIAL_FIAT_RATES };
        nextFiat.EUR.rate = +eurInCzk.toFixed(4);
        Object.keys(nextFiat).forEach(curr => {
          if (curr === 'CZK' || curr === 'EUR') return;
          const eurRate = data.rates[curr];
          if (eurRate) {
            // 1 EUR = eurRate curr => 1 curr = (eurInCzk / eurRate) CZK
            nextFiat[curr] = {
              ...nextFiat[curr],
              rate: +(eurInCzk / eurRate).toFixed(4),
            };
          }
        });
        localStorage.setItem(STORAGE_KEY_FIAT, JSON.stringify(nextFiat));
        return nextFiat;
      }
    }
  } catch {
    // ignored
  }

  return null;
}

/**
 * Fetch real live crypto rates from CoinGecko or Binance
 */
export async function fetchLiveCryptoRates(): Promise<Record<string, CryptoRateInfo> | null> {
  const ids = Object.keys(COINGECKO_MAP).join(',');

  // 1. Primary: CoinGecko
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,czk&include_24hr_change=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const nextCrypto: Record<string, CryptoRateInfo> = { ...INITIAL_CRYPTO_RATES };

      Object.entries(COINGECKO_MAP).forEach(([cgId, sym]) => {
        if (data[cgId]) {
          const coinData = data[cgId];
          const usdPrice = coinData.usd;
          const czkPrice = coinData.czk;
          const change24h = coinData.usd_24h_change !== undefined ? +coinData.usd_24h_change.toFixed(2) : 0;

          if (nextCrypto[sym]) {
            nextCrypto[sym] = {
              ...nextCrypto[sym],
              usdPrice,
              czkPrice,
              change24h,
            };
          }
        }
      });

      localStorage.setItem(STORAGE_KEY_CRYPTO, JSON.stringify(nextCrypto));
      return nextCrypto;
    }
  } catch {
    // fallback
  }

  // 2. Fallback: Binance Public 24hr Ticker
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr', { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const list: Array<{ symbol: string; lastPrice: string; priceChangePercent: string }> = await res.json();
      const tickerMap: Record<string, { lastPrice: number; change: number }> = {};
      list.forEach(item => {
        tickerMap[item.symbol] = {
          lastPrice: parseFloat(item.lastPrice),
          change: parseFloat(item.priceChangePercent),
        };
      });

      const nextCrypto: Record<string, CryptoRateInfo> = { ...INITIAL_CRYPTO_RATES };
      Object.keys(nextCrypto).forEach(sym => {
        const pair = `${sym}USDT`;
        if (tickerMap[pair]) {
          nextCrypto[sym] = {
            ...nextCrypto[sym],
            usdPrice: tickerMap[pair].lastPrice,
            change24h: +tickerMap[pair].change.toFixed(2),
          };
        }
      });

      localStorage.setItem(STORAGE_KEY_CRYPTO, JSON.stringify(nextCrypto));
      return nextCrypto;
    }
  } catch {
    // ignored
  }

  return null;
}

/**
 * Refresh both rates and save timestamp
 */
export async function refreshAllRates(): Promise<{
  fiat: Record<string, FiatRateInfo>;
  crypto: Record<string, CryptoRateInfo>;
  timestamp: string;
  success: boolean;
}> {
  const [fiatRes, cryptoRes] = await Promise.all([
    fetchLiveFiatRates().catch(() => null),
    fetchLiveCryptoRates().catch(() => null),
  ]);

  const saved = getSavedRates();
  const fiat = fiatRes || saved.fiat;
  const crypto = cryptoRes || saved.crypto;
  const success = Boolean(fiatRes || cryptoRes);

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (success) {
    localStorage.setItem(STORAGE_KEY_TIME, timestamp);
    // Notify any listeners
    window.dispatchEvent(new CustomEvent('omnidesk-rates-updated', { detail: { fiat, crypto, timestamp } }));
  }

  return { fiat, crypto, timestamp: success ? timestamp : saved.timestamp, success };
}
