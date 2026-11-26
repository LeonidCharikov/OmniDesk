import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  MousePointerClick,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { computePollingRateHz, isAccidentalDoubleClick } from './reflex.logic';

const BEST_CPS_KEY = 'omnidesk_mouse_cps_best_v1';

type MouseLabTab = 'cps' | 'doubleclick' | 'polling';
type CpsDuration = 1 | 5 | 10 | 30;

interface DoubleClickLog {
  id: number;
  button: string;
  deltaMs: number;
  fault: boolean;
}

type CpsBests = Record<string, number>;

function loadCpsBests(): CpsBests {
  try {
    const raw = localStorage.getItem(BEST_CPS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CpsBests;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export const MouseCpsTesterTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<MouseLabTab>('cps');

  // CPS Sprint State
  const [duration, setDuration] = useState<CpsDuration>(5);
  const [cpsState, setCpsState] = useState<'IDLE' | 'RUNNING' | 'DONE'>('IDLE');
  const [clicks, setClicks] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(5000);
  const [bests, setBests] = useState<CpsBests>(loadCpsBests);
  const endTimeRef = useRef(0);
  const clicksRef = useRef(0);

  // Double-Click Detector State
  const [dcThresholdMs, setDcThresholdMs] = useState(80);
  const [dcTotal, setDcTotal] = useState(0);
  const [dcFaults, setDcFaults] = useState(0);
  const [dcLogs, setDcLogs] = useState<DoubleClickLog[]>([]);
  const lastDownByButtonRef = useRef<Record<number, number>>({});
  const logIdRef = useRef(1);

  // Polling Rate Meter State
  const [pollingHz, setPollingHz] = useState(0);
  const [peakHz, setPeakHz] = useState(0);
  const [samplesCount, setSamplesCount] = useState(0);
  const pollTimestampsRef = useRef<number[]>([]);
  const pollBoxRef = useRef<HTMLDivElement | null>(null);

  const saveCpsBest = useCallback((dur: CpsDuration, cpsVal: number) => {
    setBests(prev => {
      const key = String(dur);
      if (cpsVal <= (prev[key] || 0)) return prev;
      const next = { ...prev, [key]: cpsVal };
      try {
        localStorage.setItem(BEST_CPS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // CPS timer
  useEffect(() => {
    if (cpsState !== 'RUNNING') return;
    let rafId = 0;
    const tick = (now: number) => {
      const rem = Math.max(0, endTimeRef.current - now);
      setTimeLeftMs(rem);
      if (rem <= 0) {
        const finalCps = Math.round((clicksRef.current / duration) * 100) / 100;
        saveCpsBest(duration, finalCps);
        setCpsState('DONE');
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [cpsState, duration, saveCpsBest]);

  const handleCpsPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (cpsState === 'DONE') return;
    if (cpsState === 'IDLE') {
      clicksRef.current = 1;
      setClicks(1);
      endTimeRef.current = performance.now() + duration * 1000;
      setTimeLeftMs(duration * 1000);
      setCpsState('RUNNING');
      return;
    }
    clicksRef.current += 1;
    setClicks(clicksRef.current);
  };

  const resetCps = (nextDur: CpsDuration = duration) => {
    setDuration(nextDur);
    clicksRef.current = 0;
    setClicks(0);
    setTimeLeftMs(nextDur * 1000);
    setCpsState('IDLE');
  };

  // Double-Click Switch Fault Handler
  const handleSwitchTestDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const now = performance.now();
    const btn = e.button;
    const btnName =
      btn === 0
        ? t('mouse_btn_left', 'Left')
        : btn === 2
          ? t('mouse_btn_right', 'Right')
          : btn === 1
            ? t('mouse_btn_middle', 'Middle')
            : `Btn ${btn}`;
    const prevTime = lastDownByButtonRef.current[btn];
    lastDownByButtonRef.current[btn] = now;
    setDcTotal(c => c + 1);

    if (prevTime !== undefined) {
      const deltaMs = Math.round((now - prevTime) * 10) / 10;
      const fault = isAccidentalDoubleClick(deltaMs, dcThresholdMs);
      if (fault) setDcFaults(f => f + 1);
      setDcLogs(prev => [
        { id: logIdRef.current++, button: btnName, deltaMs, fault },
        ...prev.slice(0, 24),
      ]);
    }
  };

  // Mouse Polling Rate Measurement (supports pointerrawupdate for high-Hz gaming mice)
  useEffect(() => {
    if (tab !== 'polling') return;
    const el = pollBoxRef.current;
    if (!el) return;

    const recordMove = (ev: Event) => {
      const pe = ev as PointerEvent;
      const coalesced = typeof pe.getCoalescedEvents === 'function' ? pe.getCoalescedEvents() : [];
      const tsList = pollTimestampsRef.current;
      if (coalesced.length > 0) {
        for (const item of coalesced) {
          tsList.push(item.timeStamp || performance.now());
        }
      } else {
        tsList.push(pe.timeStamp || performance.now());
      }
      if (tsList.length > 160) {
        tsList.splice(0, tsList.length - 160);
      }
      const hz = computePollingRateHz(tsList);
      setSamplesCount(tsList.length);
      if (hz > 0) {
        setPollingHz(hz);
        setPeakHz(prev => Math.max(prev, hz));
      }
    };

    const rawSupported = 'onpointerrawupdate' in window;
    const eventName = rawSupported ? 'pointerrawupdate' : 'pointermove';
    el.addEventListener(eventName, recordMove);
    return () => el.removeEventListener(eventName, recordMove);
  }, [tab]);

  const elapsedSec = Math.max(0.1, duration - timeLeftMs / 1000);
  const currentCps =
    cpsState === 'DONE'
      ? (clicks / duration).toFixed(2)
      : cpsState === 'RUNNING'
        ? (clicks / elapsedSec).toFixed(2)
        : '0.00';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_mouse_cps_tester_title', 'Mouse CPS, Polling Rate & Switch Lab')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('mouse_subtitle', 'Benchmark clicks per second (CPS), diagnose hardware double-click switch faults, and estimate mouse polling rate (Hz).')}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
          {(
            [
              { id: 'cps' as MouseLabTab, label: t('mouse_tab_cps', 'CPS Sprint'), icon: <MousePointerClick className="w-3.5 h-3.5" /> },
              { id: 'doubleclick' as MouseLabTab, label: t('mouse_tab_dc', 'Double-Click Fault'), icon: <AlertTriangle className="w-3.5 h-3.5" /> },
              { id: 'polling' as MouseLabTab, label: t('mouse_tab_polling', 'Polling Rate (Hz)'), icon: <Gauge className="w-3.5 h-3.5" /> },
            ] as const
          ).map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                tab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: CPS SPRINT */}
      {tab === 'cps' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {([1, 5, 10, 30] as CpsDuration[]).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => resetCps(d)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                    duration === d
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => resetCps(duration)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('game_restart', 'Restart')}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('mouse_live_cps', 'CPS')}</span>
              <span className="text-2xl font-mono font-bold text-indigo-400 tabular-nums">{currentCps}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('mouse_total_clicks', 'Clicks')}</span>
              <span className="text-2xl font-mono font-bold text-white tabular-nums">{clicks}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('aim_time_left', 'Time')}</span>
              <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                {(timeLeftMs / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>{t('game_best', 'Best')} ({duration}s)</span>
              </span>
              <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">
                {(bests[String(duration)] || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onPointerDown={handleCpsPointerDown}
            className={`w-full h-64 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 select-none transition-colors cursor-pointer ${
              cpsState === 'RUNNING'
                ? 'bg-indigo-600/20 border-indigo-400 text-white active:bg-indigo-600/35'
                : cpsState === 'DONE'
                  ? 'bg-emerald-950/25 border-emerald-500/50 text-white'
                  : 'bg-slate-900/50 border-slate-700 hover:border-indigo-500/60 text-slate-200'
            }`}
          >
            <MousePointerClick className="w-10 h-10 text-indigo-400" />
            <span className="text-xl font-bold">
              {cpsState === 'IDLE'
                ? t('mouse_click_to_start', 'Click Here Rapidly to Start')
                : cpsState === 'RUNNING'
                  ? t('mouse_keep_clicking', 'Keep Clicking!')
                  : t('mouse_done_result', 'Finished: {cps} CPS ({clicks} clicks)', {
                      cps: currentCps,
                      clicks,
                    })}
            </span>
            {cpsState === 'DONE' && (
              <span
                onPointerDown={e => {
                  e.stopPropagation();
                  resetCps(duration);
                }}
                className="mt-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                {t('game_play_again', 'Play Again')}
              </span>
            )}
          </button>
        </div>
      )}

      {/* TAB 2: DOUBLE-CLICK FAULT DETECTOR */}
      {tab === 'doubleclick' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div
              onMouseDown={handleSwitchTestDown}
              onContextMenu={e => e.preventDefault()}
              className="h-64 rounded-2xl bg-slate-900/50 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 flex flex-col items-center justify-center text-center p-6 select-none cursor-pointer space-y-2"
            >
              <MousePointerClick className="w-9 h-9 text-cyan-400" />
              <div className="text-base font-semibold text-white">
                {t('mouse_dc_pad_title', 'Click Normally (Left, Right, or Middle Button)')}
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                {t('mouse_dc_pad_hint', 'Perform steady single clicks. Any interval faster than {ms} ms is flagged as a potential switch double-click bounce fault.', {
                  ms: dcThresholdMs,
                })}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>{t('mouse_dc_threshold', 'Fault Threshold:')}</span>
                <input
                  type="number"
                  min={20}
                  max={150}
                  value={dcThresholdMs}
                  onChange={e => setDcThresholdMs(Math.max(20, Math.min(150, Number(e.target.value) || 80)))}
                  className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-white"
                />
                <span className="font-mono text-slate-400">ms</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDcTotal(0);
                  setDcFaults(0);
                  setDcLogs([]);
                  lastDownByButtonRef.current = {};
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('game_restart', 'Reset')}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">{t('mouse_total_clicks', 'Clicks')}</span>
                <span className="text-2xl font-mono font-bold text-white tabular-nums">{dcTotal}</span>
              </div>
              <div
                className={`p-3.5 rounded-xl border ${
                  dcFaults > 0
                    ? 'bg-rose-950/30 border-rose-500/40'
                    : 'bg-emerald-950/20 border-emerald-500/30'
                }`}
              >
                <span className="text-[11px] text-slate-400 block">{t('mouse_dc_faults', 'Double-Click Faults')}</span>
                <span
                  className={`text-2xl font-mono font-bold tabular-nums flex items-center gap-1.5 ${
                    dcFaults > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {dcFaults > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  <span>{dcFaults}</span>
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 max-h-56 overflow-y-auto">
              <div className="text-xs font-semibold text-slate-300">
                {t('mouse_dc_log', 'Recent Click Intervals')}
              </div>
              {dcLogs.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  {t('mouse_dc_log_empty', 'Click the pad to measure intervals.')}
                </div>
              ) : (
                <div className="space-y-1">
                  {dcLogs.map(item => (
                    <div
                      key={item.id}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between ${
                        item.fault
                          ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-950/60 text-slate-300'
                      }`}
                    >
                      <span>{item.button}</span>
                      <span className="tabular-nums">
                        {item.deltaMs.toFixed(1)} ms {item.fault ? '· FAULT' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POLLING RATE (Hz) */}
      {tab === 'polling' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('mouse_polling_current', 'Estimated Polling Rate')}</span>
              <span className="text-3xl font-mono font-bold text-indigo-400 tabular-nums mt-0.5 block">
                {pollingHz > 0 ? `${pollingHz} Hz` : '—'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('mouse_polling_peak', 'Peak Measured')}</span>
              <span className="text-3xl font-mono font-bold text-emerald-400 tabular-nums mt-0.5 block">
                {peakHz > 0 ? `${peakHz} Hz` : '—'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">{t('mouse_polling_samples', 'Samples Window')}</span>
                <span className="text-2xl font-mono font-bold text-white tabular-nums mt-0.5 block">
                  {samplesCount}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  pollTimestampsRef.current = [];
                  setPollingHz(0);
                  setPeakHz(0);
                  setSamplesCount(0);
                }}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                title={t('game_restart', 'Reset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={pollBoxRef}
            className="h-64 rounded-2xl od-fixed-dark-stage border border-slate-800 flex flex-col items-center justify-center text-center p-6 select-none cursor-crosshair space-y-2"
          >
            <Activity className="w-10 h-10 text-indigo-400" />
            <div className="text-base font-semibold text-white">
              {t('mouse_polling_pad_title', 'Move Your Mouse Rapidly in Circles Here')}
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              {t('mouse_polling_pad_hint', 'Uses high-resolution coalesced pointer events to estimate USB report rate (125 / 250 / 500 / 1000 Hz+).')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
