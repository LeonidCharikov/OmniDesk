import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Activity,
  Code2,
  Hash,
  Keyboard,
  RotateCcw,
  Timer,
  Trophy,
  Type,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  computeTypingConsistency,
  evaluateTypingProgress,
  generateTypingPrompt,
  TypingMode,
} from './typingTest.logic';

const BEST_WPM_KEY = 'omnidesk_typing_best_v1';

type TimeOption = 15 | 30 | 60;
type WordOption = 25 | 50;
type BestMap = Record<string, number>;

function loadBests(): BestMap {
  try {
    const raw = localStorage.getItem(BEST_WPM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BestMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export const TypingTestTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<TypingMode>('time');
  const [timeLimit, setTimeLimit] = useState<TimeOption>(30);
  const [wordCount, setWordCount] = useState<WordOption>(25);
  const [includePunct, setIncludePunct] = useState(false);
  const [includeNumbers, setIncludeNumbers] = useState(false);

  const [prompt, setPrompt] = useState<string>(() =>
    generateTypingPrompt({ mode: 'time', wordCount: 80, includePunctuation: false, includeNumbers: false })
  );
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'DONE'>('IDLE');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [wpmTimeline, setWpmTimeline] = useState<number[]>([]);
  const [bests, setBests] = useState<BestMap>(loadBests);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const typedRef = useRef('');
  typedRef.current = typed;
  const promptRef = useRef(prompt);
  promptRef.current = prompt;

  const bestKey =
    mode === 'time' ? `time_${timeLimit}` : mode === 'words' ? `words_${wordCount}` : 'code';

  const saveBest = useCallback((key: string, wpm: number) => {
    setBests(prev => {
      if (wpm <= (prev[key] || 0)) return prev;
      const next = { ...prev, [key]: wpm };
      try {
        localStorage.setItem(BEST_WPM_KEY, JSON.stringify(next));
      } catch {
        // ignore quota
      }
      return next;
    });
  }, []);

  const resetTest = useCallback(
    (
      nextMode: TypingMode = mode,
      nextTime: TimeOption = timeLimit,
      nextWords: WordOption = wordCount,
      nextPunct: boolean = includePunct,
      nextNums: boolean = includeNumbers
    ) => {
      const targetWords = nextMode === 'time' ? Math.max(70, nextTime * 3) : nextWords;
      const nextPrompt = generateTypingPrompt({
        mode: nextMode,
        wordCount: targetWords,
        includePunctuation: nextPunct,
        includeNumbers: nextNums,
      });
      setMode(nextMode);
      setTimeLimit(nextTime);
      setWordCount(nextWords);
      setIncludePunct(nextPunct);
      setIncludeNumbers(nextNums);
      setPrompt(nextPrompt);
      setTyped('');
      setStatus('IDLE');
      setElapsedSec(0);
      setWpmTimeline([]);
      startTimeRef.current = 0;
      window.setTimeout(() => inputRef.current?.focus(), 20);
    },
    [mode, timeLimit, wordCount, includePunct, includeNumbers]
  );

  // Live timer & 1-second WPM timeline sampling
  useEffect(() => {
    if (status !== 'RUNNING') return;
    const id = window.setInterval(() => {
      const sec = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSec(sec);

      const snapshot = evaluateTypingProgress(promptRef.current, typedRef.current, Math.max(0.5, sec));
      setWpmTimeline(prev => {
        const expectedLen = Math.max(1, Math.floor(sec));
        if (prev.length < expectedLen) {
          return [...prev, snapshot.netWpm];
        }
        return prev;
      });

      if (mode === 'time' && sec >= timeLimit) {
        setElapsedSec(timeLimit);
        setStatus('DONE');
        const finalStats = evaluateTypingProgress(promptRef.current, typedRef.current, timeLimit);
        saveBest(bestKey, finalStats.netWpm);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [status, mode, timeLimit, bestKey, saveBest]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (status === 'DONE') return;
    const val = e.target.value;

    if (status === 'IDLE' && val.length > 0) {
      startTimeRef.current = performance.now();
      setStatus('RUNNING');
    }

    const clamped = val.slice(0, prompt.length);
    setTyped(clamped);

    if (clamped.length >= prompt.length) {
      const finalSec = Math.max(0.5, (performance.now() - (startTimeRef.current || performance.now())) / 1000);
      setElapsedSec(finalSec);
      setStatus('DONE');
      const finalStats = evaluateTypingProgress(prompt, clamped, finalSec);
      saveBest(bestKey, finalStats.netWpm);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      resetTest();
    }
  };

  const stats = useMemo(
    () => evaluateTypingProgress(prompt, typed, Math.max(0.5, elapsedSec)),
    [prompt, typed, elapsedSec]
  );
  const consistency = useMemo(() => computeTypingConsistency(wpmTimeline), [wpmTimeline]);
  const timeLeft = mode === 'time' ? Math.max(0, Math.ceil(timeLimit - elapsedSec)) : Math.floor(elapsedSec);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_typing_test_title', 'Typing Speed & Accuracy Test')}
          </h2>
          <p className="text-xs text-slate-400">
            {t(
              'type_subtitle',
              'Measure Net & Raw WPM, accuracy, consistency, and weakest keys across Time Sprint, Word Count, and Code Syntax modes.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
          {(
            [
              { id: 'time' as TypingMode, label: t('type_mode_time', 'Time Sprint'), icon: <Timer className="w-3.5 h-3.5" /> },
              { id: 'words' as TypingMode, label: t('type_mode_words', 'Words'), icon: <Type className="w-3.5 h-3.5" /> },
              { id: 'code' as TypingMode, label: t('type_mode_code', 'Code Syntax'), icon: <Code2 className="w-3.5 h-3.5" /> },
            ] as const
          ).map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => resetTest(opt.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                mode === opt.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Sub-Options */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'time' &&
            ([15, 30, 60] as TimeOption[]).map(sec => (
              <button
                key={sec}
                type="button"
                onClick={() => resetTest('time', sec, wordCount, includePunct, includeNumbers)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                  timeLimit === sec
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}

          {mode === 'words' &&
            ([25, 50] as WordOption[]).map(wc => (
              <button
                key={wc}
                type="button"
                onClick={() => resetTest('words', timeLimit, wc, includePunct, includeNumbers)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                  wordCount === wc
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {wc} {t('type_words_unit', 'words')}
              </button>
            ))}

          {mode !== 'code' && (
            <>
              <button
                type="button"
                onClick={() => resetTest(mode, timeLimit, wordCount, !includePunct, includeNumbers)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  includePunct
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {t('type_opt_punct', 'Punctuation')}
              </button>
              <button
                type="button"
                onClick={() => resetTest(mode, timeLimit, wordCount, includePunct, !includeNumbers)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                  includeNumbers
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Hash className="w-3 h-3" />
                <span>{t('type_opt_numbers', 'Numbers')}</span>
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => resetTest()}
          className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('type_restart_tab', 'Restart (Tab)')}</span>
        </button>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">{t('type_net_wpm', 'Net WPM')}</span>
          <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">{stats.netWpm}</span>
          <span className="text-[10px] font-mono text-slate-400 block">Raw {stats.rawWpm} WPM</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">{t('aim_accuracy', 'Accuracy')}</span>
          <span className="text-2xl font-mono font-bold text-indigo-400 tabular-nums">{stats.accuracy.toFixed(1)}%</span>
          <span className="text-[10px] font-mono text-slate-400 block">
            {stats.errorChars} {t('type_errors', 'errors')}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">
            {mode === 'time' ? t('aim_time_left', 'Time Left') : t('type_elapsed', 'Elapsed')}
          </span>
          <span className="text-2xl font-mono font-bold text-white tabular-nums">{timeLeft}s</span>
          <span className="text-[10px] font-mono text-slate-400 block">{stats.progressPct}%</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>{t('game_best', 'Best WPM')}</span>
          </span>
          <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">
            {Math.max(bests[bestKey] || 0, status === 'DONE' ? stats.netWpm : 0)}
          </span>
          <span className="text-[10px] font-mono text-slate-400 block">
            {t('type_consistency', 'Consistency')}: {consistency}%
          </span>
        </div>
      </div>

      {/* Typing Stage */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="relative p-6 rounded-2xl od-fixed-dark-stage border border-slate-800 cursor-text space-y-4"
      >
        <input
          ref={inputRef}
          type="text"
          value={typed}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label={t('type_input_label', 'Typing test input')}
          className="sr-only"
        />

        <div
          className={`font-mono leading-relaxed tracking-wide select-none break-words ${
            mode === 'code' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
          }`}
        >
          {prompt.split('').map((ch, idx) => {
            const isTyped = idx < typed.length;
            const isCurrent = idx === typed.length && status !== 'DONE';
            const isCorrect = isTyped && typed[idx] === ch;
            const cls = isCurrent
              ? 'bg-indigo-500/80 text-white rounded-xs'
              : isTyped
                ? isCorrect
                  ? 'text-emerald-400'
                  : 'text-rose-400 bg-rose-500/25 rounded-xs'
                : 'text-slate-500';
            return (
              <span key={idx} className={cls}>
                {ch}
              </span>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="inline-flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {status === 'IDLE'
                ? t('type_start_hint', 'Click this box and start typing to begin the timer automatically.')
                : status === 'RUNNING'
                  ? t('type_running_hint', 'Keep typing — press Tab anytime to restart.')
                  : t('type_done_hint', 'Test complete! Click Restart or press Tab to try again.')}
            </span>
          </div>
          <span className="font-mono text-slate-300">
            {typed.length} / {prompt.length}
          </span>
        </div>
      </div>

      {/* Results Breakdown (WPM Timeline + Weak Keys) */}
      {(status === 'DONE' || wpmTimeline.length >= 2) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white inline-flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('type_wpm_chart', 'WPM Pacing Over Time')}</span>
              </span>
              <span className="font-mono text-slate-400">
                {t('type_consistency', 'Consistency')}: {consistency}%
              </span>
            </div>
            <div className="h-28 flex items-end gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800">
              {wpmTimeline.map((val, idx) => {
                const maxVal = Math.max(40, ...wpmTimeline);
                const hPct = Math.max(10, Math.round((val / maxVal) * 100));
                return (
                  <div
                    key={idx}
                    title={`${idx + 1}s: ${val} WPM`}
                    className="flex-1 bg-indigo-500/80 rounded-t transition-all"
                    style={{ height: `${hPct}%` }}
                  />
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-white">
              {t('type_weak_keys', 'Most Missed Keys')}
            </div>
            {stats.weakKeys.length === 0 ? (
              <div className="text-xs text-emerald-400 py-4 text-center">
                {t('type_no_misses', 'Zero character errors so far!')}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {stats.weakKeys.map(item => (
                  <div
                    key={item.char}
                    className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center font-mono"
                  >
                    <div className="text-base font-bold text-white">{item.char}</div>
                    <div className="text-[10px] text-rose-300">{item.misses}×</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
