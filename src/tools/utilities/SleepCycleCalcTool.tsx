import React, { useState, useMemo } from 'react';
import { Moon, Sun, Coffee } from 'lucide-react';
import { useI18n } from '../../i18n/context';

function parseHHMM(val: string): number {
  const [h, m] = val.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 7 * 60;
  return h * 60 + m;
}

function formatMinutesAsHHMM(totalMin: number): string {
  const normalized = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const SleepCycleCalcTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'wake' | 'sleep'>('wake');
  const [timeInput, setTimeInput] = useState('07:00');
  const [latencyMin, setLatencyMin] = useState('15');

  const cycles = useMemo(() => {
    const baseMin = parseHHMM(timeInput);
    const lat = Math.max(0, Math.min(90, Number(latencyMin) || 0));
    const list = [6, 5, 4, 3];

    return list.map(count => {
      const sleepDurationMin = count * 90;
      const targetMin =
        mode === 'wake'
          ? baseMin - sleepDurationMin - lat
          : baseMin + lat + sleepDurationMin;
      return {
        cycles: count,
        hours: (sleepDurationMin / 60).toFixed(1),
        time: formatMinutesAsHHMM(targetMin),
        quality: count >= 5 ? 'optimal' : count === 4 ? 'good' : 'short',
      };
    });
  }, [mode, timeInput, latencyMin]);

  const setSleepNow = () => {
    const now = new Date();
    setMode('sleep');
    setTimeInput(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Moon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('sc_title', 'Sleep Cycle & Nap Calculator')}</h2>
              <p className="text-xs text-slate-400">
                {t('sc_subtitle', 'Find optimal bedtimes or wake-up times based on 90-minute sleep cycles.')}
              </p>
            </div>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setMode('wake')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                mode === 'wake' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{t('sc_mode_wake', 'I want to wake up at')}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('sleep')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                mode === 'sleep' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{t('sc_mode_sleep', 'I go to bed at')}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {mode === 'wake' ? t('sc_wake_time', 'Wake-up Time') : t('sc_bed_time', 'Bedtime')}
            </label>
            <input
              type="time"
              value={timeInput}
              onChange={e => setTimeInput(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('sc_latency', 'Time to fall asleep (min)')}
            </label>
            <input
              type="number"
              min="0"
              max="90"
              value={latencyMin}
              onChange={e => setLatencyMin(e.target.value)}
              className="w-28 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
            />
          </div>
          <button
            type="button"
            onClick={setSleepNow}
            className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-300 hover:text-white hover:border-indigo-500/40 transition-colors"
          >
            {t('sc_sleep_now', 'Use Current Time (Sleep Now)')}
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300">
            {mode === 'wake'
              ? t('sc_suggested_bedtimes', 'Suggested Bedtimes')
              : t('sc_suggested_waketimes', 'Suggested Wake-Up Times')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cycles.map(c => (
              <div key={c.cycles} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-2xl font-bold font-mono tabular-nums text-white">{c.time}</div>
                <div className="text-xs font-mono text-slate-400">
                  {c.cycles} {t('sc_cycles_label', 'cycles')} · {c.hours}h
                </div>
                <div
                  className={`text-[11px] font-semibold ${
                    c.quality === 'optimal'
                      ? 'text-emerald-400'
                      : c.quality === 'good'
                        ? 'text-amber-300'
                        : 'text-slate-400'
                  }`}
                >
                  {c.quality === 'optimal'
                    ? t('sc_optimal', 'Recommended')
                    : c.quality === 'good'
                      ? t('sc_good', 'Acceptable')
                      : t('sc_short', 'Short rest')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nap guide */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('sc_nap_guide', 'Quick Nap Reference')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
            <div>
              <strong className="text-white font-mono">20 min</strong> · {t('sc_nap_power', 'Power nap (alertness boost, no grogginess)')}
            </div>
            <div>
              <strong className="text-white font-mono">60 min</strong> · {t('sc_nap_deep', 'Deep slow-wave nap (memory consolidation)')}
            </div>
            <div>
              <strong className="text-white font-mono">90 min</strong> · {t('sc_nap_full', 'Full sleep cycle (creativity & full recovery)')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
