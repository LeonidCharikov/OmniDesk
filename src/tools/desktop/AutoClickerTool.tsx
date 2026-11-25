import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Crosshair,
  Keyboard,
  MousePointerClick,
  Play,
  ShieldAlert,
  Square,
  Timer,
  Zap,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { isTauri } from '../../services/fileSystemService';
import { toastService } from '../../services/toastService';
import {
  AutoClickerButton,
  AutoClickerClickType,
  AutoClickerConfig,
  AutoClickerHotkey,
  AutoClickerMode,
  AutoClickerStatus,
  AutoClickerStopMode,
  clampAutoClickerInterval,
  estimateActionsPerSecond,
  formatDurationSeconds,
  getDesktopAutoClickerStatus,
  getDesktopCursorPosition,
  setDesktopAutoClickerHotkey,
  startDesktopAutoClicker,
  stopDesktopAutoClicker,
} from '../../services/desktopToolsService';
import { useDocumentVisible } from '../../hooks/useDocumentVisibility';
import { DesktopOnlyGuard } from './DesktopOnlyGuard';

const STORAGE_KEY = 'omnidesk_autoclicker_cfg_v1';

const HOTKEYS: AutoClickerHotkey[] = ['F6', 'F7', 'F8', 'F9', 'F10'];

const SPECIAL_KEYS = ['Space', 'Enter', 'Tab', 'Escape', 'Backspace', 'Up', 'Down', 'Left', 'Right'];
const LETTER_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBER_KEYS = '0123456789'.split('');
const FUNCTION_KEYS = Array.from({ length: 12 }, (_, idx) => `F${idx + 1}`);
const ALL_KEYS = [...SPECIAL_KEYS, ...LETTER_KEYS, ...NUMBER_KEYS, ...FUNCTION_KEYS];

const CPS_PRESETS = [
  { label: '1 CPS', intervalMs: 1000 },
  { label: '5 CPS', intervalMs: 200 },
  { label: '10 CPS', intervalMs: 100 },
  { label: '20 CPS', intervalMs: 50 },
];

const DEFAULT_CONFIG: AutoClickerConfig = {
  mode: 'mouse',
  button: 'left',
  click_type: 'single',
  key: 'Space',
  interval_ms: 100,
  jitter_ms: 0,
  use_fixed_pos: false,
  x: 500,
  y: 500,
  start_delay_sec: 2,
  stop_mode: 'infinite',
  max_count: 100,
  max_duration_sec: 60,
  hotkey: 'F6',
};

function loadConfig(): AutoClickerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AutoClickerConfig>;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_CONFIG;
    return {
      mode: parsed.mode === 'key' ? 'key' : 'mouse',
      button:
        parsed.button === 'right' || parsed.button === 'middle' ? parsed.button : 'left',
      click_type: parsed.click_type === 'double' ? 'double' : 'single',
      key: typeof parsed.key === 'string' && ALL_KEYS.includes(parsed.key) ? parsed.key : 'Space',
      interval_ms: clampAutoClickerInterval(Number(parsed.interval_ms ?? 100)),
      jitter_ms: Math.max(0, Math.min(5000, Math.round(Number(parsed.jitter_ms ?? 0) || 0))),
      use_fixed_pos: Boolean(parsed.use_fixed_pos),
      x: Number.isFinite(Number(parsed.x)) ? Math.round(Number(parsed.x)) : 500,
      y: Number.isFinite(Number(parsed.y)) ? Math.round(Number(parsed.y)) : 500,
      start_delay_sec: Math.max(
        0,
        Math.min(10, Math.round(Number(parsed.start_delay_sec ?? 2) || 0))
      ),
      stop_mode:
        parsed.stop_mode === 'count' || parsed.stop_mode === 'duration'
          ? parsed.stop_mode
          : 'infinite',
      max_count: Math.max(1, Math.min(1_000_000, Math.round(Number(parsed.max_count ?? 100) || 100))),
      max_duration_sec: Math.max(
        1,
        Math.min(86_400, Math.round(Number(parsed.max_duration_sec ?? 60) || 60))
      ),
      hotkey: HOTKEYS.includes(parsed.hotkey as AutoClickerHotkey)
        ? (parsed.hotkey as AutoClickerHotkey)
        : 'F6',
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export const AutoClickerTool: React.FC = () => {
  const { t } = useI18n();
  const runningInTauri = isTauri();
  const isDocumentVisible = useDocumentVisible();

  const [config, setConfig] = useState<AutoClickerConfig>(loadConfig);
  const [status, setStatus] = useState<AutoClickerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickCountdown, setPickCountdown] = useState<number | null>(null);

  const pickTimerRef = useRef<number | null>(null);

  const updateConfig = useCallback((patch: Partial<AutoClickerConfig>) => {
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
      const next = await getDesktopAutoClickerStatus();
      setStatus(next);
    } catch {
      // ignore transient polling errors
    }
  }, [runningInTauri]);

  useEffect(() => {
    if (!runningInTauri) return;
    void fetchStatus();
    void setDesktopAutoClickerHotkey(config.hotkey).catch(() => {});
  }, [runningInTauri, fetchStatus, config.hotkey]);

  useEffect(() => {
    if (!runningInTauri || !isDocumentVisible) return;
    void fetchStatus();
    const pollMs = status?.running ? 250 : 600;
    const id = window.setInterval(() => {
      void fetchStatus();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [runningInTauri, isDocumentVisible, status?.running, fetchStatus]);

  useEffect(() => {
    return () => {
      if (pickTimerRef.current !== null) {
        window.clearInterval(pickTimerRef.current);
      }
    };
  }, []);

  const handleStart = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const sanitized: AutoClickerConfig = {
        ...config,
        interval_ms: clampAutoClickerInterval(config.interval_ms),
        jitter_ms: Math.max(0, Math.min(5000, Math.round(config.jitter_ms))),
        start_delay_sec: Math.max(0, Math.min(10, Math.round(config.start_delay_sec))),
        max_count: Math.max(1, Math.round(config.max_count)),
        max_duration_sec: Math.max(1, Math.round(config.max_duration_sec)),
      };
      const next = await startDesktopAutoClicker(sanitized);
      setStatus(next);
      toastService.show({
        type: 'info',
        title: t('ac_started_toast', 'Auto-Clicker started ({hotkey} to stop)', {
          hotkey: sanitized.hotkey,
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toastService.show({ type: 'error', title: msg });
    } finally {
      setBusy(false);
    }
  }, [config, t]);

  const handleStop = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const next = await stopDesktopAutoClicker();
      setStatus(next);
      toastService.show({
        type: 'success',
        title: t('ac_stopped_toast', 'Auto-Clicker stopped'),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [t]);

  // In-window hotkey fallback (works across all OSes while OmniDesk has focus)
  useEffect(() => {
    if (!runningInTauri) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === config.hotkey) {
        e.preventDefault();
        if (status?.running) {
          void handleStop();
        } else {
          void handleStart();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [runningInTauri, config.hotkey, status?.running, handleStart, handleStop]);

  const handlePickCoordinates = () => {
    if (pickCountdown !== null) return;
    setPickCountdown(3);
    let remaining = 3;
    pickTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setPickCountdown(remaining);
      } else {
        if (pickTimerRef.current !== null) {
          window.clearInterval(pickTimerRef.current);
          pickTimerRef.current = null;
        }
        setPickCountdown(null);
        void getDesktopCursorPosition()
          .then(([cx, cy]) => {
            updateConfig({ use_fixed_pos: true, x: cx, y: cy });
            toastService.show({
              type: 'success',
              title: t('ac_coords_captured_toast', 'Captured cursor position ({x}, {y})', {
                x: cx,
                y: cy,
              }),
            });
          })
          .catch(err => {
            setError(err instanceof Error ? err.message : String(err));
          });
      }
    }, 1000);
  };

  if (!runningInTauri) {
    return (
      <DesktopOnlyGuard
        title={t('tool_auto_clicker_title', 'Auto-Clicker & Key Presser')}
        description={t(
          'tool_auto_clicker_desc',
          'Native OS mouse auto-clicker and automated keyboard key presser with random jitter, coordinate picker, stop conditions, and emergency hotkey.'
        )}
      />
    );
  }

  const isRunning = Boolean(status?.running);
  const estCps = estimateActionsPerSecond(config.interval_ms);
  const activeError = error || status?.last_error || null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_auto_clicker_title', 'Auto-Clicker & Key Presser')}
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              {t('desktop_only_badge', 'Desktop Only')}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {t(
              'ac_subtitle',
              'Automate repetitive left/right/middle mouse clicks or keyboard presses at configurable intervals with safety limits.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">{t('ac_hotkey_label', 'Emergency Hotkey:')}</label>
          <select
            value={config.hotkey}
            disabled={isRunning}
            onChange={e => {
              const hk = e.target.value as AutoClickerHotkey;
              updateConfig({ hotkey: hk });
              void setDesktopAutoClickerHotkey(hk).catch(() => {});
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
          >
            {HOTKEYS.map(hk => (
              <option key={hk} value={hk}>
                {hk}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Status Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          className={`p-3.5 rounded-xl border ${
            isRunning
              ? 'bg-emerald-950/25 border-emerald-500/50'
              : 'bg-slate-900/40 border-slate-800'
          }`}
        >
          <span className="text-[11px] text-slate-400 block">{t('ac_stat_status', 'Status')}</span>
          <span
            className={`text-lg font-mono font-bold mt-0.5 block ${
              isRunning ? 'text-emerald-400' : 'text-slate-300'
            }`}
          >
            {isRunning
              ? status && status.countdown_remaining_sec > 0
                ? t('ac_status_countdown', 'Starting in {sec}s', {
                    sec: status.countdown_remaining_sec,
                  })
                : t('ac_status_running', 'RUNNING')
              : t('ac_status_idle', 'IDLE')}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">
            {t('ac_stat_actions', 'Actions Sent')}
          </span>
          <span className="text-lg font-mono font-bold text-indigo-400 mt-0.5 block">
            {(status?.total_actions ?? 0).toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">
            {t('ac_stat_elapsed', 'Elapsed Time')}
          </span>
          <span className="text-lg font-mono font-bold text-slate-100 mt-0.5 block">
            {formatDurationSeconds(status?.elapsed_sec ?? 0)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">
            {t('ac_stat_cursor', 'Live Cursor (X, Y)')}
          </span>
          <span className="text-lg font-mono font-bold text-amber-300 mt-0.5 block">
            {status ? `${status.cursor_x}, ${status.cursor_y}` : '—'}
          </span>
        </div>
      </div>

      {activeError && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{activeError}</span>
        </div>
      )}

      {/* Main Control Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Action Mode & Target */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t('ac_section_mode', 'Action Mode')}
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {([
                {
                  id: 'mouse' as AutoClickerMode,
                  label: t('ac_mode_mouse', 'Mouse Auto-Clicker'),
                  icon: <MousePointerClick className="w-4 h-4" />,
                },
                {
                  id: 'key' as AutoClickerMode,
                  label: t('ac_mode_key', 'Key Presser'),
                  icon: <Keyboard className="w-4 h-4" />,
                },
              ]).map(m => (
                <button
                  key={m.id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => updateConfig({ mode: m.id })}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
                    config.mode === m.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {config.mode === 'mouse' ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">
                      {t('ac_mouse_button', 'Mouse Button')}
                    </label>
                    <select
                      value={config.button}
                      disabled={isRunning}
                      onChange={e =>
                        updateConfig({ button: e.target.value as AutoClickerButton })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    >
                      <option value="left">{t('ac_btn_left', 'Left Click')}</option>
                      <option value="right">{t('ac_btn_right', 'Right Click')}</option>
                      <option value="middle">{t('ac_btn_middle', 'Middle Click')}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">
                      {t('ac_click_type', 'Click Type')}
                    </label>
                    <select
                      value={config.click_type}
                      disabled={isRunning}
                      onChange={e =>
                        updateConfig({ click_type: e.target.value as AutoClickerClickType })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    >
                      <option value="single">{t('ac_type_single', 'Single Click')}</option>
                      <option value="double">{t('ac_type_double', 'Double Click')}</option>
                    </select>
                  </div>
                </div>

                {/* Cursor Target */}
                <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                  <label className="text-xs text-slate-400 block">
                    {t('ac_target_location', 'Click Position')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => updateConfig({ use_fixed_pos: false })}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60 ${
                        !config.use_fixed_pos
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('ac_pos_current', 'Current Cursor')}
                    </button>
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => updateConfig({ use_fixed_pos: true })}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60 ${
                        config.use_fixed_pos
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('ac_pos_fixed', 'Fixed (X, Y)')}
                    </button>
                  </div>

                  {config.use_fixed_pos && (
                    <div className="grid grid-cols-12 gap-2 pt-1">
                      <div className="col-span-4 space-y-1">
                        <label className="text-[11px] font-mono text-slate-400">X</label>
                        <input
                          type="number"
                          disabled={isRunning}
                          value={config.x}
                          onChange={e => updateConfig({ x: Math.round(Number(e.target.value) || 0) })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="col-span-4 space-y-1">
                        <label className="text-[11px] font-mono text-slate-400">Y</label>
                        <input
                          type="number"
                          disabled={isRunning}
                          value={config.y}
                          onChange={e => updateConfig({ y: Math.round(Number(e.target.value) || 0) })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="col-span-4 flex items-end">
                        <button
                          type="button"
                          disabled={isRunning || pickCountdown !== null}
                          onClick={handlePickCoordinates}
                          className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-100 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                        >
                          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            {pickCountdown !== null
                              ? `${pickCountdown}s...`
                              : t('ac_pick_btn', 'Pick (3s)')}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">
                    {t('ac_key_select_label', 'Target Key to Press')}
                  </label>
                  <select
                    value={config.key}
                    disabled={isRunning}
                    onChange={e => updateConfig({ key: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  >
                    <optgroup label={t('ac_keys_special', 'Special & Navigation')}>
                      {SPECIAL_KEYS.map(k => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t('ac_keys_letters', 'Letters (A–Z)')}>
                      {LETTER_KEYS.map(k => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t('ac_keys_numbers', 'Digits (0–9)')}>
                      {NUMBER_KEYS.map(k => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t('ac_keys_function', 'Function Keys (F1–F12)')}>
                      {FUNCTION_KEYS.map(k => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {['Space', 'Enter', 'Tab', 'E', 'F', 'W'].map(quickKey => (
                    <button
                      key={quickKey}
                      type="button"
                      disabled={isRunning}
                      onClick={() => updateConfig({ key: quickKey })}
                      className={`px-2.5 py-1 rounded-md border font-mono text-[11px] transition-colors disabled:opacity-60 ${
                        config.key === quickKey
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {quickKey}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cadence, Jitter & Stop Conditions */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('ac_section_timing', 'Timing & Stop Limits')}</span>
              </h3>
              <span className="text-xs font-mono text-indigo-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                ~{estCps} {t('ac_actions_per_sec', 'actions/sec')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">
                  {t('ac_interval_ms', 'Interval (ms)')}
                </label>
                <input
                  type="number"
                  min={10}
                  max={3600000}
                  disabled={isRunning}
                  value={config.interval_ms}
                  onChange={e =>
                    updateConfig({ interval_ms: Math.max(10, Number(e.target.value) || 100) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">
                  {t('ac_jitter_ms', 'Random Jitter (± ms)')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  disabled={isRunning}
                  value={config.jitter_ms}
                  onChange={e =>
                    updateConfig({
                      jitter_ms: Math.max(0, Math.min(5000, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">
                  {t('ac_start_delay', 'Start Delay (sec)')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  disabled={isRunning}
                  value={config.start_delay_sec}
                  onChange={e =>
                    updateConfig({
                      start_delay_sec: Math.max(0, Math.min(10, Number(e.target.value) || 0)),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CPS_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={isRunning}
                  onClick={() => updateConfig({ interval_ms: preset.intervalMs })}
                  className={`px-2.5 py-1 rounded-md border font-mono text-[11px] transition-colors disabled:opacity-60 ${
                    config.interval_ms === preset.intervalMs
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {preset.label} ({preset.intervalMs}ms)
                </button>
              ))}
            </div>

            {/* Stop Condition */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <label className="text-xs text-slate-400 block">
                {t('ac_stop_condition', 'Stop Condition')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'infinite' as AutoClickerStopMode, label: t('ac_stop_manual', 'Until Stopped') },
                  { id: 'count' as AutoClickerStopMode, label: t('ac_stop_count', 'After N Clicks') },
                  { id: 'duration' as AutoClickerStopMode, label: t('ac_stop_duration', 'After Time') },
                ]).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isRunning}
                    onClick={() => updateConfig({ stop_mode: opt.id })}
                    className={`py-2 px-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-60 ${
                      config.stop_mode === opt.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {config.stop_mode === 'count' && (
                <div className="flex items-center gap-3 pt-1">
                  <label className="text-xs text-slate-400 shrink-0">
                    {t('ac_max_count_label', 'Total actions:')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    disabled={isRunning}
                    value={config.max_count}
                    onChange={e =>
                      updateConfig({ max_count: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="w-32 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {config.stop_mode === 'duration' && (
                <div className="flex items-center gap-3 pt-1">
                  <label className="text-xs text-slate-400 shrink-0">
                    {t('ac_max_duration_label', 'Duration (seconds):')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={86400}
                    disabled={isRunning}
                    value={config.max_duration_sec}
                    onChange={e =>
                      updateConfig({ max_duration_sec: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="w-32 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-slate-400 space-y-0.5">
          <div>
            {status?.global_hotkey_supported
              ? t(
                  'ac_hotkey_global_hint',
                  'Global emergency hotkey {hotkey} is active even when OmniDesk is minimized or in the background.',
                  { hotkey: config.hotkey }
                )
              : t(
                  'ac_hotkey_window_hint',
                  'Press {hotkey} while OmniDesk is focused to toggle, or set a Start Delay / Stop Limit for hands-free automation.',
                  { hotkey: config.hotkey }
                )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleStart()}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-sm"
            >
              <Play className="w-4 h-4" />
              <span>
                {t('ac_start_btn', 'Start ({hotkey})', { hotkey: config.hotkey })}
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleStop()}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-sm"
            >
              <Square className="w-4 h-4" />
              <span>
                {t('ac_stop_btn', 'Emergency Stop ({hotkey})', { hotkey: config.hotkey })}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
