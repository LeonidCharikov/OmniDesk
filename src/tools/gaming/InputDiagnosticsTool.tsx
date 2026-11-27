import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gamepad2,
  Keyboard,
  MousePointerClick,
  RotateCcw,
  Timer,
  Vibrate,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { computePollingRateHz } from './reflex.logic';
import {
  ANSI_KEYBOARD_ROWS,
  computeStickMetrics,
  GHOSTING_CHALLENGES,
  isChallengeSatisfied,
  isKeyChatter,
  summarizeLatencySamples,
} from './inputDiagnostics.logic';

type DiagTab = 'keyboard' | 'mouse' | 'gamepad' | 'latency';

interface KeyEventLog {
  id: number;
  code: string;
  key: string;
  eventLagMs: number;
  chatter: boolean;
}

interface GamepadSnapshot {
  index: number;
  id: string;
  buttons: Array<{ pressed: boolean; value: number }>;
  axes: number[];
  hasRumble: boolean;
}

export const InputDiagnosticsTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<DiagTab>('keyboard');

  // Keyboard NKRO / Ghosting state
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(() => new Set());
  const [testedKeys, setTestedKeys] = useState<Set<string>>(() => new Set());
  const [peakNkro, setPeakNkro] = useState(0);
  const [chatterCount, setChatterCount] = useState(0);
  const [passedChallenges, setPassedChallenges] = useState<Set<string>>(() => new Set());
  const [keyLogs, setKeyLogs] = useState<KeyEventLog[]>([]);
  const lastKeyDownRef = useRef<Record<string, number>>({});
  const keyLogIdRef = useRef(1);

  // Mouse diagnostic state
  const [activeMouseBtns, setActiveMouseBtns] = useState<Set<number>>(() => new Set());
  const [wheelDir, setWheelDir] = useState<'none' | 'up' | 'down'>('none');
  const [wheelTicks, setWheelTicks] = useState(0);
  const [mouseHz, setMouseHz] = useState(0);
  const [mousePeakHz, setMousePeakHz] = useState(0);
  const mousePollRef = useRef<number[]>([]);
  const wheelClearRef = useRef<number | null>(null);

  // Gamepad API state
  const [gamepads, setGamepads] = useState<GamepadSnapshot[]>([]);
  const [deadzone, setDeadzone] = useState(0.08);

  // Input-to-Frame Latency Profiler state
  const [eventLagSamples, setEventLagSamples] = useState<number[]>([]);
  const [renderLagSamples, setRenderLagSamples] = useState<number[]>([]);
  const [lastTriggerSource, setLastTriggerSource] = useState<string>('—');

  const recordLatencyMeasurement = useCallback((source: string, eventTimeStamp: number) => {
    const receiveNow = performance.now();
    const queueLag =
      eventTimeStamp > 0 && receiveNow >= eventTimeStamp && receiveNow - eventTimeStamp < 500
        ? Math.round((receiveNow - eventTimeStamp) * 100) / 100
        : 0;
    setLastTriggerSource(source);
    setEventLagSamples(prev => [...prev.slice(-59), queueLag]);
    requestAnimationFrame(paintTs => {
      const totalToPaint = Math.max(0, Math.round((paintTs - (eventTimeStamp || receiveNow)) * 100) / 100);
      if (totalToPaint < 500) {
        setRenderLagSamples(prev => [...prev.slice(-59), totalToPaint]);
      }
    });
  }, []);

  // Global keyboard listener (active on keyboard & latency tabs)
  useEffect(() => {
    if (tab !== 'keyboard' && tab !== 'latency') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      const now = performance.now();
      const eventLagMs =
        e.timeStamp > 0 && now >= e.timeStamp && now - e.timeStamp < 500
          ? Math.round((now - e.timeStamp) * 100) / 100
          : 0;

      if (!e.repeat) {
        recordLatencyMeasurement(`Key (${e.code})`, e.timeStamp);
        const prevTs = lastKeyDownRef.current[e.code];
        lastKeyDownRef.current[e.code] = now;
        const chatter = prevTs !== undefined && isKeyChatter(now - prevTs, 25);
        if (chatter) setChatterCount(c => c + 1);

        setKeyLogs(prev => [
          { id: keyLogIdRef.current++, code: e.code, key: e.key === ' ' ? 'Space' : e.key, eventLagMs, chatter },
          ...prev.slice(0, 19),
        ]);
      }

      setPressedKeys(prev => {
        if (prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.add(e.code);
        setPeakNkro(p => Math.max(p, next.size));
        setPassedChallenges(done => {
          let changed = false;
          const updated = new Set(done);
          for (const ch of GHOSTING_CHALLENGES) {
            if (!updated.has(ch.id) && isChallengeSatisfied(next, ch)) {
              updated.add(ch.id);
              changed = true;
            }
          }
          return changed ? updated : done;
        });
        return next;
      });
      setTestedKeys(prev => {
        if (prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.add(e.code);
        return next;
      });
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      setPressedKeys(prev => {
        if (!prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
    };

    const onBlur = () => setPressedKeys(new Set());

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [tab, recordLatencyMeasurement]);

  // Gamepad polling loop (active on gamepad tab)
  useEffect(() => {
    if (tab !== 'gamepad') return;
    let rafId = 0;

    const poll = () => {
      const rawPads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
      const connected: GamepadSnapshot[] = [];
      for (const pad of rawPads) {
        if (!pad) continue;
        connected.push({
          index: pad.index,
          id: pad.id,
          buttons: pad.buttons.map(b => ({ pressed: b.pressed, value: b.value })),
          axes: [...pad.axes],
          hasRumble: Boolean(
            (pad as Gamepad & { vibrationActuator?: { playEffect?: unknown } }).vibrationActuator?.playEffect
          ),
        });
      }
      setGamepads(connected);
      rafId = requestAnimationFrame(poll);
    };

    rafId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId);
  }, [tab]);

  const triggerGamepadRumble = (padIndex: number) => {
    const rawPads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const pad = rawPads[padIndex] as
      | (Gamepad & {
          vibrationActuator?: {
            playEffect?: (
              type: string,
              params: { duration: number; strongMagnitude: number; weakMagnitude: number }
            ) => Promise<void>;
          };
        })
      | null;
    if (pad?.vibrationActuator?.playEffect) {
      void pad.vibrationActuator
        .playEffect('dual-rumble', {
          duration: 320,
          strongMagnitude: 0.75,
          weakMagnitude: 0.5,
        })
        .catch(() => {});
    }
  };

  const handleMousePadDown = (e: React.MouseEvent) => {
    e.preventDefault();
    recordLatencyMeasurement(`Mouse Btn ${e.button}`, e.timeStamp);
    setActiveMouseBtns(prev => {
      const next = new Set(prev);
      next.add(e.button);
      return next;
    });
  };

  const handleMousePadUp = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveMouseBtns(prev => {
      const next = new Set(prev);
      next.delete(e.button);
      return next;
    });
  };

  const handleMousePadMove = (e: React.PointerEvent) => {
    const coalesced = typeof e.nativeEvent.getCoalescedEvents === 'function' ? e.nativeEvent.getCoalescedEvents() : [];
    const ts = mousePollRef.current;
    if (coalesced.length > 0) {
      for (const item of coalesced) ts.push(item.timeStamp || performance.now());
    } else {
      ts.push(e.timeStamp || performance.now());
    }
    if (ts.length > 140) ts.splice(0, ts.length - 140);
    const hz = computePollingRateHz(ts);
    if (hz > 0) {
      setMouseHz(hz);
      setMousePeakHz(p => Math.max(p, hz));
    }
  };

  const handleMouseWheel = (e: React.WheelEvent) => {
    setWheelTicks(c => c + 1);
    setWheelDir(e.deltaY < 0 ? 'up' : 'down');
    if (wheelClearRef.current !== null) window.clearTimeout(wheelClearRef.current);
    wheelClearRef.current = window.setTimeout(() => setWheelDir('none'), 220);
  };

  useEffect(() => {
    return () => {
      if (wheelClearRef.current !== null) window.clearTimeout(wheelClearRef.current);
    };
  }, []);

  const eventLagSummary = summarizeLatencySamples(eventLagSamples);
  const renderLagSummary = summarizeLatencySamples(renderLagSamples);

  const renderStickPlot = (title: string, x: number, y: number) => {
    const m = computeStickMetrics(x, y, deadzone);
    const dotX = 50 + m.rawX * 42;
    const dotY = 50 + m.rawY * 42;
    return (
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">{title}</span>
          {m.isDrifting ? (
            <span className="text-[11px] font-mono text-amber-400">DRIFT ALERT</span>
          ) : (
            <span className="text-[11px] font-mono text-emerald-400">CENTER OK</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
            <circle cx="50" cy="50" r="44" fill="#0b1120" stroke="#334155" strokeWidth="1.5" />
            <circle
              cx="50"
              cy="50"
              r={44 * deadzone}
              fill="rgba(99,102,241,0.16)"
              stroke="#6366f1"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
            <line x1="6" y1="50" x2="94" y2="50" stroke="#1e293b" strokeWidth="1" />
            <line x1="50" y1="6" x2="50" y2="94" stroke="#1e293b" strokeWidth="1" />
            <line x1="50" y1="50" x2={dotX} y2={dotY} stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx={dotX} cy={dotY} r="5" fill={m.isDrifting ? '#fbbf24' : '#34d399'} />
          </svg>
          <div className="text-xs font-mono space-y-1 text-slate-300 tabular-nums">
            <div>X: {m.rawX.toFixed(3)}</div>
            <div>Y: {m.rawY.toFixed(3)}</div>
            <div>Mag: {(m.magnitude * 100).toFixed(1)}%</div>
            <div>Angle: {m.angleDeg}°</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_input_diagnostics_title', 'Keyboard NKRO, Mouse & Gamepad Latency Lab')}
          </h2>
          <p className="text-xs text-slate-400">
            {t(
              'ind_subtitle',
              'Test keyboard N-Key Rollover (NKRO) & ghosting, mouse buttons/wheel/polling, gamepad analog stick drift & rumble, and input-to-frame latency.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
          {(
            [
              { id: 'keyboard' as DiagTab, label: t('ind_tab_kb', 'Keyboard NKRO'), icon: <Keyboard className="w-3.5 h-3.5" /> },
              { id: 'mouse' as DiagTab, label: t('ind_tab_mouse', 'Mouse & Buttons'), icon: <MousePointerClick className="w-3.5 h-3.5" /> },
              { id: 'gamepad' as DiagTab, label: t('ind_tab_gamepad', 'Gamepad & Drift'), icon: <Gamepad2 className="w-3.5 h-3.5" /> },
              { id: 'latency' as DiagTab, label: t('ind_tab_latency', 'Input Latency'), icon: <Timer className="w-3.5 h-3.5" /> },
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

      {/* TAB 1: KEYBOARD NKRO & GHOSTING */}
      {tab === 'keyboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('ind_held_now', 'Simultaneous Held')}</span>
              <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">{pressedKeys.size}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('ind_peak_nkro', 'Peak NKRO Rollover')}</span>
              <span className="text-2xl font-mono font-bold text-indigo-400 tabular-nums">{peakNkro}-KRO</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('ind_keys_tested', 'Unique Keys Verified')}</span>
              <span className="text-2xl font-mono font-bold text-white tabular-nums">{testedKeys.size}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">{t('ind_chatter', 'Key Chatter (<25ms)')}</span>
                <span
                  className={`text-2xl font-mono font-bold tabular-nums ${
                    chatterCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {chatterCount}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPressedKeys(new Set());
                  setTestedKeys(new Set());
                  setPeakNkro(0);
                  setChatterCount(0);
                  setPassedChallenges(new Set());
                  setKeyLogs([]);
                }}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                title={t('game_restart', 'Reset')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Visual ANSI Keyboard Matrix */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 overflow-x-auto">
            <div className="min-w-[660px] space-y-1.5 select-none">
              {ANSI_KEYBOARD_ROWS.map((row, rowIdx) => (
                <div key={rowIdx} className="flex gap-1.5">
                  {row.map(cap => {
                    const active = pressedKeys.has(cap.code);
                    const tested = testedKeys.has(cap.code);
                    return (
                      <div
                        key={cap.code}
                        style={{ flexGrow: cap.w ?? 1, flexBasis: 0 }}
                        className={`h-11 rounded-lg border text-xs font-mono font-semibold flex items-center justify-center transition-all ${
                          active
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950 scale-[0.96] shadow-md'
                            : tested
                              ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-200'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {cap.label}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Ghosting Combos + Event Log */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-white">
                {t('ind_ghosting_combos', 'Anti-Ghosting & Rollover Verification Combos')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GHOSTING_CHALLENGES.map(ch => {
                  const passed = passedChallenges.has(ch.id);
                  const liveNow = isChallengeSatisfied(pressedKeys, ch);
                  return (
                    <div
                      key={ch.id}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        liveNow
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                          : passed
                            ? 'bg-emerald-950/25 border-emerald-500/35 text-slate-200'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-white">{ch.name}</div>
                        <div className="font-mono text-[11px] opacity-80">{ch.display}</div>
                      </div>
                      {passed && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2 max-h-56 overflow-y-auto">
              <div className="text-xs font-semibold text-white">{t('ind_key_log', 'Live Key Event Log')}</div>
              {keyLogs.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">
                  {t('ind_press_any_key', 'Press multiple keys simultaneously to test NKRO and ghosting.')}
                </div>
              ) : (
                <div className="space-y-1">
                  {keyLogs.map(log => (
                    <div
                      key={log.id}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center justify-between ${
                        log.chatter
                          ? 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                          : 'bg-slate-950/60 text-slate-300'
                      }`}
                    >
                      <span>
                        {log.code} ({log.key})
                      </span>
                      <span className="tabular-nums">
                        {log.eventLagMs.toFixed(1)} ms {log.chatter ? '· CHATTER' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOUSE BUTTONS, SIDE KEYS, WHEEL & POLLING */}
      {tab === 'mouse' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div
              onMouseDown={handleMousePadDown}
              onMouseUp={handleMousePadUp}
              onPointerMove={handleMousePadMove}
              onWheel={handleMouseWheel}
              onContextMenu={e => e.preventDefault()}
              className="h-72 rounded-2xl od-fixed-dark-stage border border-slate-800 flex flex-col items-center justify-center p-6 select-none cursor-crosshair gap-4"
            >
              <svg viewBox="0 0 180 220" className="w-36 h-44">
                {/* Mouse body */}
                <rect x="35" y="18" width="110" height="184" rx="52" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
                {/* Left Button (0) */}
                <path
                  d="M 88 20 L 88 94 L 37 94 L 37 70 Q 37 20 88 20 Z"
                  fill={activeMouseBtns.has(0) ? '#34d399' : '#1e293b'}
                  stroke="#475569"
                  strokeWidth="1.5"
                />
                {/* Right Button (2) */}
                <path
                  d="M 92 20 L 92 94 L 143 94 L 143 70 Q 143 20 92 20 Z"
                  fill={activeMouseBtns.has(2) ? '#34d399' : '#1e293b'}
                  stroke="#475569"
                  strokeWidth="1.5"
                />
                {/* Scroll Wheel / Middle Button (1) */}
                <rect
                  x="81"
                  y="36"
                  width="18"
                  height="42"
                  rx="9"
                  fill={
                    activeMouseBtns.has(1)
                      ? '#34d399'
                      : wheelDir !== 'none'
                        ? '#38bdf8'
                        : '#334155'
                  }
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                {/* Side Forward (4) */}
                <rect
                  x="25"
                  y="98"
                  width="10"
                  height="26"
                  rx="4"
                  fill={activeMouseBtns.has(4) ? '#34d399' : '#334155'}
                />
                {/* Side Back (3) */}
                <rect
                  x="25"
                  y="130"
                  width="10"
                  height="26"
                  rx="4"
                  fill={activeMouseBtns.has(3) ? '#34d399' : '#334155'}
                />
              </svg>
              <div className="text-xs text-slate-300 text-center">
                {t('ind_mouse_pad_hint', 'Click Left, Right, Middle, Side Back/Forward buttons, scroll wheel, or sweep cursor to test Hz.')}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('mouse_polling_current', 'Polling Rate')}</span>
              <span className="text-2xl font-mono font-bold text-indigo-400 tabular-nums">
                {mouseHz > 0 ? `${mouseHz} Hz` : '—'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('mouse_polling_peak', 'Peak Hz')}</span>
              <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                {mousePeakHz > 0 ? `${mousePeakHz} Hz` : '—'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('ind_wheel_ticks', 'Scroll Events')}</span>
              <span className="text-2xl font-mono font-bold text-white tabular-nums">{wheelTicks}</span>
              <span className="text-[10px] font-mono text-sky-400 block uppercase">{wheelDir}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('ind_active_btns', 'Pressed Buttons')}</span>
              <span className="text-lg font-mono font-bold text-amber-400 tabular-nums">
                {activeMouseBtns.size > 0 ? [...activeMouseBtns].join(', ') : 'None'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GAMEPAD & ANALOG DRIFT TESTER */}
      {tab === 'gamepad' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>
                {gamepads.length > 0
                  ? t('ind_pad_connected', '{count} controller(s) active', { count: gamepads.length })
                  : t('ind_pad_waiting', 'Connect a USB/Bluetooth gamepad and press any button to wake the Gamepad API.')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{t('ind_deadzone', 'Drift Deadzone')}:</span>
              <input
                type="range"
                min={0.02}
                max={0.25}
                step={0.01}
                value={deadzone}
                onChange={e => setDeadzone(Number(e.target.value))}
                className="w-28 accent-indigo-500"
              />
              <span className="font-mono text-white w-10">{Math.round(deadzone * 100)}%</span>
            </div>
          </div>

          {gamepads.length === 0 ? (
            <div className="p-10 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-2">
              <Gamepad2 className="w-10 h-10 text-slate-500 mx-auto" />
              <div className="text-sm font-semibold text-white">
                {t('ind_no_gamepad_title', 'No Gamepad Detected Yet')}
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {t(
                  'ind_no_gamepad_desc',
                  'Plug in an Xbox, DualSense, Switch Pro, or generic controller and press A / Cross / Start. Dual stick drift radar, trigger pressure bars, and button matrix will appear automatically.'
                )}
              </p>
            </div>
          ) : (
            gamepads.map(pad => (
              <div key={pad.index} className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      #{pad.index + 1} · {pad.id}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {pad.buttons.length} buttons · {pad.axes.length} axes
                    </div>
                  </div>
                  {pad.hasRumble && (
                    <button
                      type="button"
                      onClick={() => triggerGamepadRumble(pad.index)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Vibrate className="w-3.5 h-3.5" />
                      <span>{t('ind_test_rumble', 'Test Rumble')}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderStickPlot(t('ind_left_stick', 'Left Stick (Axes 0/1)'), pad.axes[0] ?? 0, pad.axes[1] ?? 0)}
                  {renderStickPlot(t('ind_right_stick', 'Right Stick (Axes 2/3)'), pad.axes[2] ?? 0, pad.axes[3] ?? 0)}
                </div>

                {/* Triggers & Buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'L2 / LT (Btn 6)', val: pad.buttons[6]?.value ?? 0 },
                      { label: 'R2 / RT (Btn 7)', val: pad.buttons[7]?.value ?? 0 },
                    ].map(trig => (
                      <div key={trig.label} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                        <div className="flex justify-between text-[11px] font-mono text-slate-300">
                          <span>{trig.label}</span>
                          <span>{Math.round(trig.val * 100)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 transition-all"
                            style={{ width: `${Math.round(trig.val * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
                    {pad.buttons.map((btn, idx) => (
                      <div
                        key={idx}
                        className={`py-2 px-1 rounded-lg border text-center text-[11px] font-mono transition-colors ${
                          btn.pressed
                            ? 'bg-emerald-500 border-emerald-300 text-slate-950 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        B{idx}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: INPUT-TO-FRAME LATENCY PROFILER */}
      {tab === 'latency' && (
        <div className="space-y-4">
          <div
            onPointerDown={e => recordLatencyMeasurement(`Pointer (${e.pointerType})`, e.timeStamp)}
            className="p-8 rounded-2xl od-fixed-dark-stage border-2 border-dashed border-slate-700 hover:border-indigo-500/60 text-center space-y-2 cursor-pointer select-none"
          >
            <Activity className="w-9 h-9 text-indigo-400 mx-auto" />
            <div className="text-base font-semibold text-white">
              {t('ind_lat_pad_title', 'Click Here or Press Any Key to Sample Input-to-Frame Latency')}
            </div>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              {t(
                'ind_lat_pad_desc',
                'Measures OS-to-event dispatch lag (performance.now - event.timeStamp) and total event-to-next-frame presentation delay via requestAnimationFrame.'
              )}
            </p>
            <div className="text-xs font-mono text-emerald-400 pt-1">
              {t('ind_last_source', 'Last input')}: {lastTriggerSource}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: t('ind_event_dispatch_lag', 'Event Dispatch Latency (OS → JS)'), summary: eventLagSummary },
              { title: t('ind_frame_present_lag', 'Input-to-Frame Paint Latency (Event → rAF)'), summary: renderLagSummary },
            ].map(card => (
              <div key={card.title} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-white">{card.title}</div>
                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="text-[10px] text-slate-500">MIN</div>
                    <div className="text-sm font-bold text-emerald-400">
                      {card.summary ? `${card.summary.minMs}ms` : '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="text-[10px] text-slate-500">AVG</div>
                    <div className="text-sm font-bold text-indigo-400">
                      {card.summary ? `${card.summary.avgMs}ms` : '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="text-[10px] text-slate-500">P95</div>
                    <div className="text-sm font-bold text-amber-400">
                      {card.summary ? `${card.summary.p95Ms}ms` : '—'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div className="text-[10px] text-slate-500">MAX</div>
                    <div className="text-sm font-bold text-rose-400">
                      {card.summary ? `${card.summary.maxMs}ms` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {t(
                  'ind_lat_note',
                  'Browser timers measure software/compositor pipeline latency (not physical switch + monitor pixel response time).'
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEventLagSamples([]);
                setRenderLagSamples([]);
                setLastTriggerSource('—');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white inline-flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('game_restart', 'Reset')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
