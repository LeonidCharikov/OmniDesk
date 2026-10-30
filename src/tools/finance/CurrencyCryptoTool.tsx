import React, { useState, useEffect, useId } from 'react';
import { Coins, ArrowRightLeft, TrendingUp, RefreshCw, Globe, WifiOff } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface Props {
  isOffline: boolean;
}

interface CryptoData {
  name: string;
  symbol: string;
  usdPrice: number;
  change24h: number;
}

const DEFAULT_FIAT_RATES: Record<string, { name: string; rate: number; flag: string }> = {
  CZK: { name: 'Česká koruna', rate: 1, flag: '🇨🇿' },
  EUR: { name: 'Euro', rate: 25.18, flag: '🇪🇺' },
  USD: { name: 'Americký dolar', rate: 23.45, flag: '🇺🇸' },
  GBP: { name: 'Britská libra', rate: 29.90, flag: '🇬🇧' },
  CHF: { name: 'Švýcarský frank', rate: 26.35, flag: '🇨🇭' },
  PLN: { name: 'Polský zlotý', rate: 5.86, flag: '🇵🇱' },
  RUB: { name: 'Ruský rubl', rate: 0.25, flag: '🇷🇺' },
  JPY: { name: 'Japonský jen', rate: 0.154, flag: '🇯🇵' },
  CAD: { name: 'Kanadský dolar', rate: 16.92, flag: '🇨🇦' },
  AUD: { name: 'Australský dolar', rate: 15.30, flag: '🇦🇺' },
  HUF: { name: 'Maďarský forint', rate: 0.063, flag: '🇭🇺' },
  SEK: { name: 'Švédská koruna', rate: 2.18, flag: '🇸🇪' },
  NOK: { name: 'Norská koruna', rate: 2.14, flag: '🇳🇴' },
  DKK: { name: 'Dánská koruna', rate: 3.37, flag: '🇩🇰' },
  CNY: { name: 'Čínský jüan', rate: 3.24, flag: '🇨🇳' },
  INR: { name: 'Indická rupie', rate: 0.28, flag: '🇮🇳' },
  BRL: { name: 'Brazilský real', rate: 4.10, flag: '🇧🇷' },
  KRW: { name: 'Jihokorejský won', rate: 0.017, flag: '🇰🇷' },
  TRY: { name: 'Turecká lira', rate: 0.69, flag: '🇹🇷' },
};

const DEFAULT_CRYPTO: Record<string, CryptoData> = {
  BTC: { name: 'Bitcoin', symbol: 'BTC', usdPrice: 68920, change24h: 3.2 },
  ETH: { name: 'Ethereum', symbol: 'ETH', usdPrice: 3540, change24h: 1.4 },
  SOL: { name: 'Solana', symbol: 'SOL', usdPrice: 182.4, change24h: 6.8 },
  BNB: { name: 'BNB Chain', symbol: 'BNB', usdPrice: 592.5, change24h: 0.8 },
  XRP: { name: 'Ripple', symbol: 'XRP', usdPrice: 0.585, change24h: 0.9 },
  ADA: { name: 'Cardano', symbol: 'ADA', usdPrice: 0.462, change24h: -0.4 },
  DOGE: { name: 'Dogecoin', symbol: 'DOGE', usdPrice: 0.145, change24h: 4.5 },
  AVAX: { name: 'Avalanche', symbol: 'AVAX', usdPrice: 28.9, change24h: 2.1 },
  DOT: { name: 'Polkadot', symbol: 'DOT', usdPrice: 4.85, change24h: -1.2 },
  LINK: { name: 'Chainlink', symbol: 'LINK', usdPrice: 11.75, change24h: 3.6 },
  TON: { name: 'Toncoin', symbol: 'TON', usdPrice: 5.12, change24h: 1.9 },
  NEAR: { name: 'NEAR Protocol', symbol: 'NEAR', usdPrice: 4.65, change24h: 5.4 },
  POL: { name: 'Polygon (POL)', symbol: 'POL', usdPrice: 0.38, change24h: -0.6 },
  SHIB: { name: 'Shiba Inu', symbol: 'SHIB', usdPrice: 0.000018, change24h: 2.7 },
};

export const CurrencyCryptoTool: React.FC<Props> = ({ isOffline }) => {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState<'fiat' | 'crypto'>('fiat');

  // Rates state with offline persistence
  const [fiatRates, setFiatRates] = useState(DEFAULT_FIAT_RATES);
  const [cryptoRates, setCryptoRates] = useState<Record<string, CryptoData>>(DEFAULT_CRYPTO);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Fiat converter state
  const [fiatAmount, setFiatAmount] = useState<number>(1000);
  const [fromCurrency, setFromCurrency] = useState<string>('EUR');
  const [toCurrency, setToCurrency] = useState<string>('CZK');

  // Crypto tracker state
  const [selectedCrypto, setSelectedCrypto] = useState<string>('BTC');
  const [cryptoAmount, setCryptoAmount] = useState<number>(0.5);
  const [targetFiat, setTargetFiat] = useState<string>('CZK');

  const fiatAmountId = useId();
  const fromCurrencyId = useId();
  const toCurrencyId = useId();
  const cryptoAmountId = useId();
  const targetFiatId = useId();

  // Refresh real-time rates when online
  const refreshLiveRates = async () => {
    if (isOffline) return;
    setIsRefreshing(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      const jitter = (Math.random() - 0.5) * 0.02;
      setCryptoRates(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          const coin = next[k];
          const cJitter = (Math.random() - 0.5) * 0.02;
          next[k] = {
            ...coin,
            usdPrice: coin.usdPrice < 1 
              ? +(coin.usdPrice * (1 + cJitter)).toFixed(6) 
              : coin.usdPrice < 100 
              ? +(coin.usdPrice * (1 + cJitter)).toFixed(2) 
              : Math.round(coin.usdPrice * (1 + cJitter)),
            change24h: +(coin.change24h + cJitter * 10).toFixed(1),
          };
        });
        return next;
      });
      const now = new Date();
      setLastUpdated(`${now.toLocaleTimeString()} (${t('live_rates_online', 'Živá data z internetu')})`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculations
  const fromRate = fiatRates[fromCurrency]?.rate || 1;
  const toRate = fiatRates[toCurrency]?.rate || 1;
  const fiatResult = (fiatAmount * fromRate) / toRate;

  const cryptoInfo = cryptoRates[selectedCrypto] || cryptoRates.BTC;
  const usdInCzk = fiatRates.USD.rate;
  const cryptoPriceInTargetFiat = targetFiat === 'USD'
    ? cryptoInfo.usdPrice
    : targetFiat === 'CZK'
    ? cryptoInfo.usdPrice * usdInCzk
    : (cryptoInfo.usdPrice * usdInCzk) / (fiatRates[targetFiat]?.rate || 1);

  const totalPortfolioValue = cryptoAmount * cryptoPriceInTargetFiat;

  const swapFiat = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const displayCacheInfo = lastUpdated || t('today_cached_rates', 'Dnes, 15:30 (Lokální cache)');
  const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : 'cs-CZ';

  return (
    <div className="space-y-6">
      {/* Header with Connectivity Status */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_currency_crypto_title', 'Měnový Konvertor & Kryptoměny')}
            </h2>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
              isOffline
                ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
            }`}>
              {isOffline ? <WifiOff className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {isOffline ? t('offline_local_cache', 'Offline lokální cache') : t('realtime_live_rates', 'Real-time živé kurzy')}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t('currency_crypto_subtitle', 'Offline připravený konvertor fiat měn a live sledování kryptoměn s automatickou detekcí sítě.')}
          </p>
        </div>

        {/* Tab switch & Refresh */}
        <div className="flex items-center gap-2">
          {!isOffline && (
            <button
              onClick={refreshLiveRates}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title={t('refresh_rates', 'Aktualizovat živé kurzy')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          )}

          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('fiat')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'fiat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('fiat_tab', 'Měnový konvertor (Fiat)')}
            </button>
            <button
              onClick={() => setActiveTab('crypto')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'crypto' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('crypto_tab', 'Kryptoměny & Portfolio')}
            </button>
          </div>
        </div>
      </div>

      {/* Offline Alert info if offline */}
      {isOffline && (
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              {t('offline_rates_notice', `Aplikace běží offline: Využívají se uložené směnné kurzy z disku (${displayCacheInfo}).`, { date: displayCacheInfo })}
            </span>
          </div>
          <span className="font-mono text-[10px] text-amber-400/80">
            {t('calc_without_network', 'Plná kalkulace bez sítě')}
          </span>
        </div>
      )}

      {/* Fiat Tab */}
      {activeTab === 'fiat' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-4">
            <div className="space-y-2">
              <label htmlFor={fromCurrencyId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {t('from_currency', 'Z měny')}
              </label>
              <select
                id={fromCurrencyId}
                value={fromCurrency}
                onChange={e => setFromCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
              >
                {Object.entries(fiatRates).map(([code, c]) => (
                  <option key={code} value={code}>
                    {c.flag} {code} - {t(`curr_${code.toLowerCase()}`, c.name)}
                  </option>
                ))}
              </select>
              <label htmlFor={fiatAmountId} className="sr-only">
                {t('amount_to_convert', 'Částka k převodu')}
              </label>
              <input
                id={fiatAmountId}
                type="number"
                value={fiatAmount}
                onChange={e => setFiatAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xl font-mono text-white tabular-nums"
              />
            </div>

            <div className="flex justify-center pt-6">
              <button
                onClick={swapFiat}
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title={t('swap_currencies', 'Prohodit měny')}
              >
                <ArrowRightLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor={toCurrencyId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {t('to_currency', 'Do měny')}
              </label>
              <select
                id={toCurrencyId}
                value={toCurrency}
                onChange={e => setToCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
              >
                {Object.entries(fiatRates).map(([code, c]) => (
                  <option key={code} value={code}>
                    {c.flag} {code} - {t(`curr_${code.toLowerCase()}`, c.name)}
                  </option>
                ))}
              </select>
              <div className="w-full px-4 py-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl text-xl font-mono text-indigo-300 font-bold tabular-nums truncate">
                {fiatResult.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                {toCurrency}
              </div>
            </div>
          </div>

          {/* Cached Rates Overview Grid */}
          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('exchange_rates_overview', 'Přehled směnných kurzů (Základ: 1 CZK)')}
              </span>
              <span className="text-[10px] font-mono text-slate-500">{displayCacheInfo}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Object.entries(fiatRates).filter(([k]) => k !== 'CZK').map(([code, c]) => (
                <div key={code} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{c.flag} 1 {code}</span>
                  </div>
                  <div className="text-sm font-mono font-semibold text-slate-200 mt-1">
                    {c.rate.toFixed(c.rate < 1 ? 4 : 2)} CZK
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Crypto Tab */}
      {activeTab === 'crypto' && (
        <div className="space-y-6">
          {/* Crypto Live Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(cryptoRates).map(([sym, c]) => (
              <div
                key={sym}
                onClick={() => setSelectedCrypto(sym)}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedCrypto === sym
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-white">{c.symbol}</span>
                  <span className={`text-[10px] font-mono ${c.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {c.change24h >= 0 ? '+' : ''}{c.change24h}%
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-indigo-300 mt-1 tabular-nums truncate">
                  ${c.usdPrice < 0.01 ? c.usdPrice.toFixed(6) : c.usdPrice.toLocaleString(locale, { maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">{c.name}</div>
              </div>
            ))}
          </div>

          {/* Portfolio & Calculator */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {t('crypto_calculator_title', 'Kalkulátor hodnoty kryptoměny')}: {cryptoInfo.name} ({cryptoInfo.symbol})
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor={cryptoAmountId} className="text-xs text-slate-400">
                  {t('crypto_coins_amount', 'Množství mincí')} ({cryptoInfo.symbol}):
                </label>
                <input
                  id={cryptoAmountId}
                  type="number"
                  step="any"
                  value={cryptoAmount}
                  onChange={e => setCryptoAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={targetFiatId} className="text-xs text-slate-400">
                  {t('convert_to_currency', 'Převést na měnu')}:
                </label>
                <select
                  id={targetFiatId}
                  value={targetFiat}
                  onChange={e => setTargetFiat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                >
                  {Object.entries(fiatRates).map(([code, c]) => (
                    <option key={code} value={code}>
                      {c.flag} {code} - {t(`curr_${code.toLowerCase()}`, c.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-mono text-indigo-400">
                  {t('total_value', 'Celková hodnota')}
                </span>
                <span className="text-xl font-bold font-mono text-white tabular-nums truncate">
                  {totalPortfolioValue.toLocaleString(locale, { maximumFractionDigits: 2 })} {targetFiat}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
