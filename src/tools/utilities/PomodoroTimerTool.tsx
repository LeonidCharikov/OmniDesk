import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Flame, Coffee, Timer, Flag, Volume2, Plus, Sparkles, Check } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface LapRecord {
  lapNumber: number;
  timeMs: number;
  diffMs: number;
}

export const PomodoroTimerTool: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'pomodoro' | 'timer' | 'stopwatch'>('pomodoro');

  // --- 1. Pomodoro State ---
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState<number>(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);

  // --- 2. Countdown Timer State ---
  const [timerHours, setTimerHours] = useState<number>(0);
  const [timerMinutes, setTimerMinutes] = useState<number>(10);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRemainingSeconds, setTimerRemainingSeconds] = useState<number>(10 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerTotalDuration, setTimerTotalDuration] = useState<number>(10 * 60);

  // --- 3. Stopwatch State ---
  const [stopwatchTimeMs, setStopwatchTimeMs] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);
  const [laps, setLaps] = useState<LapRecord[]>([]);
  const stopwatchStartRef = useRef<number>(0);
  const stopwatchAccumulatedRef = useRef<number>(0);
  const [copiedLaps, setCopiedLaps] = useState(false);

  // Play audio chime
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // Audio not permitted or supported
    }
  };

  // Pomodoro ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPomodoroRunning && pomodoroTimeLeft > 0) {
      interval = setInterval(() => setPomodoroTimeLeft(p => p - 1), 1000);
    } else if (isPomodoroRunning && pomodoroTimeLeft === 0) {
      setIsPomodoroRunning(false);
      playBeep();
      if (pomodoroMode === 'work') {
        setCompletedSessions(c => c + 1);
        setPomodoroMode('shortBreak');
        setPomodoroTimeLeft(5 * 60);
      } else {
        setPomodoroMode('work');
        setPomodoroTimeLeft(25 * 60);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPomodoroRunning, pomodoroTimeLeft, pomodoroMode]);

  // Countdown timer ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerRemainingSeconds > 0) {
      interval = setInterval(() => setTimerRemainingSeconds(prev => prev - 1), 1000);
    } else if (isTimerRunning && timerRemainingSeconds === 0) {
      setIsTimerRunning(false);
      playBeep();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerRemainingSeconds]);

  // Stopwatch animation frame
  useEffect(() => {
    let animId: number;
    if (isStopwatchRunning) {
      const update = () => {
        setStopwatchTimeMs(Date.now() - stopwatchStartRef.current + stopwatchAccumulatedRef.current);
        animId = requestAnimationFrame(update);
      };
      animId = requestAnimationFrame(update);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isStopwatchRunning]);

  // Pomodoro handlers
  const setPomoMode = (mode: 'work' | 'shortBreak' | 'longBreak') => {
    setIsPomodoroRunning(false);
    setPomodoroMode(mode);
    if (mode === 'work') setPomodoroTimeLeft(25 * 60);
    else if (mode === 'shortBreak') setPomodoroTimeLeft(5 * 60);
    else setPomodoroTimeLeft(15 * 60);
  };

  const resetPomo = () => {
    setIsPomodoroRunning(false);
    if (pomodoroMode === 'work') setPomodoroTimeLeft(25 * 60);
    else if (pomodoroMode === 'shortBreak') setPomodoroTimeLeft(5 * 60);
    else setPomodoroTimeLeft(15 * 60);
  };

  // Timer handlers
  const startTimerWithCustom = () => {
    const totalSec = timerHours * 3600 + timerMinutes * 60 + timerSeconds;
    if (totalSec <= 0) return;
    setTimerTotalDuration(totalSec);
    setTimerRemainingSeconds(totalSec);
    setIsTimerRunning(true);
  };

  const addTimerSeconds = (sec: number) => {
    setTimerRemainingSeconds(prev => {
      const next = prev + sec;
      setTimerTotalDuration(t => Math.max(t, next));
      return next;
    });
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    const totalSec = timerHours * 3600 + timerMinutes * 60 + timerSeconds;
    setTimerRemainingSeconds(totalSec > 0 ? totalSec : 10 * 60);
  };

  // Stopwatch handlers
  const startStopwatch = () => {
    stopwatchStartRef.current = Date.now();
    setIsStopwatchRunning(true);
  };

  const pauseStopwatch = () => {
    setIsStopwatchRunning(false);
    stopwatchAccumulatedRef.current = stopwatchTimeMs;
  };

  const resetStopwatch = () => {
    setIsStopwatchRunning(false);
    stopwatchAccumulatedRef.current = 0;
    setStopwatchTimeMs(0);
    setLaps([]);
  };

  const recordLap = () => {
    const prevLapTime = laps.length > 0 ? laps[0].timeMs : 0;
    const diff = stopwatchTimeMs - prevLapTime;
    const newLap: LapRecord = {
      lapNumber: laps.length + 1,
      timeMs: stopwatchTimeMs,
      diffMs: diff,
    };
    setLaps([newLap, ...laps]);
  };

  const copyLapsToClipboard = () => {
    const lines = laps.map(l => 
      `Kolo ${l.lapNumber}: ${formatMs(l.diffMs)} (Celkem: ${formatMs(l.timeMs)})`
    );
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedLaps(true);
    setTimeout(() => setCopiedLaps(false), 2000);
  };

  // Formatting helpers
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatHoursSeconds = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatMs = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  // Find fastest & slowest lap for styling
  const lapDiffs = laps.map(l => l.diffMs);
  const fastestLapDiff = laps.length > 1 ? Math.min(...lapDiffs) : -1;
  const slowestLapDiff = laps.length > 1 ? Math.max(...lapDiffs) : -1;

  return (
    <div className="space-y-6">
      {/* Tool Header */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {t('pomodoro_timer_title', 'Pomodoro, Časovač & Stopky')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('pomodoro_timer_desc', 'Produktivní technika Pomodoro se zvukovými signály, přesný odpočítávací časovač a stopky s mezičasy.')}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('pomodoro')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'pomodoro' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            {t('tab_pomodoro', 'Pomodoro Focus')}
          </button>
          <button
            onClick={() => setActiveTab('timer')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'timer' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            {t('tab_timer', 'Časovač (Timer)')}
          </button>
          <button
            onClick={() => setActiveTab('stopwatch')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'stopwatch' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            {t('tab_stopwatch', 'Stopky & Mezičasy')}
          </button>
        </div>
      </div>

      {/* 1. Pomodoro Focus View */}
      {activeTab === 'pomodoro' && (
        <div className="p-8 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col items-center justify-center space-y-6 text-center">
          {/* Mode switch */}
          <div className="flex items-center gap-2 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
            <button
              onClick={() => setPomoMode('work')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                pomodoroMode === 'work' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('pomo_work', 'Práce (25 min)')}
            </button>
            <button
              onClick={() => setPomoMode('shortBreak')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                pomodoroMode === 'shortBreak' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('pomo_short_break', 'Krátká pauza (5 min)')}
            </button>
            <button
              onClick={() => setPomoMode('longBreak')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                pomodoroMode === 'longBreak' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('pomo_long_break', 'Dlouhá pauza (15 min)')}
            </button>
          </div>

          {/* Huge Timer Clock */}
          <div className="text-7xl sm:text-8xl font-mono font-bold text-white tracking-tight tabular-nums py-2">
            {formatSeconds(pomodoroTimeLeft)}
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPomodoroRunning(!isPomodoroRunning)}
              className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold transition-colors shadow-lg ${
                isPomodoroRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isPomodoroRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPomodoroRunning ? t('pause', 'Pozastavit') : t('start', 'Spustit')}</span>
            </button>

            <button
              onClick={resetPomo}
              className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={t('reset_timer', 'Resetovat časovač')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>{t('completed_sessions', 'Dokončeno cyklů')}: <strong className="text-white font-mono">{completedSessions}</strong></span>
            </div>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span>{t('audio_alarm_active', 'Zvukový signál aktivní')}</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Custom Countdown Timer View */}
      {activeTab === 'timer' && (
        <div className="space-y-6">
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center space-y-6 text-center">
            {/* Huge Countdown Display */}
            <div className="text-7xl sm:text-8xl font-mono font-bold text-white tracking-tight tabular-nums">
              {formatHoursSeconds(timerRemainingSeconds)}
            </div>

            {/* Quick Add Presets */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => addTimerSeconds(60)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-mono transition-colors"
              >
                +1 min
              </button>
              <button
                onClick={() => addTimerSeconds(300)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-mono transition-colors"
              >
                +5 min
              </button>
              <button
                onClick={() => addTimerSeconds(600)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-mono transition-colors"
              >
                +10 min
              </button>
              <button
                onClick={() => addTimerSeconds(900)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-mono transition-colors"
              >
                +15 min
              </button>
              <button
                onClick={() => addTimerSeconds(1800)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-mono transition-colors"
              >
                +30 min
              </button>
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold transition-colors shadow-lg ${
                  isTimerRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isTimerRunning ? t('pause', 'Pozastavit') : t('start', 'Spustit')}</span>
              </button>

              <button
                onClick={resetTimer}
                className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title={t('reset_timer', 'Resetovat časovač')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Setup new countdown */}
          <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              {t('set_new_countdown', 'Nastavit nový odpočet')}
            </span>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-center">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">{t('hours', 'Hodiny')}</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={timerHours}
                  onChange={e => setTimerHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono text-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">{t('minutes', 'Minuty')}</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timerMinutes}
                  onChange={e => setTimerMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono text-lg text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">{t('seconds', 'Sekundy')}</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={timerSeconds}
                  onChange={e => setTimerSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono text-lg text-white"
                />
              </div>
            </div>
            <div className="text-center pt-2">
              <button
                onClick={startTimerWithCustom}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                {t('apply_and_start', 'Nastavit a spustit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Stopwatch View */}
      {activeTab === 'stopwatch' && (
        <div className="space-y-6">
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center space-y-6 text-center">
            {/* Stopwatch Display */}
            <div className="text-7xl sm:text-8xl font-mono font-bold text-white tracking-tight tabular-nums">
              {formatMs(stopwatchTimeMs)}
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-3">
              {!isStopwatchRunning ? (
                <button
                  onClick={startStopwatch}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg"
                >
                  <Play className="w-4 h-4" />
                  <span>{t('start', 'Spustit')}</span>
                </button>
              ) : (
                <button
                  onClick={pauseStopwatch}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-lg"
                >
                  <Pause className="w-4 h-4" />
                  <span>{t('pause', 'Pozastavit')}</span>
                </button>
              )}

              <button
                onClick={recordLap}
                disabled={!isStopwatchRunning}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-colors"
              >
                <Flag className="w-4 h-4 text-indigo-400" />
                <span>{t('lap', 'Mezičas (Kolo)')}</span>
              </button>

              <button
                onClick={resetStopwatch}
                className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title={t('reset', 'Resetovat')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recorded Laps Table */}
          {laps.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('lap_history', 'Historie kol')} ({laps.length})
                </span>
                <button
                  onClick={copyLapsToClipboard}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {copiedLaps ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Flag className="w-3.5 h-3.5" />}
                  <span>{copiedLaps ? t('copied', 'Zkopírováno') : t('copy_laps', 'Kopírovat kola')}</span>
                </button>
              </div>

              <div className="divide-y divide-slate-800 max-h-64 overflow-y-auto">
                {laps.map(l => {
                  const isFastest = l.diffMs === fastestLapDiff;
                  const isSlowest = l.diffMs === slowestLapDiff;
                  return (
                    <div key={l.lapNumber} className="py-2.5 px-3 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-16">
                          {t('lap', 'Kolo')} #{l.lapNumber}
                        </span>
                        {isFastest && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                            {t('fastest_lap', 'Nejrychlejší')}
                          </span>
                        )}
                        {isSlowest && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/60">
                            {t('slowest_lap', 'Nejpomalejší')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6">
                        <span className={isFastest ? 'text-emerald-400 font-semibold' : isSlowest ? 'text-amber-400' : 'text-slate-300'}>
                          +{formatMs(l.diffMs)}
                        </span>
                        <span className="text-white font-semibold w-24 text-right">
                          {formatMs(l.timeMs)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
