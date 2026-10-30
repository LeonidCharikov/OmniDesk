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
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { WidgetCustomization, DailyTask } from '../../types/tool';
import { getSavedRates, FiatRateInfo, CryptoRateInfo } from '../../services/currencyService';

interface SidebarWidgetsProps {
  widgets: WidgetCustomization;
  onToggleWidget: (widgetId: string) => void;
  onUpdateQuickNote: (text: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (taskText: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenWidgetSettings: () => void;
  isCollapsed?: boolean;
}

// Sample live/cached prices for cryptocurrencies
const CRYPTO_PRICES: Record<string, { price: string; change: string; positive: boolean }> = {
  BTC: { price: '$68,940', change: '+3.2%', positive: true },
  ETH: { price: '$3,485', change: '+2.1%', positive: true },
  SOL: { price: '$182.40', change: '+5.7%', positive: true },
  TON: { price: '$5.62', change: '+1.4%', positive: true },
  BNB: { price: '$598.10', change: '-0.8%', positive: false },
  XRP: { price: '$0.58', change: '-1.2%', positive: false },
  DOGE: { price: '$0.145', change: '+4.3%', positive: true },
  AVAX: { price: '$28.90', change: '+1.8%', positive: true },
};

// Sample fiat exchange rates
const FIAT_RATES: Record<string, { base: string; rate: string }> = {
  CZK: { base: '1 EUR', rate: '25.18 CZK' },
  EUR: { base: '1 USD', rate: '0.92 EUR' },
  USD: { base: '1 EUR', rate: '1.08 USD' },
  RUB: { base: '1 USD', rate: '94.20 RUB' },
  GBP: { base: '1 EUR', rate: '0.86 GBP' },
  CHF: { base: '1 EUR', rate: '0.96 CHF' },
  PLN: { base: '1 EUR', rate: '4.32 PLN' },
  JPY: { base: '1 USD', rate: '154.6 JPY' },
};

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

  // 3. Simple math evaluation
  const sanitized = trimmed.replace(/\^/g, '**');
  if (/^[\d\s+\-*/().%]+$/.test(sanitized)) {
    try {
      const fn = new Function(`return (${sanitized})`);
      const res = fn();
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return Number.isInteger(res) ? res.toString() : res.toFixed(4).replace(/\.?0+$/, '');
      }
    } catch {
      return null;
    }
  }

  return null;
}

export const SidebarWidgets: React.FC<SidebarWidgetsProps> = ({
  widgets,
  onToggleWidget,
  onUpdateQuickNote,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onOpenWidgetSettings,
  isCollapsed,
}) => {
  const { t, language } = useI18n();
  const [now, setNow] = useState(new Date());

  // Mini timer state
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerTotal, setTimerTotal] = useState(25 * 60);

  // Mini system simulation stats
  const [cpuUsage, setCpuUsage] = useState(18);
  const [ramUsage, setRamUsage] = useState(42);

  // Mini Calc state
  const [calcInput, setCalcInput] = useState('25 * 4');
  const [calcCopied, setCalcCopied] = useState(false);

  const [newTaskText, setNewTaskText] = useState('');

  // Live rates for mini widget
  const [ratesData, setRatesData] = useState(() => getSavedRates());

  useEffect(() => {
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

  const targetTimezone = widgets.selectedCity || 'Europe/Prague';
  const cityName = widgets.selectedCityName || 'Praha';

  let timeString = '';
  let dateString = '';
  try {
    timeString = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: targetTimezone,
    }).format(now);

    dateString = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: targetTimezone,
    }).format(now);
  } catch {
    timeString = now.toLocaleTimeString();
    dateString = now.toLocaleDateString();
  }

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

  const cryptoData = CRYPTO_PRICES[widgets.selectedCrypto] || CRYPTO_PRICES['BTC'];
  const fiatData = FIAT_RATES[widgets.selectedFiat] || FIAT_RATES['CZK'];

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

  if (isCollapsed) {
    return null;
  }

  return (
    <div className="px-3 py-2 space-y-2 border-t border-slate-900/80 bg-slate-950/40 max-[767px]:hidden">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {t('sidebar_widgets', 'Mini widgety')}
        </span>
        <button
          onClick={onOpenWidgetSettings}
          className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-900"
          title={t('configure_widgets', 'Nastavit widgety')}
        >
          <Sliders className="w-3 h-3" />
        </button>
      </div>

      {/* 1. Live Clock Widget with Selected City */}
      {showClock && (
        <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span className="text-[11px] font-medium">{dateString}</span>
            </div>
            <span className="text-[10px] font-medium text-indigo-300 truncate max-w-[85px] px-1 py-0.5 rounded bg-indigo-950/40 border border-indigo-800/40">
              {cityName}
            </span>
          </div>
          <div className="text-lg font-mono font-bold text-white tracking-tight tabular-nums">
            {timeString}
          </div>
        </div>
      )}

      {/* 2. Mini Timer / Pomodoro Widget */}
      {showTimer && (
        <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-medium">
              <Flame className="w-3 h-3 text-amber-400" />
              <span className="text-[11px]">{t('quick_timer', 'Rychlý timer')}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => resetTimer(25 * 60)}
                className={`text-[9px] font-mono px-1 py-0.5 rounded transition-colors ${
                  timerTotal === 25 * 60 ? 'bg-indigo-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="25 min Pomodoro"
              >
                25m
              </button>
              <button
                onClick={() => resetTimer(5 * 60)}
                className={`text-[9px] font-mono px-1 py-0.5 rounded transition-colors ${
                  timerTotal === 5 * 60 ? 'bg-indigo-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="5 min pauza"
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
                title={isTimerRunning ? t('pause', 'Pozastavit') : t('start', 'Spustit')}
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
      )}

      {/* 3. Customizable Crypto & Fiat Ticker Widget */}
      {showCrypto && (
        <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-mono font-semibold text-slate-200 flex items-center gap-1">
              {widgets.selectedCrypto}
            </span>
            <span className={`font-mono text-[9px] flex items-center ${cryptoData.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {cryptoData.positive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {cryptoData.change}
            </span>
            <span className="font-mono text-indigo-300 font-semibold">{cryptoData.price}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/40">
            <span className="font-mono text-slate-400 text-[9px]">{fiatData.base}</span>
            <span className="font-mono text-slate-200 font-medium">{fiatData.rate}</span>
          </div>
        </div>
      )}

      {/* 4. Mini Calculator & Unit Converter Widget */}
      {showCalc && (
        <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <Calculator className="w-2.5 h-2.5 text-indigo-400" />
              <span>{t('mini_calc_title', 'Rychlý převodník / kalkulačka')}</span>
            </span>
          </div>
          <input
            type="text"
            value={calcInput}
            onChange={e => setCalcInput(e.target.value)}
            placeholder="např. 50 km to mi, 25 * 4"
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
                title={t('copy_result', 'Kopírovat výsledek')}
              >
                {calcCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. Daily Tasks Checklist Widget */}
      {showTasks && (
        <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <CheckSquare className="w-2.5 h-2.5 text-emerald-400" />
              <span>{t('daily_checklist_title', 'Denní checklist')}</span>
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
                    {task.text}
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
              placeholder={t('add_task_placeholder', '+ Nový úkol...')}
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
      )}

      {/* 6. Mini Scratchpad / Quick Sticky Note */}
      {showNotes && (
        <div className="p-2 rounded-lg bg-amber-950/15 border border-amber-500/20 space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
            <FileEdit className="w-2.5 h-2.5" />
            <span>{t('quick_scratchpad', 'Rychlá poznámka')}</span>
          </div>
          <textarea
            value={widgets.quickNote}
            onChange={e => onUpdateQuickNote(e.target.value)}
            placeholder={t('scratchpad_placeholder', 'Napište rychlou myšlenku...')}
            rows={2}
            className="w-full text-[11px] p-1.5 bg-slate-900/60 border border-amber-500/20 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none font-mono"
          />
        </div>
      )}

      {/* 7. Mini System Monitor Gauge */}
      {showSystem && (
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
      )}
    </div>
  );
};
