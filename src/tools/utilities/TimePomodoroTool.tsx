import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, RotateCcw, Globe, Flame, Coffee } from 'lucide-react';

interface CityTime {
  city: string;
  country: string;
  zone: string;
  flag: string;
}

const CITIES: CityTime[] = [
  { city: 'Praha', country: 'Česká republika', zone: 'Europe/Prague', flag: '🇨🇿' },
  { city: 'Londýn', country: 'Velká Británie', zone: 'Europe/London', flag: '🇬🇧' },
  { city: 'New York', country: 'USA (EST)', zone: 'America/New_York', flag: '🇺🇸' },
  { city: 'San Francisco', country: 'USA (PST)', zone: 'America/Los_Angeles', flag: '🇺🇸' },
  { city: 'Tokio', country: 'Japonsko', zone: 'Asia/Tokyo', flag: '🇯🇵' },
  { city: 'Sydney', country: 'Austrálie', zone: 'Australia/Sydney', flag: '🇦🇺' },
];

export const TimePomodoroTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pomodoro' | 'clock'>('pomodoro');
  const [now, setNow] = useState(new Date());

  // Pomodoro state
  const [timerMode, setTimerMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(0);

  // Live clock tick
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Pomodoro countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      // Play audio beep
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch {
        // audio context blocked or unsupported
      }
      if (timerMode === 'work') {
        setCompletedSessions(c => c + 1);
        setTimerMode('shortBreak');
        setTimeLeft(5 * 60);
      } else {
        setTimerMode('work');
        setTimeLeft(25 * 60);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, timerMode]);

  const setMode = (mode: 'work' | 'shortBreak' | 'longBreak') => {
    setIsRunning(false);
    setTimerMode(mode);
    if (mode === 'work') setTimeLeft(25 * 60);
    else if (mode === 'shortBreak') setTimeLeft(5 * 60);
    else setTimeLeft(15 * 60);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (timerMode === 'work') setTimeLeft(25 * 60);
    else if (timerMode === 'shortBreak') setTimeLeft(5 * 60);
    else setTimeLeft(15 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const formatCityTime = (zone: string) => {
    try {
      return new Intl.DateTimeFormat('cs-CZ', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
    } catch {
      return '--:--:--';
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Časová Pásma & Pomodoro Časovač</h2>
          <p className="text-sm text-slate-400 mt-1">
            Světové hodiny pro globální týmy a produktivní časovač soustředění Pomodoro.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('pomodoro')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'pomodoro' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Pomodoro Focus
          </button>
          <button
            onClick={() => setActiveTab('clock')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'clock' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Světový čas
          </button>
        </div>
      </div>

      {activeTab === 'pomodoro' && (
        <div className="p-8 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col items-center justify-center space-y-6 text-center">
          {/* Mode switch */}
          <div className="flex items-center gap-2 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
            <button
              onClick={() => setMode('work')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                timerMode === 'work' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Práce (25 min)
            </button>
            <button
              onClick={() => setMode('shortBreak')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                timerMode === 'shortBreak' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pauza (5 min)
            </button>
            <button
              onClick={() => setMode('longBreak')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                timerMode === 'longBreak' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dlouhá pauza (15 min)
            </button>
          </div>

          {/* Huge Timer Clock */}
          <div className="text-6xl sm:text-7xl font-mono font-bold text-white tracking-tight tabular-nums">
            {formattedTime}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors shadow-lg ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? 'Pozastavit' : 'Spustit'}</span>
            </button>

            <button
              onClick={resetTimer}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Resetovat časovač"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Dokončeno soustředěných bloků: <strong className="text-white font-mono">{completedSessions}</strong></span>
          </div>
        </div>
      )}

      {activeTab === 'clock' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CITIES.map(c => (
            <div
              key={c.city}
              className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 transition-colors space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.flag}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{c.city}</h3>
                    <span className="text-[10px] text-slate-500 block">{c.country}</span>
                  </div>
                </div>
              </div>
              <div className="text-2xl font-mono font-bold text-indigo-300 tabular-nums">
                {formatCityTime(c.zone)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
