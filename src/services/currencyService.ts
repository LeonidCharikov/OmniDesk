import { useState, useEffect, useCallback } from 'react';
import { loadUserConfig } from './storage';
import { UserConfig } from '../types/tool';

export interface FiatRateInfo {
  name: string;
  rate: number; // 1 unit in CZK
  flag: string;
  isCustom?: boolean;
}

export interface CryptoRateInfo {
  name: string;
  symbol: string;
  usdPrice: number;
  czkPrice?: number;
  change24h: number;
  isCustom?: boolean;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  CZK: 'Kč',
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
  PLN: 'zł',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  HUF: 'Ft',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  RUB: '₽',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
  KRW: '₩',
  TRY: '₺',
};

export const SUPPORTED_FIAT_CURRENCIES: Array<{ code: string; name: string; flag: string; symbol: string }> = [
  { code: 'CZK', name: 'Česká koruna', flag: '🇨🇿', symbol: 'Kč' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', symbol: '€' },
  { code: 'USD', name: 'Americký dolar', flag: '🇺🇸', symbol: '$' },
  { code: 'GBP', name: 'Britská libra', flag: '🇬🇧', symbol: '£' },
  { code: 'CHF', name: 'Švýcarský frank', flag: '🇨🇭', symbol: 'CHF' },
  { code: 'PLN', name: 'Polský zlotý', flag: '🇵🇱', symbol: 'zł' },
  { code: 'JPY', name: 'Japonský jen', flag: '🇯🇵', symbol: '¥' },
  { code: 'CAD', name: 'Kanadský dolar', flag: '🇨🇦', symbol: 'C$' },
  { code: 'AUD', name: 'Australský dolar', flag: '🇦🇺', symbol: 'A$' },
  { code: 'HUF', name: 'Maďarský forint', flag: '🇭🇺', symbol: 'Ft' },
  { code: 'SEK', name: 'Švédská koruna', flag: '🇸🇪', symbol: 'kr' },
  { code: 'NOK', name: 'Norská koruna', flag: '🇳🇴', symbol: 'kr' },
  { code: 'DKK', name: 'Dánská koruna', flag: '🇩🇰', symbol: 'kr' },
  { code: 'RUB', name: 'Ruský rubl', flag: '🇷🇺', symbol: '₽' },
];

export function getCurrencySymbol(code?: string): string {
  if (!code) return 'Kč';
  return CURRENCY_SYMBOLS[code.toUpperCase()] || code.toUpperCase();
}

export function formatCurrency(amount: number, currencyCode: string = 'CZK', locale = 'cs-CZ'): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedNumber = Math.round(amount).toLocaleString(locale);
  return `${formattedNumber} ${symbol}`;
}

export function convertFiat(
  amount: number,
  fromCode: string,
  toCode: string,
  fiatRates: Record<string, FiatRateInfo> = INITIAL_FIAT_RATES
): number {
  if (fromCode === toCode) return amount;
  const fromRateInCzk = fiatRates[fromCode]?.rate || 1;
  const toRateInCzk = fiatRates[toCode]?.rate || 1;
  return (amount * fromRateInCzk) / toRateInCzk;
}

export function convertCryptoToFiat(
  cryptoUsdPrice: number,
  toFiatCode: string,
  fiatRates: Record<string, FiatRateInfo> = INITIAL_FIAT_RATES
): number {
  if (toFiatCode === 'USD') return cryptoUsdPrice;
  const usdRateInCzk = fiatRates['USD']?.rate || 23.42;
  const toRateInCzk = fiatRates[toFiatCode]?.rate || 1;
  return (cryptoUsdPrice * usdRateInCzk) / toRateInCzk;
}

/**
 * Hook providing reactive access to the user-configured default currency.
 */
export function useAppCurrency(initialOverride?: string): [string, (newCurrency: string) => void] {
  const [currency, setCurrency] = useState<string>(() => {
    if (initialOverride) return initialOverride;
    try {
      const config = loadUserConfig();
      return config.defaultCurrency || config.widgets?.selectedFiat || 'CZK';
    } catch {
      return 'CZK';
    }
  });

  useEffect(() => {
    if (initialOverride) {
      setCurrency(initialOverride);
      return;
    }
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<UserConfig>;
      if (customEvent.detail?.defaultCurrency) {
        setCurrency(customEvent.detail.defaultCurrency);
      }
    };
    window.addEventListener('omnidesk-config-updated', handler);
    return () => window.removeEventListener('omnidesk-config-updated', handler);
  }, [initialOverride]);

  const updateCurrency = useCallback((newCurr: string) => {
    setCurrency(newCurr);
  }, []);

  return [currency, updateCurrency];
}

export const INITIAL_FIAT_RATES: Record<string, FiatRateInfo> = {
  CZK: { name: 'Česká koruna', rate: 1, flag: '🇨🇿' },
  EUR: { name: 'Euro', rate: 25.28, flag: '🇪🇺' },
  USD: { name: 'Americký dolar', rate: 23.42, flag: '🇺🇸' },
  GBP: { name: 'Britská libra', rate: 30.15, flag: '🇬🇧' },
  CHF: { name: 'Švýcarský frank', rate: 26.85, flag: '🇨🇭' },
  PLN: { name: 'Polský zlotý', rate: 5.89, flag: '🇵🇱' },
  RUB: { name: 'Ruský rubl', rate: 0.24, flag: '🇷🇺' },
  JPY: { name: 'Japonský jen', rate: 0.153, flag: '🇯🇵' },
  CAD: { name: 'Kanadský dolar', rate: 16.85, flag: '🇨🇦' },
  AUD: { name: 'Australský dolar', rate: 15.35, flag: '🇦🇺' },
  HUF: { name: 'Maďarský forint', rate: 0.062, flag: '🇭🇺' },
  SEK: { name: 'Švédská koruna', rate: 2.19, flag: '🇸🇪' },
  NOK: { name: 'Norská koruna', rate: 2.14, flag: '🇳🇴' },
  DKK: { name: 'Dánská koruna', rate: 3.39, flag: '🇩🇰' },
  CNY: { name: 'Čínský jüan', rate: 3.28, flag: '🇨🇳' },
  INR: { name: 'Indická rupie', rate: 0.28, flag: '🇮🇳' },
  BRL: { name: 'Brazilský real', rate: 4.08, flag: '🇧🇷' },
  KRW: { name: 'Jihokorejský won', rate: 0.017, flag: '🇰🇷' },
  TRY: { name: 'Turecká lira', rate: 0.68, flag: '🇹🇷' },
};

export const INITIAL_CRYPTO_RATES: Record<string, CryptoRateInfo> = {
  BTC: { name: 'Bitcoin', symbol: 'BTC', usdPrice: 71500, change24h: 2.8 },
  ETH: { name: 'Ethereum', symbol: 'ETH', usdPrice: 2620, change24h: 1.6 },
  SOL: { name: 'Solana', symbol: 'SOL', usdPrice: 184, change24h: 4.2 },
  BNB: { name: 'BNB Chain', symbol: 'BNB', usdPrice: 595, change24h: 0.7 },
  XRP: { name: 'Ripple', symbol: 'XRP', usdPrice: 0.525, change24h: -0.8 },
  ADA: { name: 'Cardano', symbol: 'ADA', usdPrice: 0.355, change24h: 1.2 },
  DOGE: { name: 'Dogecoin', symbol: 'DOGE', usdPrice: 0.168, change24h: 5.4 },
  AVAX: { name: 'Avalanche', symbol: 'AVAX', usdPrice: 26.8, change24h: 2.1 },
  DOT: { name: 'Polkadot', symbol: 'DOT', usdPrice: 4.18, change24h: -0.4 },
  LINK: { name: 'Chainlink', symbol: 'LINK', usdPrice: 11.85, change24h: 3.5 },
  TON: { name: 'Toncoin', symbol: 'TON', usdPrice: 5.15, change24h: 1.6 },
  NEAR: { name: 'NEAR Protocol', symbol: 'NEAR', usdPrice: 4.85, change24h: 4.9 },
  SUI: { name: 'Sui Network', symbol: 'SUI', usdPrice: 2.12, change24h: 6.8 },
  SHIB: { name: 'Shiba Inu', symbol: 'SHIB', usdPrice: 0.0000185, change24h: 2.9 },
};

const STORAGE_KEY_FIAT = 'omnidesk_cached_fiat_rates_v2';
const STORAGE_KEY_CRYPTO = 'omnidesk_cached_crypto_rates_v2';
const STORAGE_KEY_TIME = 'omnidesk_rates_timestamp_v2';
const STORAGE_KEY_CUSTOM_CRYPTO = 'omnidesk_custom_crypto_overrides_v2';

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

    // Apply any user custom overrides
    const rawCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_CRYPTO);
    if (rawCustom) {
      const customMap = JSON.parse(rawCustom);
      Object.entries(customMap).forEach(([sym, price]) => {
        if (crypto[sym] && typeof price === 'number') {
          crypto[sym] = {
            ...crypto[sym],
            usdPrice: price,
            isCustom: true,
          };
        }
      });
    }

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
  // 1. Primary: open.er-api.com
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CZK', { signal: AbortSignal.timeout(6000) });
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
              rate: +(1 / rateFromCZK).toFixed(4),
            };
          }
        });
        localStorage.setItem(STORAGE_KEY_FIAT, JSON.stringify(nextFiat));
        return nextFiat;
      }
    }
  } catch {
    // fallback
  }

  // 2. Fallback: Frankfurter API
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
 * Fetch real live crypto rates using multiple high-reliability CORS APIs
 */
export async function fetchLiveCryptoRates(): Promise<Record<string, CryptoRateInfo> | null> {
  const symbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'LINK', 'TON', 'NEAR', 'SUI', 'SHIB'];
  const symbolsParam = symbols.join(',');

  // 1. Primary: CryptoCompare multi-price API (Unrestricted CORS, real-time)
  try {
    const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbolsParam}&tsyms=USD,CZK`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const json = await res.json();
      if (json && json.RAW) {
        const nextCrypto: Record<string, CryptoRateInfo> = { ...INITIAL_CRYPTO_RATES };
        symbols.forEach(sym => {
          if (json.RAW[sym] && json.RAW[sym].USD) {
            const rawUSD = json.RAW[sym].USD;
            const rawCZK = json.RAW[sym].CZK;
            const usdPrice = rawUSD.PRICE;
            const change24h = +(rawUSD.CHANGEPCT24HOUR || 0).toFixed(2);
            const czkPrice = rawCZK?.PRICE;

            if (nextCrypto[sym]) {
              nextCrypto[sym] = {
                ...nextCrypto[sym],
                usdPrice,
                czkPrice,
                change24h,
                isCustom: false,
              };
            }
          }
        });

        // Re-apply any user custom overrides
        applyUserOverrides(nextCrypto);
        localStorage.setItem(STORAGE_KEY_CRYPTO, JSON.stringify(nextCrypto));
        return nextCrypto;
      }
    }
  } catch {
    // fallback
  }

  // 2. Secondary: Binance public spot price ticker
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
      symbols.forEach(sym => {
        const pair = `${sym}USDT`;
        if (tickerMap[pair]) {
          nextCrypto[sym] = {
            ...nextCrypto[sym],
            usdPrice: tickerMap[pair].lastPrice,
            change24h: +tickerMap[pair].change.toFixed(2),
            isCustom: false,
          };
        }
      });

      applyUserOverrides(nextCrypto);
      localStorage.setItem(STORAGE_KEY_CRYPTO, JSON.stringify(nextCrypto));
      return nextCrypto;
    }
  } catch {
    // fallback
  }

  // 3. Tertiary: Coinbase public prices for core assets
  try {
    const coreCoins = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA', 'AVAX', 'LINK', 'DOT', 'NEAR', 'SUI', 'SHIB'];
    const responses = await Promise.allSettled(
      coreCoins.map(sym =>
        fetch(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`, { signal: AbortSignal.timeout(4000) })
          .then(r => r.json())
          .then(data => ({ sym, amount: parseFloat(data.data.amount) }))
      )
    );

    const nextCrypto: Record<string, CryptoRateInfo> = { ...INITIAL_CRYPTO_RATES };
    let gotAtLeastOne = false;

    responses.forEach(result => {
      if (result.status === 'fulfilled' && result.value && result.value.amount > 0) {
        const { sym, amount } = result.value;
        if (nextCrypto[sym]) {
          nextCrypto[sym] = {
            ...nextCrypto[sym],
            usdPrice: amount,
            isCustom: false,
          };
          gotAtLeastOne = true;
        }
      }
    });

    if (gotAtLeastOne) {
      applyUserOverrides(nextCrypto);
      localStorage.setItem(STORAGE_KEY_CRYPTO, JSON.stringify(nextCrypto));
      return nextCrypto;
    }
  } catch {
    // fallback
  }

  return null;
}

function applyUserOverrides(cryptoMap: Record<string, CryptoRateInfo>) {
  try {
    const rawCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_CRYPTO);
    if (rawCustom) {
      const customMap = JSON.parse(rawCustom);
      Object.entries(customMap).forEach(([sym, price]) => {
        if (cryptoMap[sym] && typeof price === 'number') {
          cryptoMap[sym].usdPrice = price;
          cryptoMap[sym].isCustom = true;
        }
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Allows user to manually set or override any crypto price
 */
export function setManualCryptoPrice(symbol: string, newUsdPrice: number): Record<string, CryptoRateInfo> {
  const { crypto, fiat, timestamp } = getSavedRates();
  try {
    const rawCustom = localStorage.getItem(STORAGE_KEY_CUSTOM_CRYPTO);
    const customMap = rawCustom ? JSON.parse(rawCustom) : {};
    customMap[symbol] = newUsdPrice;
    localStorage.setItem(STORAGE_KEY_CUSTOM_CRYPTO, JSON.stringify(customMap));

    if (crypto[symbol]) {
      crypto[symbol] = {
        ...crypto[symbol],
        usdPrice: newUsdPrice,
        isCustom: true,
      };
    }
    localStorage.setItem(STORAGE_KEY_CRYPTO, JSON.stringify(crypto));

    window.dispatchEvent(new CustomEvent('omnidesk-rates-updated', { detail: { fiat, crypto, timestamp } }));
  } catch {
    // ignore
  }
  return crypto;
}

/**
 * Resets any custom overrides to live exchange values
 */
export function clearManualCryptoOverrides() {
  try {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_CRYPTO);
  } catch {
    // ignore
  }
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
    window.dispatchEvent(new CustomEvent('omnidesk-rates-updated', { detail: { fiat, crypto, timestamp } }));
  }

  return { fiat, crypto, timestamp: success ? timestamp : saved.timestamp, success };
}
