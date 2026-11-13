import React, { useState, useEffect, useRef } from 'react';
import { Wind, Eye, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { useI18n } from '../../i18n/context';

type PatternId = 'box' | '478' | 'coherent';

interface Phase {
  labelKey: string;
  fallback: string;
  seconds: number;
  scale: number;
}

const PATTERNS: Record<PatternId, { nameKey: string; fallback: string; phases: Phase[] }> = {
  box: {
    nameKey: 'be_pat_box',
    fallback: 'Box Breathing (4-4-4-4)',
    phases: [
      { labelKey: 'be_inhale', fallback: 'Inhale', seconds: 4, scale: 1.35 },
      { labelKey: 'be_hold', fallback: 'Hold', seconds: 4, scale: 1.35 },
      { labelKey: 'be_exhale', fallback: 'Exhale', seconds: 4, scale: 0.75 },
      { labelKey: 'be_hold', fallback: 'Hold', seconds: 4, scale: 0.75 },
    ],
  },
  '478': {
    nameKey: 'be_pat_478',
    fallback: '4-7-8 Relaxing',
    phases: [
      { labelKey: 'be_inhale', fallback: 'Inhale', seconds: 4, scale: 1.35 },
      { labelKey: 'be_hold', fallback: 'Hold', seconds: 7, scale: 1.35 },
      { labelKey: 'be_exhale', fallback: 'Exhale', seconds: 8, scale: 0.75 },
    ],
  },
  coherent: {
    nameKey: 'be_pat_coherent',
    fallback: 'Coherent (5-5)',
    phases: [
      { labelKey: 'be_inhale', fallback: 'Inhale', seconds: 5, scale: 1.35 },
      { labelKey: 'be_exhale', fallback: 'Exhale', seconds: 5, scale: 0.75 },
    ],
  },
};

function playSoftChime(freq = 528) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    setTimeout(() => void ctx.close(), 450);
  } catch {
    // ignore
  }
}

export const BreathingEyeGuideTool: React.FC = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<'breath' | 'eye'>('breath');

  // Breathing state
  const [pattern, setPattern] = useState<PatternId>('box');
  const [breathRunning, setBreathRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseSecLeft, setPhaseSecLeft] = useState(4);
  const [cyclesDone, setCyclesDone] = useState(0);
  const [soundCue, setSoundCue] = useState(true);

  // 20-20-20 Eye Break Timer
  const [eyeRunning, setEyeRunning] = useState(false);
  const [eyeMode, setEyeMode] = useState<'work' | 'rest'>('work');
  const [eyeSecLeft, setEyeSecLeft] = useState(20 * 60);
  const soundRef = useRef(soundCue);
  soundRef.current = soundCue;

  const currentPhases = PATTERNS[pattern].phases;
  const activePhase = currentPhases[phaseIdx % currentPhases.length];

  useEffect(() => {
    if (!breathRunning) return;
    const id = window.setInterval(() => {
      setPhaseSecLeft(prev => {
        if (prev > 1) return prev - 1;
        setPhaseIdx(p => {
          const next = (p + 1) % currentPhases.length;
          if (next === 0) setCyclesDone(c => c + 1);
          if (soundRef.current) playSoftChime(next === 0 ? 528 : 432);
          setPhaseSecLeft(currentPhases[next].seconds);
          return next;
        });
        return 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [breathRunning, currentPhases]);

  useEffect(() => {
    if (!eyeRunning) return;
    const id = window.setInterval(() => {
      setEyeSecLeft(prev => {
        if (prev > 1) return prev - 1;
        setEyeMode(m => {
          const nextMode = m === 'work' ? 'rest' : 'work';
          if (soundRef.current) playSoftChime(nextMode === 'rest' ? 660 : 440);
          setEyeSecLeft(nextMode === 'rest' ? 20 : 20 * 60);
          return nextMode;
        });
        return 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [eyeRunning]);

  const startBreathing = () => {
    setPhaseIdx(0);
    setPhaseSecLeft(currentPhases[0].seconds);
    setCyclesDone(0);
    if (soundCue) playSoftChime(528);
    setBreathRunning(true);
  };

  const formatMMSS = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              {tab === 'breath' ? <Wind className="w-5 h-5 text-emerald-400" /> : <Eye className="w-5 h-5 text-sky-400" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('be_title', 'Guided Breathing & 20-20-20 Eye Break')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('be_subtitle', 'Visual breathing exercises for calm focus and a 20-20-20 timer to reduce eye strain.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundCue(s => !s)}
              aria-label={t('be_toggle_sound', 'Toggle audio chime')}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
            >
              {soundCue ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
              <button
                type="button"
                onClick={() => setTab('breath')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === 'breath' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('be_tab_breath', 'Breathing Pacer')}
              </button>
              <button
                type="button"
                onClick={() => setTab('eye')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tab === 'eye' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('be_tab_eye', '20-20-20 Eye Rest')}
              </button>
            </div>
          </div>
        </div>

        {tab === 'breath' ? (
          <div className="space-y-6 flex flex-col items-center">
            <div className="flex flex-wrap justify-center gap-2">
              {(Object.keys(PATTERNS) as PatternId[]).map(pid => (
                <button
                  key={pid}
                  type="button"
                  disabled={breathRunning}
                  onClick={() => {
                    setPattern(pid);
                    setPhaseIdx(0);
                    setPhaseSecLeft(PATTERNS[pid].phases[0].seconds);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    pattern === pid
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {t(PATTERNS[pid].nameKey, PATTERNS[pid].fallback)}
                </button>
              ))}
            </div>

            <div className="w-56 h-56 flex items-center justify-center relative">
              <div
                className="w-36 h-36 rounded-full bg-indigo-500/20 border-2 border-indigo-400/60 flex flex-col items-center justify-center transition-transform duration-1000 ease-in-out"
                style={{ transform: `scale(${breathRunning ? activePhase.scale : 1})` }}
              >
                <div className="text-sm font-semibold text-white">
                  {breathRunning ? t(activePhase.labelKey, activePhase.fallback) : t('be_ready', 'Ready')}
                </div>
                <div className="text-3xl font-bold font-mono tabular-nums text-indigo-300 mt-1">
                  {breathRunning ? phaseSecLeft : PATTERNS[pattern].phases[0].seconds}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {!breathRunning ? (
                <button
                  type="button"
                  onClick={startBreathing}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{t('start', 'Start')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setBreathRunning(false)}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>{t('be_stop', 'Stop')}</span>
                </button>
              )}
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {t('be_cycles_done', 'Cycles')}: {cyclesDone}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-6 space-y-5 text-center">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 w-full max-w-md space-y-2">
              <div
                className={`text-xs font-semibold ${
                  eyeMode === 'rest' ? 'text-emerald-400' : 'text-indigo-300'
                }`}
              >
                {eyeMode === 'work'
                  ? t('be_eye_work', 'Screen Focus Session (20 min)')
                  : t('be_eye_rest', 'Look 20 ft (6 m) Away Now! (20 sec)')}
              </div>
              <div className="text-5xl font-bold font-mono tabular-nums text-white">
                {formatMMSS(eyeSecLeft)}
              </div>
              <p className="text-xs text-slate-400 pt-1">
                {t('be_eye_rule', 'Every 20 minutes, look at an object at least 6 meters (20 feet) away for 20 seconds.')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!eyeRunning ? (
                <button
                  type="button"
                  onClick={() => setEyeRunning(true)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{t('start', 'Start')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEyeRunning(false)}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>{t('pause', 'Pause')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setEyeRunning(false);
                  setEyeMode('work');
                  setEyeSecLeft(20 * 60);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white"
              >
                {t('reset', 'Reset')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
