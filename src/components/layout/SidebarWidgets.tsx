import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Flame,
  FileEdit,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Calculator,
  Copy,
  Check,
  RefreshCw,
  Coins,
  ChevronDown,
  ChevronUp,
  Layers,
  Rows3,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { WidgetCustomization, DailyTask } from '../../types/tool';
import {
  getSavedRates,
  refreshAllRates,
  formatCurrency,
  getCurrencySymbol,
  convertCryptoToFiat,
  SUPPORTED_FIAT_CURRENCIES,
} from '../../services/currencyService';
import { evaluateSafeMathExpression } from '../../utils/safeMathParser';

interface SidebarWidgetsProps {
  widgets: WidgetCustomization;
  onToggleWidget: (widgetId: string) => void;
  onUpdateQuickNote: (text: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (taskText: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenWidgetSettings: () => void;
  onUpdateWidgetCustomization?: (customization: Partial<WidgetCustomization>) => void;
  defaultCurrency?: string;
  isCollapsed?: boolean;
}

function evaluateMiniCalc(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // 1. Check unit conversions: "50 km to mi", "100 lbs in kg", "25 c to f", "100 eur in czk"
  const convMatch = trimmed.match(/^([\d.]+)\s*([a-z]+)\s*(?:to|in|->)\s*([a-z]+)$/i);
  if (convMatch) {
    const val = parseFloat(convMatch[1]);
    const from = convMatch[2];
    const to = convMatch[3];
    if (isNaN(val)) return null;

    if (from === 'km' && to === 'mi') return `${(val * 0.621371).toFixed(2)} mi`;
    if (from === 'mi' && to === 'km') return `${(val * 1.60934).toFixed(2)} km`;
    if (from === 'm' && to === 'ft') return `${(val * 3.28084).toFixed(2)} ft`;
    if (from === 'ft' && to === 'm') return `${(val * 0.3048).toFixed(2)} m`;
    if (from === 'cm' && to === 'in') return `${(val * 0.393701).toFixed(2)} in`;
    if (from === 'in' && to === 'cm') return `${(val * 2.54).toFixed(2)} cm`;

    if (from === 'kg' && to === 'lbs') return `${(val * 2.20462).toFixed(2)} lbs`;
    if (from === 'lbs' && to === 'kg') return `${(val * 0.453592).toFixed(2)} kg`;
    if (from === 'g' && to === 'oz') return `${(val * 0.035274).toFixed(2)} oz`;
    if (from === 'oz' && to === 'g') return `${(val * 28.3495).toFixed(2)} g`;

    if (from === 'c' && to === 'f') return `${((val * 9) / 5 + 32).toFixed(1)} °F`;
    if (from === 'f' && to === 'c') return `${(((val - 32) * 5) / 9).toFixed(1)} °C`;

    if (from === 'eur' && to === 'czk') return `${(val * 25.18).toFixed(1)} CZK`;
    if (from === 'czk' && to === 'eur') return `${(val / 25.18).toFixed(2)} EUR`;
    if (from === 'usd' && to === 'czk') return `${(val * 23.45).toFixed(1)} CZK`;
    if (from === 'czk' && to === 'usd') return `${(val / 23.45).toFixed(2)} USD`;
    if (from === 'usd' && to === 'rub') return `${(val * 94.2).toFixed(1)} RUB`;
    if (from === 'rub' && to === 'usd') return `${(val / 94.2).toFixed(2)} USD`;
    if (from === 'eur' && to === 'usd') return `${(val * 1.08).toFixed(2)} USD`;
    if (from === 'usd' && to === 'eur') return `${(val * 0.92).toFixed(2)} EUR`;
  }

  // 2. Percentage: "20% of 500"
  const pctMatch = trimmed.match(/^([\d.]+)%\s*(?:of|z)\s*([\d.]+)$/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const total = parseFloat(pctMatch[2]);
    if (!isNaN(pct) && !isNaN(total)) {
      return `${((pct / 100) * total).toLocaleString()}`;
    }
  }

  // 3. Simple math evaluation (deterministic parser, no eval / new Function)
  if (/^[\d\s+\-*/().%^a-zA-Z]+$/.test(trimmed)) {
    try {
      const res = evaluateSafeMathExpression(trimmed);
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return Number.isInteger(res) ? res.toString() : res.toFixed(4).replace(/\.?0+$/, '');
      }
    } catch {
      return null;
    }
  }

  return null;
}

const CITY_NAMES_LOCALE: Record<string, Record<string, string>> = {
  'Europe/Prague': {
    en: 'Prague',
    cs: 'Praha',
    ru: 'Прага',
    de: 'Prag',
    es: 'Praga',
  },
  'Europe/London': {
    en: 'London',
    cs: 'Londýn',
    ru: 'Лондон',
    de: 'London',
    es: 'Londres',
  },
  'America/New_York': {
    en: 'New York',
    cs: 'New York',
    ru: 'Нью-Йорк',
    de: 'New York',
    es: 'Nueva York',
  },
  'Asia/Tokyo': {
    en: 'Tokyo',
    cs: 'Tokio',
    ru: 'Токио',
    de: 'Tokio',
    es: 'Tokio',
  },
  'Australia/Sydney': {
    en: 'Sydney',
    cs: 'Sydney',
    ru: 'Сидней',
    de: 'Sydney',
    es: 'Sídney',
  },
  'Asia/Dubai': {
    en: 'Dubai',
    cs: 'Dubaj',
    ru: 'Дубай',
    de: 'Dubai',
    es: 'Dubái',
  },
  'Europe/Moscow': {
    en: 'Moscow',
    cs: 'Moskva',
    ru: 'Москва',
    de: 'Moskau',
    es: 'Moscú',
  },
  'Asia/Singapore': {
    en: 'Singapore',
    cs: 'Singapur',
    ru: 'Сингапур',
    de: 'Singapur',
    es: 'Singapur',
  },
  'America/Los_Angeles': {
    en: 'Los Angeles',
    cs: 'Los Angeles',
    ru: 'Лос-Анджелес',
    de: 'Los Angeles',
    es: 'Los Ángeles',
  },
  'Europe/Paris': {
    en: 'Paris',
    cs: 'Paříž',
    ru: 'Париж',
    de: 'Paris',
    es: 'París',
  },
  'Europe/Berlin': {
    en: 'Berlin',
    cs: 'Berlín',
    ru: 'Берлин',
    de: 'Berlin',
    es: 'Berlín',
  },
};

export const AVAILABLE_CRYPTOS = [
  { code: 'BTC', name: 'Bitcoin' },
  { code: 'ETH', name: 'Ethereum' },
  { code: 'SOL', name: 'Solana' },
  { code: 'TON', name: 'Toncoin' },
  { code: 'BNB', name: 'BNB Chain' },
  { code: 'XRP', name: 'Ripple' },
  { code: 'DOGE', name: 'Dogecoin' },
  { code: 'AVAX', name: 'Avalanche' },
  { code: 'ADA', name: 'Cardano' },
  { code: 'LINK', name: 'Chainlink' },
  { code: 'DOT', name: 'Polkadot' },
  { code: 'NEAR', name: 'NEAR' },
  { code: 'SUI', name: 'Sui Network' },
  { code: 'SHIB', name: 'Shiba Inu' },
];

export const SidebarWidgets: React.FC<SidebarWidgetsProps> = ({
  widgets,
  onToggleWidget,
  onUpdateQuickNote,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onOpenWidgetSettings,
  onUpdateWidgetCustomization,
  defaultCurrency = 'CZK',
  isCollapsed,
}) => {
  const { t, language } = useI18n();
  const [now, setNow] = useState(new Date());

  // Active selected crypto and fiat currency
  const activeCrypto = widgets.selectedCrypto || 'BTC';
  const activeFiat = widgets.selectedFiat || defaultCurrency || 'CZK';
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  const handleSelectCrypto = (cryptoCode: string) => {
    if (onUpdateWidgetCustomization) {
      onUpdateWidgetCustomization({
        selectedCrypto: cryptoCode,
        selectedCryptos: [cryptoCode, ...(widgets.selectedCryptos?.filter(c => c !== cryptoCode) || [])].slice(0, 3),
      });
    }
  };

  const handleSelectFiat = (fiatCode: string) => {
    if (onUpdateWidgetCustomization) {
      onUpdateWidgetCustomization({
        selectedFiat: fiatCode,
        selectedFiats: [fiatCode, ...(widgets.selectedFiats?.filter(f => f !== fiatCode) || [])].slice(0, 3),
      });
    }
  };

  const handleManualRefreshRates = async () => {
    setIsRefreshingRates(true);
    try {
      await refreshAllRates();
    } finally {
      setTimeout(() => setIsRefreshingRates(false), 500);
    }
  };

  // Mini timer state
  const [timerSecondsLeft, setTimerSecondsLeft] = useState((widgets.timerDurationMinutes || 25) * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerTotal, setTimerTotal] = useState((widgets.timerDurationMinutes || 25) * 60);

  // Mini system simulation stats
  const [cpuUsage, setCpuUsage] = useState(18);
  const ramUsage = 42;

  // Mini Calc state
  const [calcInput, setCalcInput] = useState('25 * 4');
  const [calcCopied, setCalcCopied] = useState(false);

  const [newTaskText, setNewTaskText] = useState('');

  // Adaptive compact mode & collapsibility for smaller screens
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerHeight < 880 || window.innerWidth < 1024 : false
  );
  const [widgetLayoutPref, setWidgetLayoutPref] = useState<'auto' | 'compact' | 'stacked'>('auto');
  const [isWidgetsExpanded, setIsWidgetsExpanded] = useState<boolean>(true);
  const [activeCompactTab, setActiveCompactTab] = useState<string>(
    () => (widgets.enabledWidgets && widgets.enabledWidgets[0]) || 'clock'
  );

  useEffect(() => {
    const checkViewport = () => {
      setIsCompactViewport(window.innerHeight < 880 || window.innerWidth < 1024);
    };
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    const enabledList = widgets.enabledWidgets || [];
    if (enabledList.length > 0 && !enabledList.includes(activeCompactTab)) {
      setActiveCompactTab(enabledList[0]);
    }
  }, [widgets.enabledWidgets, activeCompactTab]);

  // Live rates for mini widget
  const [ratesData, setRatesData] = useState(() => getSavedRates());

  useEffect(() => {
    // Refresh live market rates on startup
    refreshAllRates().catch(() => {});

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setRatesData(prev => ({
          ...prev,
          fiat: customEvent.detail.fiat || prev.fiat,
          crypto: customEvent.detail.crypto || prev.crypto,
          timestamp: customEvent.detail.timestamp || prev.timestamp,
        }));
      }
    };
    window.addEventListener('omnidesk-rates-updated', handleUpdate);
    return () => window.removeEventListener('omnidesk-rates-updated', handleUpdate);
  }, []);

  // Live clock tick
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // System load jitter
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(prev => Math.min(95, Math.max(8, prev + Math.floor(Math.random() * 9) - 4)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Mini timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => setTimerSecondsLeft(p => p - 1), 1000);
    } else if (isTimerRunning && timerSecondsLeft === 0) {
      setIsTimerRunning(false);
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch {
        // blocked
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSecondsLeft]);

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = (totalSeconds: number = 25 * 60) => {
    setIsTimerRunning(false);
    setTimerTotal(totalSeconds);
    setTimerSecondsLeft(totalSeconds);
  };

  const timerMin = Math.floor(timerSecondsLeft / 60);
  const timerSec = timerSecondsLeft % 60;
  const formattedTimer = `${timerMin.toString().padStart(2, '0')}:${timerSec.toString().padStart(2, '0')}`;
  const timerPercent = timerTotal > 0 ? ((timerTotal - timerSecondsLeft) / timerTotal) * 100 : 0;

  const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : 'cs-CZ';

  const selectedCityKeys = (widgets.selectedCities?.length ? widgets.selectedCities : [widgets.selectedCity || 'Europe/Prague']).slice(0, 3);
  const customTimerSeconds = Math.min(180, Math.max(1, widgets.timerDurationMinutes || 25)) * 60;

  const enabled = widgets.enabledWidgets || [];
  const showClock = enabled.includes('clock');
  const showTimer = enabled.includes('timer');
  const showCrypto = enabled.includes('crypto');
  const showNotes = enabled.includes('notes');
  const showSystem = enabled.includes('system');
  const showTasks = enabled.includes('tasks');
  const showCalc = enabled.includes('calc');

  if (!showClock && !showTimer && !showCrypto && !showNotes && !showSystem && !showTasks && !showCalc) {
    return null;
  }

  // Live crypto computation for active selected crypto in user's selected fiat currency
  const currentCryptoItem = ratesData.crypto[activeCrypto] || ratesData.crypto['BTC'] || {
    name: 'Bitcoin',
    symbol: 'BTC',
    usdPrice: 71500,
    change24h: 2.8,
  };

  const cryptoPriceInActiveFiat = convertCryptoToFiat(currentCryptoItem.usdPrice, activeFiat, ratesData.fiat);
  const formattedCryptoPrice = formatCurrency(cryptoPriceInActiveFiat, activeFiat);

  // Compute foreign exchange rates relative to activeFiat
  const activeFiatRateInCzk = ratesData.fiat[activeFiat]?.rate || 1;
  const activeFiatSymbol = getCurrencySymbol(activeFiat);

  const referenceCandidates = ['EUR', 'USD', 'CZK', 'GBP', 'CHF', 'PLN'];
  const refCurrencies = referenceCandidates.filter(c => c !== activeFiat).slice(0, 3);

  const fxRates = refCurrencies.map(refCode => {
    const refRateInCzk = ratesData.fiat[refCode]?.rate || 1;
    const rateVal = refRateInCzk / activeFiatRateInCzk;
    const isSmall = rateVal < 0.05;
    const baseUnits = isSmall ? 100 : 1;
    const effectiveRate = isSmall ? rateVal * 100 : rateVal;

    let formattedVal = '';
    if (effectiveRate >= 100) {
      formattedVal = effectiveRate.toFixed(1);
    } else if (effectiveRate >= 1) {
      formattedVal = effectiveRate.toFixed(2);
    } else {
      formattedVal = effectiveRate.toFixed(4);
    }

    return {
      pair: `${baseUnits} ${refCode}`,
      value: `${formattedVal} ${activeFiatSymbol}`,
    };
  });

  const calcResult = evaluateMiniCalc(calcInput);

  const handleCopyCalcResult = () => {
    if (!calcResult) return;
    navigator.clipboard.writeText(calcResult);
    setCalcCopied(true);
    setTimeout(() => setCalcCopied(false), 2000);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    onAddTask(newTaskText.trim());
    setNewTaskText('');
  };

  const dailyTasks = widgets.dailyTasks || [];
  const completedTasksCount = dailyTasks.filter(t => t.done).length;

  const getTaskLabel = (task: DailyTask) => {
    if (task.id === '1' && (task.text === 'Zkontrolovat denní úkoly' || task.text === 'Check daily tasks' || task.text === 'Проверить задачи на день')) {
      return t('default_task_1', 'Check daily tasks');
    }
    if (task.id === '2' && (task.text === 'Kalkulace a převod měn' || task.text === 'Calculations & currency conversion' || task.text === 'Расчеты и конвертация валют')) {
      return t('default_task_2', 'Calculations & currency conversion');
    }
    if (task.id === '3' && (task.text === 'Pomodoro blok soustředění' || task.text === 'Pomodoro focus block' || task.text === 'Блок концентрации Помодоро')) {
      return t('default_task_3', 'Pomodoro focus block');
    }
    return task.text;
  };

  const cityCards = selectedCityKeys.map(timezone => {
    const city = CITY_NAMES_LOCALE[timezone]?.[language] || timezone;
    const clockTime = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: timezone }).format(now);
    const clockDate = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: timezone }).format(now);
    return { city, clockTime, clockDate };
  });

  if (isCollapsed) {
    return null;
  }

  const compactTabs = [
    { id: 'clock', show: showClock, icon: Clock, title: t('widget_clock', 'Clock') },
    { id: 'timer', show: showTimer, icon: Flame, title: t('quick_timer', 'Quick Timer') },
    { id: 'crypto', show: showCrypto, icon: Coins, title: t('widget_crypto_title', 'Crypto & Rates') },
    { id: 'calc', show: showCalc, icon: Calculator, title: t('mini_calc_title', 'Quick Calculator') },
    { id: 'tasks', show: showTasks, icon: CheckSquare, title: t('daily_checklist_title', 'Daily Checklist') },
    { id: 'notes', show: showNotes, icon: FileEdit, title: t('quick_scratchpad', 'Quick Note') },
    { id: 'system', show: showSystem, icon: Cpu, title: t('widget_system_gauge', 'System Gauge') },
  ].filter(item => item.show);

  const isCompactView =
    widgetLayoutPref === 'compact' || (widgetLayoutPref === 'auto' && isCompactViewport);

  const renderClock = showClock && (!isCompactView || activeCompactTab === 'clock') && cityCards.map(card => (
    <div key={card.city} className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <Clock className="w-3 h-3 text-indigo-400" />
          <span className="text-[11px] font-medium">{card.clockDate}</span>
        </div>
        <span className="text-[10px] font-medium text-indigo-300 truncate max-w-[85px] px-1 py-0.5 rounded bg-indigo-950/40 border border-indigo-800/40">
          {card.city}
        </span>
      </div>
      <div className="text-lg font-mono font-bold text-white tracking-tight tabular-nums">
        {card.clockTime}
      </div>
    </div>
  ));

  const renderTimer = showTimer && (!isCompactView || activeCompactTab === 'timer') && (
    <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-medium">
          <Flame className="w-3 h-3 text-amber-400" />
          <span className="text-[11px]">{t('quick_timer', 'Quick Timer')}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => resetTimer(customTimerSeconds)}
            className={`text-[9px] font-mono px-1 py-0.5 rounded transition-colors ${
              timerTotal === customTimerSeconds ? 'bg-indigo-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title={t('pomodoro_25_min', '25 min Pomodoro')}
          >
            {Math.round(customTimerSeconds / 60)}m
          </button>
          <button
            onClick={() => resetTimer(5 * 60)}
            className={`text-[9px] font-mono px-1 py-0.5 rounded transition-colors ${
              timerTotal === 5 * 60 ? 'bg-indigo-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title={t('break_5_min', '5 min break')}
          >
            5m
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-base font-mono font-bold text-white tabular-nums">
          {formattedTimer}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTimer}
            className={`p-1 rounded-md text-xs transition-colors ${
              isTimerRunning
                ? 'bg-amber-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
            title={isTimerRunning ? t('pause', 'Pause') : t('start', 'Start')}
          >
            {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            onClick={() => resetTimer(timerTotal)}
            className="p-1 rounded-md bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title={t('reset', 'Reset')}
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="w-full h-1 rounded-full bg-slate-900 overflow-hidden">
        <div
          style={{ width: `${timerPercent}%` }}
          className="h-full bg-indigo-500 transition-all duration-300"
        />
      </div>
    </div>
  );

  const renderCrypto = showCrypto && (!isCompactView || activeCompactTab === 'crypto') && (
    <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-2">
      <div className="flex items-center justify-between gap-1.5 text-[10px]">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300 min-w-0">
          <Coins className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate" title={t('widget_crypto_title', 'Crypto & Rates')}>
            {t('widget_crypto_title', 'Crypto & Rates')}
          </span>
        </div>
        <button
          onClick={handleManualRefreshRates}
          disabled={isRefreshingRates}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
          title={t('refresh_rates', 'Refresh rates')}
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshingRates ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="min-w-0">
          <select
            value={activeCrypto}
            onChange={e => handleSelectCrypto(e.target.value)}
            className="w-full bg-slate-950/90 border border-slate-700/80 rounded px-2 py-1 text-[10px] font-mono text-emerald-300 font-semibold focus:outline-none cursor-pointer hover:border-slate-600 transition-colors truncate"
            title={t('selected_crypto', 'Select cryptocurrency')}
          >
            {AVAILABLE_CRYPTOS.map(c => (
              <option key={c.code} value={c.code} className="bg-slate-900 text-slate-200">
                {c.code}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <select
            value={activeFiat}
            onChange={e => handleSelectFiat(e.target.value)}
            className="w-full bg-slate-950/90 border border-slate-700/80 rounded px-2 py-1 text-[10px] font-mono text-indigo-300 font-semibold focus:outline-none cursor-pointer hover:border-slate-600 transition-colors truncate"
            title={t('selected_fiat', 'Select currency')}
          >
            {SUPPORTED_FIAT_CURRENCIES.map(f => (
              <option key={f.code} value={f.code} className="bg-slate-900 text-slate-200">
                {f.code} ({f.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80 space-y-0.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-mono font-bold text-white flex items-center gap-1">
            {currentCryptoItem.symbol}
            <span className="text-[9px] font-normal text-slate-400">({currentCryptoItem.name})</span>
          </span>
          <span className={`font-mono text-[10px] font-medium flex items-center ${currentCryptoItem.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {currentCryptoItem.change24h >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
            {currentCryptoItem.change24h >= 0 ? `+${currentCryptoItem.change24h}%` : `${currentCryptoItem.change24h}%`}
          </span>
        </div>
        <div className="text-sm font-mono font-bold text-emerald-300 tracking-tight">
          {formattedCryptoPrice}
        </div>
      </div>

      <div className="pt-1.5 border-t border-slate-800/60 space-y-1">
        <div className="flex items-center justify-between text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
          <span>{t('exchange_rates_in', 'Rates')} ({activeFiat}):</span>
          <span className="text-[9px] font-normal text-slate-400">{ratesData.timestamp || 'Live'}</span>
        </div>
        <div className="space-y-0.5">
          {fxRates.map(fx => (
            <div key={fx.pair} className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">{fx.pair} =</span>
              <span className="text-slate-200 font-semibold">{fx.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCalc = showCalc && (!isCompactView || activeCompactTab === 'calc') && (
    <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-300 font-medium">
          <Calculator className="w-2.5 h-2.5 text-indigo-400" />
          <span>{t('mini_calc_title', 'Quick Converter / Calculator')}</span>
        </span>
      </div>
      <input
        type="text"
        value={calcInput}
        onChange={e => setCalcInput(e.target.value)}
        placeholder={t('mini_calc_placeholder', 'e.g. 50 km to mi, 25 * 4')}
        className="w-full text-xs font-mono px-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
      />
      {calcResult && (
        <div className="flex items-center justify-between px-2 py-1 bg-indigo-950/30 border border-indigo-500/20 rounded text-[11px] font-mono">
          <span className="text-indigo-200 font-semibold truncate max-w-[130px]">
            = {calcResult}
          </span>
          <button
            onClick={handleCopyCalcResult}
            className="text-slate-400 hover:text-white transition-colors"
            title={t('copy_result', 'Copy result')}
          >
            {calcCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      )}
    </div>
  );

  const renderTasks = showTasks && (!isCompactView || activeCompactTab === 'tasks') && (
    <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-slate-300 font-medium">
          <CheckSquare className="w-2.5 h-2.5 text-emerald-400" />
          <span>{t('daily_checklist_title', 'Daily Checklist')}</span>
        </span>
        <span className="text-[9px] font-mono text-slate-500">
          {completedTasksCount}/{dailyTasks.length}
        </span>
      </div>

      <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
        {dailyTasks.map(task => (
          <div
            key={task.id}
            className="flex items-center justify-between group text-[11px] text-slate-300 py-0.5"
          >
            <div
              onClick={() => onToggleTask(task.id)}
              className="flex items-center gap-1.5 cursor-pointer truncate flex-1"
            >
              {task.done ? (
                <CheckSquare className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <Square className="w-3 h-3 text-slate-500 shrink-0" />
              )}
              <span className={`truncate ${task.done ? 'line-through text-slate-500' : ''}`}>
                {getTaskLabel(task)}
              </span>
            </div>
            <button
              onClick={() => onDeleteTask(task.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-0.5"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleCreateTask} className="flex items-center gap-1 pt-1 border-t border-slate-800/40">
        <input
          type="text"
          value={newTaskText}
          onChange={e => setNewTaskText(e.target.value)}
          placeholder={t('add_task_placeholder', '+ New task...')}
          className="flex-1 text-[10px] px-1.5 py-0.5 bg-slate-950/80 border border-slate-800 rounded text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px]"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </form>
    </div>
  );

  const renderNotes = showNotes && (!isCompactView || activeCompactTab === 'notes') && (
    <div className="p-2 rounded-lg bg-amber-950/15 border border-amber-500/20 space-y-1">
      <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
        <FileEdit className="w-2.5 h-2.5" />
        <span>{t('quick_scratchpad', 'Quick Note')}</span>
      </div>
      <textarea
        value={widgets.quickNote}
        onChange={e => onUpdateQuickNote(e.target.value)}
        placeholder={t('scratchpad_placeholder', 'Write a quick thought...')}
        rows={2}
        className="w-full text-[11px] p-1.5 bg-slate-900/60 border border-amber-500/20 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none font-mono"
      />
    </div>
  );

  const renderSystem = showSystem && (!isCompactView || activeCompactTab === 'system') && (
    <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-300">
          <Cpu className="w-2.5 h-2.5 text-cyan-400" /> CPU
        </span>
        <span className="font-mono text-cyan-300">{cpuUsage}%</span>
      </div>
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-cyan-500 transition-all duration-500"
          style={{ width: `${cpuUsage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
        <span className="flex items-center gap-1 text-slate-300">
          <Activity className="w-2.5 h-2.5 text-purple-400" /> RAM
        </span>
        <span className="font-mono text-purple-300">{ramUsage}%</span>
      </div>
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 transition-all duration-500"
          style={{ width: `${ramUsage}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="pt-2 border-t border-slate-900/80 space-y-2">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setIsWidgetsExpanded(prev => !prev)}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
        >
          {isWidgetsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          <span>{t('sidebar_widgets', 'Mini Widgets')}</span>
          <span className="text-[9px] font-mono px-1 rounded bg-slate-900 text-slate-400 border border-slate-800">
            {compactTabs.length}
          </span>
        </button>

        <div className="flex items-center gap-0.5">
          {isWidgetsExpanded && (
            <button
              type="button"
              onClick={() => setWidgetLayoutPref(prev => (prev === 'compact' || (prev === 'auto' && isCompactViewport) ? 'stacked' : 'compact'))}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-900"
              title={isCompactView ? t('widgets_expand_all', 'Show all widgets stacked') : t('widgets_compact_mode', 'Compact tabbed mode')}
            >
              {isCompactView ? <Rows3 className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenWidgetSettings}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-900"
            title={t('configure_widgets', 'Configure Widgets')}
          >
            <Sliders className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isWidgetsExpanded && (
        <div className="space-y-2">
          {isCompactView && compactTabs.length > 1 && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/60 border border-slate-800/80 overflow-x-auto">
              {compactTabs.map(tab => {
                const Icon = tab.icon;
                const active = activeCompactTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCompactTab(tab.id)}
                    title={tab.title}
                    className={`flex-1 min-w-[26px] py-1 rounded flex items-center justify-center transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                  </button>
                );
              })}
            </div>
          )}

          {renderClock}
          {renderTimer}
          {renderCrypto}
          {renderCalc}
          {renderTasks}
          {renderNotes}
          {renderSystem}
        </div>
      )}
    </div>
  );
};
