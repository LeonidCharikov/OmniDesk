import React, { useState, useEffect, useId, useCallback } from 'react';
import {
  Coins,
  ArrowRightLeft,
  TrendingUp,
  RefreshCw,
  Globe,
  WifiOff,
  Check,
  AlertCircle,
  Clock,
  Edit3,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  FiatRateInfo,
  CryptoRateInfo,
  getSavedRates,
  refreshAllRates,
  setManualCryptoPrice,
  clearManualCryptoOverrides,
} from '../../services/currencyService';
import { loadUserConfig } from '../../services/storage';

interface Props {
  isOffline: boolean;
}

export const CurrencyCryptoTool: React.FC<Props> = ({ isOffline }) => {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState<'fiat' | 'crypto'>('fiat');

  // Load user config for default currency
  const userConfig = loadUserConfig();
  const defaultAppCurrency = userConfig.defaultCurrency || 'CZK';

  // Rates initialized from disk cache
  const initialData = getSavedRates();
  const [fiatRates, setFiatRates] = useState<Record<string, FiatRateInfo>>(initialData.fiat);
  const [cryptoRates, setCryptoRates] = useState<Record<string, CryptoRateInfo>>(initialData.crypto);
  const [lastUpdated, setLastUpdated] = useState<string>(initialData.timestamp);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Fiat converter state
  const [fiatAmount, setFiatAmount] = useState<number>(1000);
  const [fromCurrency, setFromCurrency] = useState<string>('EUR');
  const [toCurrency, setToCurrency] = useState<string>(defaultAppCurrency);

  // Crypto tracker state
  const [selectedCrypto, setSelectedCrypto] = useState<string>('BTC');
  const [cryptoAmount, setCryptoAmount] = useState<number>(1);
  const [targetFiat, setTargetFiat] = useState<string>(defaultAppCurrency);

  // Custom price override modal state
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceInput, setEditPriceInput] = useState<string>('');

  const fiatAmountId = useId();
  const fromCurrencyId = useId();
  const toCurrencyId = useId();
  const cryptoAmountId = useId();
  const targetFiatId = useId();

  // Core fetch function
  const executeRefresh = useCallback(async () => {
    if (isOffline) return;
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const res = await refreshAllRates();
      setFiatRates(res.fiat);
      setCryptoRates(res.crypto);
      if (res.timestamp) setLastUpdated(res.timestamp);
      if (!res.success) {
        setRefreshError('Kurzy načteny z lokální cache. Připojení k burze bylo dočasně nedostupné.');
      }
    } catch {
      setRefreshError('Chyba při komunikaci se serverem směnných kurzů.');
    } finally {
      setIsRefreshing(false);
    }
  }, [isOffline]);

  // Initial fetch on mount & background auto-refresh every 60s
  useEffect(() => {
    if (!isOffline) {
      executeRefresh();
      const interval = setInterval(() => {
        executeRefresh();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isOffline, executeRefresh]);

  // Calculations
  const fromRate = fiatRates[fromCurrency]?.rate || 1;
  const toRate = fiatRates[toCurrency]?.rate || 1;
  const fiatResult = (fiatAmount * fromRate) / toRate;

  const cryptoInfo = cryptoRates[selectedCrypto] || cryptoRates.BTC || {
    name: 'Bitcoin',
    symbol: 'BTC',
    usdPrice: 71500,
    change24h: 0,
  };

  const usdInCzk = fiatRates.USD?.rate || 23.42;
  const cryptoPriceInTargetFiat =
    targetFiat === 'USD'
      ? cryptoInfo.usdPrice
      : targetFiat === 'CZK'
      ? cryptoInfo.czkPrice || cryptoInfo.usdPrice * usdInCzk
      : (cryptoInfo.usdPrice * usdInCzk) / (fiatRates[targetFiat]?.rate || 1);

  const totalPortfolioValue = cryptoAmount * cryptoPriceInTargetFiat;

  const swapFiat = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleOpenEditPrice = () => {
    setEditPriceInput(cryptoInfo.usdPrice.toString());
    setIsEditingPrice(true);
  };

  const handleSaveCustomPrice = () => {
    const parsed = parseFloat(editPriceInput);
    if (!isNaN(parsed) && parsed > 0) {
      const updated = setManualCryptoPrice(selectedCrypto, parsed);
      setCryptoRates(updated);
      setIsEditingPrice(false);
    }
  };

  const handleResetToLive = () => {
    clearManualCryptoOverrides();
    executeRefresh();
    setIsEditingPrice(false);
  };

  const locale =
    language === 'ru'
      ? 'ru-RU'
      : language === 'en'
      ? 'en-US'
      : language === 'de'
      ? 'de-DE'
      : language === 'es'
      ? 'es-ES'
      : 'cs-CZ';

  return (
    <div className="space-y-6">
      {/* Header with Connectivity & Sync Status */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_currency_crypto_title', 'Měnový Konvertor & Živé Kryptoměny')}
            </h2>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                isOffline
                  ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                  : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
              }`}
            >
              {isOffline ? <WifiOff className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {isOffline
                ? t('offline_local_cache', 'Offline lokální cache')
                : t('realtime_live_rates', 'Živá burzovní data (API)')}
            </span>
            {lastUpdated && (
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                Aktualizováno: {lastUpdated}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t(
              'currency_crypto_subtitle',
              'Oficiální devizové kurzy a kryptoměny v reálném čase. Možnost okamžité aktualizace nebo nastavení vlastního kurzu.'
            )}
          </p>
        </div>

        {/* Tab switch & Refresh Button */}
        <div className="flex items-center gap-2">
          {!isOffline && (
            <button
              onClick={executeRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Aktualizovat živé kurzy z burzy"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{isRefreshing ? 'Stahuji...' : 'Aktualizovat kurzy'}</span>
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

      {/* Notice info banner */}
      {isOffline ? (
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              Aplikace běží offline: Využívají se uložené směnné kurzy z disku ({lastUpdated || 'Lokální cache'}).
            </span>
          </div>
          <span className="font-mono text-[10px] text-amber-400/80">
            {t('calc_without_network', 'Plná kalkulace bez sítě')}
          </span>
        </div>
      ) : refreshError ? (
        <div className="p-3 rounded-xl bg-slate-900 border border-amber-800/50 flex items-center gap-2 text-xs text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{refreshError}</span>
        </div>
      ) : null}

      {/* TAB 1: FIAT CONVERTER */}
      {activeTab === 'fiat' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-4">
            {/* From currency input */}
            <div className="space-y-2">
              <label
                htmlFor={fromCurrencyId}
                className="text-xs font-semibold text-slate-400 uppercase tracking-wider block"
              >
                {t('from_currency', 'Z měny')}
              </label>
              <select
                id={fromCurrencyId}
                value={fromCurrency}
                onChange={e => setFromCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {Object.entries(fiatRates).map(([code, c]) => (
                  <option key={code} value={code}>
                    {c.flag} {code} - {c.name}
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
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xl font-mono text-white tabular-nums focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Swap button */}
            <div className="flex justify-center pt-6">
              <button
                onClick={swapFiat}
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors border border-slate-700 shadow-sm"
                title={t('swap_currencies', 'Prohodit měny')}
              >
                <ArrowRightLeft className="w-5 h-5" />
              </button>
            </div>

            {/* To currency input & converted value */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={toCurrencyId}
                  className="text-xs font-semibold text-slate-400 uppercase tracking-wider block"
                >
                  {t('to_currency', 'Do měny')}
                </label>
                {toCurrency === defaultAppCurrency && (
                  <span className="text-[10px] font-mono text-indigo-400 px-1.5 py-0.2 rounded bg-indigo-950/60 border border-indigo-800/50">
                    Výchozí měna
                  </span>
                )}
              </div>
              <select
                id={toCurrencyId}
                value={toCurrency}
                onChange={e => setToCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {Object.entries(fiatRates).map(([code, c]) => (
                  <option key={code} value={code}>
                    {c.flag} {code} - {c.name}
                  </option>
                ))}
              </select>
              <div className="w-full px-4 py-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl text-xl font-mono text-indigo-300 font-bold tabular-nums truncate flex items-center justify-between">
                <span>
                  {fiatResult.toLocaleString(locale, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {toCurrency}
                </span>
                <span className="text-xs font-mono font-normal text-indigo-400/80">
                  1 {fromCurrency} = {(fromRate / toRate).toFixed(4)} {toCurrency}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time rates overview grid */}
          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('exchange_rates_overview', 'Směnné kurzy k CZK')}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Zdroj: Open Exchange Rates & ECB • {lastUpdated || 'Živě'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Object.entries(fiatRates)
                .filter(([k]) => k !== 'CZK')
                .map(([code, c]) => (
                  <div
                    key={code}
                    onClick={() => {
                      setFromCurrency(code);
                      setToCurrency(defaultAppCurrency);
                    }}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>
                        {c.flag} 1 {code}
                      </span>
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

      {/* TAB 2: REAL-TIME CRYPTO TRACKER & PORTFOLIO */}
      {activeTab === 'crypto' && (
        <div className="space-y-6">
          {/* Crypto live tickers cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(cryptoRates).map(([sym, c]) => (
              <div
                key={sym}
                onClick={() => setSelectedCrypto(sym)}
                className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                  selectedCrypto === sym
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold font-mono text-white">{c.symbol}</span>
                    {c.isCustom && (
                      <span className="text-[8px] px-1 rounded bg-amber-500/20 text-amber-300 font-mono">
                        Vlastní
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-mono ${
                      c.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {c.change24h >= 0 ? '+' : ''}
                    {c.change24h}%
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-indigo-300 mt-1 tabular-nums truncate">
                  $
                  {c.usdPrice < 0.01
                    ? c.usdPrice.toFixed(6)
                    : c.usdPrice.toLocaleString(locale, { maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">{c.name}</div>
              </div>
            ))}
          </div>

          {/* Calculator and portfolio value */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {t('crypto_calculator_title', 'Kalkulátor hodnoty kryptoměny')}: {cryptoInfo.name} (
                {cryptoInfo.symbol})
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">
                  Cena: <strong>${cryptoInfo.usdPrice.toLocaleString()} USD</strong>
                  {cryptoInfo.isCustom && ' (Ručně nastaveno)'}
                </span>

                <button
                  onClick={handleOpenEditPrice}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-indigo-300 hover:text-white transition-colors flex items-center gap-1"
                  title="Ručně upravit cenu kryptoměny"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Upravit cenu</span>
                </button>

                {cryptoInfo.isCustom && (
                  <button
                    onClick={handleResetToLive}
                    className="px-2 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800 text-xs text-amber-300 transition-colors flex items-center gap-1"
                    title="Obnovit živý burzovní kurz"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Obnovit live</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Price Editor Inline */}
            {isEditingPrice && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40 flex flex-wrap items-center gap-3 animate-fade-in">
                <span className="text-xs text-slate-300 font-medium">
                  Zadejte vlastní cenu pro {cryptoInfo.name} ({cryptoInfo.symbol}) v USD:
                </span>
                <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-xs">
                  <span className="text-slate-400 font-mono text-sm">$</span>
                  <input
                    type="number"
                    step="any"
                    value={editPriceInput}
                    onChange={e => setEditPriceInput(e.target.value)}
                    placeholder="Např. 71500"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  onClick={handleSaveCustomPrice}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                >
                  Uložit cenu
                </button>
                <button
                  onClick={() => setIsEditingPrice(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
                >
                  Zrušit
                </button>
              </div>
            )}

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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
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
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {Object.entries(fiatRates).map(([code, c]) => (
                    <option key={code} value={code}>
                      {c.flag} {code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-mono text-indigo-400">
                  {t('total_value', 'Celková tržní hodnota')}
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
