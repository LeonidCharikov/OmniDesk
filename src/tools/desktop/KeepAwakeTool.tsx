import React, { useState, useEffect, useCallback } from 'react';
import {
  Coffee,
  Monitor,
  MousePointer,
  Power,
  ShieldAlert,
  Timer,
  Cpu,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { isTauri } from '../../services/fileSystemService';
import { toastService } from '../../services/toastService';
import {
  KeepAwakeConfig,
  KeepAwakeStatus,
  formatDurationSeconds,
  getDesktopKeepAwakeStatus,
  startDesktopKeepAwake,
  stopDesktopKeepAwake,
} from '../../services/desktopToolsService';
import { useDocumentVisible } from '../../hooks/useDocumentVisibility';
import { DesktopOnlyGuard } from './DesktopOnlyGuard';

const STORAGE_KEY = 'omnidesk_keepawake_cfg_v1';

const DURATION_PRESETS = [
  { minutes: 0, key: 'ka_dur_indefinite', fallback: 'Indefinite' },
  { minutes: 15, key: 'ka_dur_15m', fallback: '15 min' },
  { minutes: 30, key: 'ka_dur_30m', fallback: '30 min' },
  { minutes: 60, key: 'ka_dur_1h', fallback: '1 hr' },
  { minutes: 120, key: 'ka_dur_2h', fallback: '2 hr' },
  { minutes: 240, key: 'ka_dur_4h', fallback: '4 hr' },
];

const DEFAULT_CONFIG: KeepAwakeConfig = {
  keep_display: true,
  jiggle_mouse: false,
  jiggle_interval_sec: 45,
  duration_minutes: 0,
};

function loadConfig(): KeepAwakeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<KeepAwakeConfig>;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_CONFIG;
    return {
      keep_display: parsed.keep_display !== false,
      jiggle_mouse: Boolean(parsed.jiggle_mouse),
      jiggle_interval_sec: Math.max(
        15,
        Math.min(300, Math.round(Number(parsed.jiggle_interval_sec ?? 45) || 45))
      ),
      duration_minutes: Math.max(
        0,
        Math.min(1440, Math.round(Number(parsed.duration_minutes ?? 0) || 0))
      ),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export const KeepAwakeTool: React.FC = () => {
  const { t } = useI18n();
  const runningInTauri = isTauri();
  const isDocumentVisible = useDocumentVisible();

  const [config, setConfig] = useState<KeepAwakeConfig>(loadConfig);
  const [status, setStatus] = useState<KeepAwakeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateConfig = useCallback((patch: Partial<KeepAwakeConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!runningInTauri) return;
    try {
      const next = await getDesktopKeepAwakeStatus();
      setStatus(next);
    } catch {
      // ignore transient polling errors
    }
  }, [runningInTauri]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!runningInTauri || !status?.active || !isDocumentVisible) return;
    void fetchStatus();
    const id = window.setInterval(() => {
      void fetchStatus();
    }, 1000);
    return () => window.clearInterval(id);
  }, [runningInTauri, status?.active, isDocumentVisible, fetchStatus]);

  const handleToggle = async () => {
    setError(null);
    setBusy(true);
    try {
      if (status?.active) {
        const next = await stopDesktopKeepAwake();
        setStatus(next);
        toastService.show({
          type: 'info',
          title: t('ka_stopped_toast', 'Keep-Awake disabled — normal OS sleep restored'),
        });
      } else {
        const next = await startDesktopKeepAwake(config);
        setStatus(next);
        toastService.show({
          type: 'success',
          title: t('ka_started_toast', 'Keep-Awake active'),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toastService.show({ type: 'error', title: msg });
    } finally {
      setBusy(false);
    }
  };

  if (!runningInTauri) {
    return (
      <DesktopOnlyGuard
        title={t('tool_keep_awake_title', 'Keep-Awake (Caffeine) & Mouse Jiggler')}
        description={t(
          'tool_keep_awake_desc',
          'Prevent OS sleep and screen dimming during long builds, exports, or presentations with optional subtle ±1px mouse jiggling and auto-off timers.'
        )}
      />
    );
  }

  const isActive = Boolean(status?.active);
  const activeError = error || status?.last_error || null;
  const totalSec =
    status && status.duration_minutes > 0 ? status.duration_minutes * 60 : null;
  const remainingSec = status?.remaining_sec ?? null;
  const progressRatio =
    isActive && totalSec !== null && remainingSec !== null
      ? Math.max(0, Math.min(1, remainingSec / totalSec))
      : 1;
  const ringCircumference = 2 * Math.PI * 52;
  const ringOffset = ringCircumference * (1 - progressRatio);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_keep_awake_title', 'Keep-Awake (Caffeine) & Mouse Jiggler')}
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              {t('desktop_only_badge', 'Desktop Only')}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {t(
              'ka_subtitle',
              'Use native OS sleep-inhibition APIs (Win32 ExecutionState / macOS caffeinate / Linux systemd-inhibit) plus an optional micro mouse jiggler.'
            )}
          </p>
        </div>
      </div>

      {activeError && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{activeError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive Power Card */}
        <div className="lg:col-span-5">
          <div
            className={`p-6 rounded-2xl border h-full flex flex-col items-center justify-between text-center space-y-5 transition-colors ${
              isActive
                ? 'bg-emerald-950/20 border-emerald-500/50'
                : 'bg-slate-900/40 border-slate-800'
            }`}
          >
            <div className="space-y-1">
              <span
                className={`text-xs font-mono uppercase tracking-widest ${
                  isActive ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {isActive
                  ? t('ka_status_active', 'AWAKE SESSION ACTIVE')
                  : t('ka_status_inactive', 'NORMAL OS SLEEP')}
              </span>
            </div>

            {/* Interactive SVG Ring Button */}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleToggle()}
              aria-label={isActive ? t('ka_disable_btn', 'Disable Keep-Awake') : t('ka_enable_btn', 'Enable Keep-Awake')}
              className="relative w-36 h-36 flex items-center justify-center rounded-full focus:outline-none group disabled:opacity-60"
            >
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-slate-800"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={isActive ? ringOffset : ringCircumference}
                  className={isActive ? 'text-emerald-400 transition-all duration-500' : 'text-slate-700'}
                />
              </svg>
              <div
                className={`absolute inset-4 rounded-full flex flex-col items-center justify-center border transition-all ${
                  isActive
                    ? 'bg-emerald-600/25 border-emerald-400/60 text-emerald-200 group-hover:bg-emerald-600/35'
                    : 'bg-slate-950 border-slate-700 text-slate-300 group-hover:border-indigo-500 group-hover:text-white'
                }`}
              >
                {isActive ? (
                  <Coffee className="w-8 h-8 mb-1 text-emerald-300" />
                ) : (
                  <Power className="w-8 h-8 mb-1 text-indigo-400" />
                )}
                <span className="text-xs font-semibold">
                  {isActive ? t('ka_btn_stop', 'Turn Off') : t('ka_btn_start', 'Keep Awake')}
                </span>
              </div>
            </button>

            {/* Live Counters */}
            <div className="w-full grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  {t('ka_stat_elapsed', 'Elapsed')}
                </span>
                <span className="text-sm font-mono font-bold text-slate-100">
                  {formatDurationSeconds(status?.elapsed_sec ?? 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  {t('ka_stat_remaining', 'Remaining')}
                </span>
                <span className="text-sm font-mono font-bold text-indigo-300">
                  {isActive
                    ? status?.remaining_sec !== null && status?.remaining_sec !== undefined
                      ? formatDurationSeconds(status.remaining_sec)
                      : '∞'
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  {t('ka_stat_jiggles', 'Jiggles')}
                </span>
                <span className="text-sm font-mono font-bold text-amber-300">
                  {status?.jiggle_count ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Settings */}
        <div className="lg:col-span-7 space-y-4">
          {/* Sleep Mode */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('ka_section_mode', 'Sleep Prevention Mode')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isActive}
                onClick={() => updateConfig({ keep_display: true })}
                className={`p-3.5 rounded-xl border text-left space-y-1 transition-colors disabled:opacity-60 ${
                  config.keep_display
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Monitor className="w-4 h-4 text-indigo-400" />
                  <span>{t('ka_mode_display', 'System + Screen Awake')}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    'ka_mode_display_desc',
                    'Prevents both computer sleep and monitor dimming or screensaver lock.'
                  )}
                </p>
              </button>

              <button
                type="button"
                disabled={isActive}
                onClick={() => updateConfig({ keep_display: false })}
                className={`p-3.5 rounded-xl border text-left space-y-1 transition-colors disabled:opacity-60 ${
                  !config.keep_display
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>{t('ka_mode_system', 'System Awake Only')}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    'ka_mode_system_desc',
                    'Allows the display to turn off while background downloads or builds keep running.'
                  )}
                </p>
              </button>
            </div>
          </div>

          {/* Duration Timer */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('ka_section_duration', 'Auto-Off Timer')}</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map(preset => (
                <button
                  key={preset.minutes}
                  type="button"
                  disabled={isActive}
                  onClick={() => updateConfig({ duration_minutes: preset.minutes })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60 ${
                    config.duration_minutes === preset.minutes
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t(preset.key, preset.fallback)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <label className="text-xs text-slate-400">
                {t('ka_custom_minutes', 'Custom duration (minutes, 0 = indefinite):')}
              </label>
              <input
                type="number"
                min={0}
                max={1440}
                disabled={isActive}
                value={config.duration_minutes}
                onChange={e =>
                  updateConfig({
                    duration_minutes: Math.max(0, Math.min(1440, Number(e.target.value) || 0)),
                  })
                }
                className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Mouse Jiggler */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <MousePointer className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('ka_jiggler_title', 'Subtle ±1px Mouse Jiggler')}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {t(
                    'ka_jiggler_desc',
                    'Nudges the cursor +1px and immediately back -1px so it stays visually stationary while resetting idle timers.'
                  )}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.jiggle_mouse}
                disabled={isActive}
                onClick={() => updateConfig({ jiggle_mouse: !config.jiggle_mouse })}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-60 ${
                  config.jiggle_mouse ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    config.jiggle_mouse ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {config.jiggle_mouse && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {t('ka_jiggle_interval', 'Jiggle Interval')}
                  </span>
                  <span className="font-mono text-indigo-300">
                    {config.jiggle_interval_sec}s
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={300}
                  step={5}
                  disabled={isActive}
                  value={config.jiggle_interval_sec}
                  onChange={e =>
                    updateConfig({ jiggle_interval_sec: Number(e.target.value) })
                  }
                  className="w-full accent-indigo-500 disabled:opacity-60"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
