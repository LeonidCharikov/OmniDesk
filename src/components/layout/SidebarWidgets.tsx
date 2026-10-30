import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, RotateCcw, TrendingUp, Sliders, ChevronDown, ChevronUp, Check, Flame } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface SidebarWidgetsProps {
  enabledWidgets: string[];
  onToggleWidget: (widgetId: string) => void;
  onOpenWidgetSettings: () => void;
}

export const SidebarWidgets: React.FC<SidebarWidgetsProps> = ({
  enabledWidgets,
  onToggleWidget,
  onOpenWidgetSettings,
}) => {
  const { t, language } = useI18n();
  const [now, setNow] = useState(new Date());

  // Mini timer state
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerTotal, setTimerTotal] = useState(25 * 60);

  // Live clock tick
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
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
        // audio context blocked
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

  const timeString = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  const dateString = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(now);

  const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone.replace('_', ' ');

  const showClock = enabledWidgets.includes('clock');
  const showTimer = enabledWidgets.includes('timer');
  const showCrypto = enabledWidgets.includes('crypto');

  if (!showClock && !showTimer && !showCrypto) {
    return null;
  }

  return (
    <div className="px-3 py-2 space-y-2 border-t border-slate-900/80 bg-slate-950/40">
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

      {/* 1. Live Clock Widget */}
      {showClock && (
        <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span className="text-[11px] font-medium">{dateString}</span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 truncate max-w-[80px]">
              {timezoneName}
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

          {/* Mini progress line */}
          <div className="w-full h-1 rounded-full bg-slate-900 overflow-hidden">
            <div
              style={{ width: `${timerPercent}%` }}
              className="h-full bg-indigo-500 transition-all duration-300"
            />
          </div>
        </div>
      )}

      {/* 3. Mini Crypto & Fiat Ticker Widget */}
      {showCrypto && (
        <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800/60 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-mono font-semibold text-slate-300">BTC</span>
            <span className="text-emerald-400 font-mono text-[9px]">+3.2%</span>
            <span className="font-mono text-indigo-300 font-semibold">$68,920</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-mono font-semibold text-slate-300">EUR</span>
            <span className="text-slate-500 font-mono text-[9px]">CZK</span>
            <span className="font-mono text-slate-200">25.18</span>
          </div>
        </div>
      )}
    </div>
  );
};
