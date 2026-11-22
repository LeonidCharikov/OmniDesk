import React, { useState, useEffect, useCallback } from 'react';
import { History, Trash2, Copy, Check } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { evaluateSafeMathExpression } from '../../utils/safeMathParser';

interface CalcHistoryItem {
  expr: string;
  result: string;
}

function formatCalcNumber(value: number): string {
  if (!Number.isFinite(value)) return 'NaN';
  if (Object.is(value, -0) || Math.abs(value) < 1e-13) return '0';
  if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 1e-8)) {
    return value.toExponential(8).replace(/\.?0+e/, 'e');
  }
  return Number.isInteger(value) ? value.toString() : parseFloat(value.toFixed(10)).toString();
}

function factorial(n: number): number {
  if (!Number.isFinite(n) || n < 0 || n > 170 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let acc = 1;
  for (let i = 2; i <= n; i++) acc *= i;
  return acc;
}

export const ScientificCalculatorTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'standard' | 'scientific'>('scientific');
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [memory, setMemory] = useState<number>(0);
  const [isRad, setIsRad] = useState(true);
  const [secondFn, setSecondFn] = useState(false);
  const [history, setHistory] = useState<CalcHistoryItem[]>([
    { expr: '25 × 14', result: '350' },
    { expr: 'sin(π / 2)', result: '1' },
  ]);
  const [copied, setCopied] = useState(false);

  const errorLabel = t('error', 'Error');

  const appendSymbol = useCallback(
    (s: string) => {
      setDisplay(prev => {
        if (prev === errorLabel) {
          return s === '.' ? '0.' : s;
        }
        if (prev === '0' && /^[0-9]$/.test(s)) return s;
        if (prev === '0' && (s === 'π' || s === 'e' || s === '(')) return s;
        return prev + s;
      });
    },
    [errorLabel]
  );

  const handleClear = useCallback(() => {
    setDisplay('0');
    setExpression('');
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplay(prev => {
      if (prev.length <= 1 || prev === errorLabel) return '0';
      return prev.slice(0, -1);
    });
  }, [errorLabel]);

  const calculateResult = useCallback(() => {
    try {
      const normalized = display
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/π/g, 'pi')
        .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');

      const res = evaluateSafeMathExpression(normalized);
      if (typeof res !== 'number' || Number.isNaN(res) || !Number.isFinite(res)) {
        throw new Error(t('invalid_result', 'Invalid result'));
      }

      const formatted = formatCalcNumber(res);
      setHistory(h => [{ expr: display, result: formatted }, ...h.slice(0, 14)]);
      setExpression(`${display} =`);
      setDisplay(formatted);
    } catch {
      setDisplay(errorLabel);
    }
  }, [display, errorLabel, t]);

  const applyMathFunc = useCallback(
    (fn: (x: number) => number, label: string) => {
      try {
        const normalized = display
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/−/g, '-')
          .replace(/π/g, 'pi')
          .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
        const val = evaluateSafeMathExpression(normalized);
        if (!Number.isFinite(val)) return;
        const res = fn(val);
        if (!Number.isFinite(res)) {
          setDisplay(errorLabel);
          return;
        }
        const formatted = formatCalcNumber(res);
        setHistory(h => [{ expr: `${label}(${formatCalcNumber(val)})`, result: formatted }, ...h.slice(0, 14)]);
        setExpression(`${label}(${formatCalcNumber(val)}) =`);
        setDisplay(formatted);
      } catch {
        setDisplay(errorLabel);
      }
    },
    [display, errorLabel]
  );

  const toggleSign = useCallback(() => {
    setDisplay(prev => {
      if (prev === '0' || prev === errorLabel) return prev;
      if (/^-?\d+(\.\d+)?$/.test(prev)) {
        return prev.startsWith('-') ? prev.slice(1) : `-${prev}`;
      }
      return `-(${prev})`;
    });
  }, [errorLabel]);

  // Keyboard support (ignores events inside text inputs)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '+', '-', '*', '/', '(', ')', '%', '^'].includes(e.key)) {
        const mapped =
          e.key === '*' ? '×' : e.key === '/' ? '÷' : e.key === '-' ? '−' : e.key;
        appendSymbol(mapped);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculateResult();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [appendSymbol, calculateResult, handleBackspace, handleClear]);

  const copyDisplay = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toRad = (x: number) => (isRad ? x : (x * Math.PI) / 180);
  const fromRad = (x: number) => (isRad ? x : (x * 180) / Math.PI);

  const sciBtnClass =
    'h-12 text-xs font-mono bg-slate-800/60 hover:bg-slate-800 active:scale-[0.98] text-slate-200 border border-slate-800 rounded-xl transition-all flex items-center justify-center';
  const sciConstClass =
    'h-12 text-xs font-mono bg-slate-800/60 hover:bg-slate-800 active:scale-[0.98] text-indigo-300 border border-slate-800 rounded-xl transition-all flex items-center justify-center';
  const numBtnClass =
    'h-12 text-base font-mono font-medium bg-slate-950 hover:bg-slate-800 active:scale-[0.98] text-white border border-slate-800/80 rounded-xl transition-all flex items-center justify-center';
  const utilBtnClass =
    'h-12 text-sm font-mono font-medium bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 border border-slate-700/70 rounded-xl transition-all flex items-center justify-center';
  const opBtnClass =
    'h-12 text-lg font-mono font-bold bg-indigo-950/60 hover:bg-indigo-900/70 active:scale-[0.98] text-indigo-300 border border-indigo-800/60 rounded-xl transition-all flex items-center justify-center';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {t('tool_scientific_calc_title', 'Classic & Scientific Calculator')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_scientific_calc_desc', 'Standard and scientific mode, trigonometry, powers, memory (M+/MR), and calculation history.')}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('standard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === 'standard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('calc_standard', 'Standard')}
          </button>
          <button
            type="button"
            onClick={() => setMode('scientific')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === 'scientific' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('calc_scientific', 'Scientific')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
        {/* Main Calculator Chassis */}
        <div
          className={`p-5 sm:p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4 ${
            mode === 'standard' ? 'max-w-md w-full mx-auto lg:mx-0' : ''
          }`}
        >
          {/* Classic LCD Display */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-right space-y-1.5 relative group">
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 h-4">
              <div className="flex items-center gap-2">
                {mode === 'scientific' && (
                  <span className="text-indigo-400 font-semibold">{isRad ? 'RAD' : 'DEG'}</span>
                )}
                {memory !== 0 && (
                  <span className="text-amber-400 font-semibold">M</span>
                )}
              </div>
              <span className="truncate">{expression}</span>
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight truncate tabular-nums">
              {display}
            </div>
            <button
              type="button"
              onClick={copyDisplay}
              className="absolute left-3 bottom-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity"
              title={t('copy_number', 'Copy number')}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Mode & Memory Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              {mode === 'scientific' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsRad(prev => !prev)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 font-semibold transition-colors border border-slate-700/60"
                  >
                    {isRad ? 'RAD' : 'DEG'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSecondFn(prev => !prev)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors border ${
                      secondFn
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                    }`}
                  >
                    2nd
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => setMemory(0)}
                className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
              >
                MC
              </button>
              <button
                type="button"
                onClick={() => setDisplay(formatCalcNumber(memory))}
                className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
              >
                MR
              </button>
              <button
                type="button"
                onClick={() => setMemory(m => m + (parseFloat(display) || 0))}
                className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
              >
                M+
              </button>
              <button
                type="button"
                onClick={() => setMemory(m => m - (parseFloat(display) || 0))}
                className="px-2.5 py-1 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
              >
                M-
              </button>
              {memory !== 0 && (
                <span className="text-[10px] text-indigo-400 font-bold ml-1 tabular-nums">
                  M={formatCalcNumber(memory)}
                </span>
              )}
            </div>
          </div>

          {/* Classic Calculator Keypad Layout:
              In scientific mode: 5x3 scientific bank on the left, aligned row-for-row with the classic 5x4 numpad/operators on the right */}
          <div className={mode === 'scientific' ? 'grid grid-cols-1 md:grid-cols-[3fr_4fr] gap-3 items-start' : ''}>
            {mode === 'scientific' && (
              <div className="grid grid-cols-3 gap-2 md:pr-3 md:border-r md:border-slate-800">
                {/* Row 1: Trig / Inverse Trig */}
                <button
                  type="button"
                  onClick={() =>
                    secondFn
                      ? applyMathFunc(x => fromRad(Math.asin(x)), 'asin')
                      : applyMathFunc(x => Math.sin(toRad(x)), 'sin')
                  }
                  className={sciBtnClass}
                >
                  {secondFn ? 'sin⁻¹' : 'sin'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    secondFn
                      ? applyMathFunc(x => fromRad(Math.acos(x)), 'acos')
                      : applyMathFunc(x => Math.cos(toRad(x)), 'cos')
                  }
                  className={sciBtnClass}
                >
                  {secondFn ? 'cos⁻¹' : 'cos'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    secondFn
                      ? applyMathFunc(x => fromRad(Math.atan(x)), 'atan')
                      : applyMathFunc(x => Math.tan(toRad(x)), 'tan')
                  }
                  className={sciBtnClass}
                >
                  {secondFn ? 'tan⁻¹' : 'tan'}
                </button>

                {/* Row 2: Logs / Exponentials & Roots */}
                <button
                  type="button"
                  onClick={() => (secondFn ? applyMathFunc(Math.exp, 'eˣ') : applyMathFunc(Math.log, 'ln'))}
                  className={sciBtnClass}
                >
                  {secondFn ? 'eˣ' : 'ln'}
                </button>
                <button
                  type="button"
                  onClick={() => (secondFn ? applyMathFunc(x => Math.pow(10, x), '10ˣ') : applyMathFunc(Math.log10, 'log'))}
                  className={sciBtnClass}
                >
                  {secondFn ? '10ˣ' : 'log'}
                </button>
                <button
                  type="button"
                  onClick={() => (secondFn ? applyMathFunc(Math.cbrt, '∛') : applyMathFunc(Math.sqrt, '√'))}
                  className={sciBtnClass}
                >
                  {secondFn ? '∛x' : '√x'}
                </button>

                {/* Row 3: Powers & Reciprocal */}
                <button
                  type="button"
                  onClick={() => (secondFn ? applyMathFunc(x => Math.pow(x, 3), 'x³') : applyMathFunc(x => x * x, 'x²'))}
                  className={sciBtnClass}
                >
                  {secondFn ? 'x³' : 'x²'}
                </button>
                <button type="button" onClick={() => appendSymbol('^')} className={sciBtnClass}>
                  xʸ
                </button>
                <button type="button" onClick={() => applyMathFunc(x => 1 / x, '1/x')} className={sciBtnClass}>
                  1/x
                </button>

                {/* Row 4: Factorial & Constants */}
                <button type="button" onClick={() => applyMathFunc(factorial, 'n!')} className={sciBtnClass}>
                  n!
                </button>
                <button type="button" onClick={() => appendSymbol('π')} className={sciConstClass}>
                  π
                </button>
                <button type="button" onClick={() => appendSymbol('e')} className={sciConstClass}>
                  e
                </button>

                {/* Row 5: Parentheses & Absolute Value */}
                <button type="button" onClick={() => appendSymbol('(')} className={sciBtnClass}>
                  (
                </button>
                <button type="button" onClick={() => appendSymbol(')')} className={sciBtnClass}>
                  )
                </button>
                <button type="button" onClick={() => applyMathFunc(Math.abs, '|x|')} className={sciBtnClass}>
                  |x|
                </button>
              </div>
            )}

            {/* Classic 4-Column Standard Calculator Keypad */}
            <div className="grid grid-cols-4 gap-2">
              {/* Row 1: AC, Backspace, Percent, Divide */}
              <button
                type="button"
                onClick={handleClear}
                className="h-12 text-xs font-mono font-semibold bg-rose-950/50 hover:bg-rose-900/60 active:scale-[0.98] text-rose-300 border border-rose-800/50 rounded-xl transition-all flex items-center justify-center"
              >
                AC
              </button>
              <button type="button" onClick={handleBackspace} className={utilBtnClass} aria-label="Backspace">
                ⌫
              </button>
              <button type="button" onClick={() => appendSymbol('%')} className={utilBtnClass}>
                %
              </button>
              <button type="button" onClick={() => appendSymbol('÷')} className={opBtnClass}>
                ÷
              </button>

              {/* Row 2: 7 8 9 × */}
              {['7', '8', '9'].map(n => (
                <button key={n} type="button" onClick={() => appendSymbol(n)} className={numBtnClass}>
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => appendSymbol('×')} className={opBtnClass}>
                ×
              </button>

              {/* Row 3: 4 5 6 − */}
              {['4', '5', '6'].map(n => (
                <button key={n} type="button" onClick={() => appendSymbol(n)} className={numBtnClass}>
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => appendSymbol('−')} className={opBtnClass}>
                −
              </button>

              {/* Row 4: 1 2 3 + */}
              {['1', '2', '3'].map(n => (
                <button key={n} type="button" onClick={() => appendSymbol(n)} className={numBtnClass}>
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => appendSymbol('+')} className={opBtnClass}>
                +
              </button>

              {/* Row 5: ± 0 . = */}
              <button type="button" onClick={toggleSign} className={numBtnClass}>
                ±
              </button>
              <button type="button" onClick={() => appendSymbol('0')} className={numBtnClass}>
                0
              </button>
              <button type="button" onClick={() => appendSymbol('.')} className={numBtnClass}>
                .
              </button>
              <button
                type="button"
                onClick={calculateResult}
                className="h-12 text-lg font-mono font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white rounded-xl transition-all shadow-sm flex items-center justify-center"
              >
                =
              </button>
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                {t('calc_history', 'History')}
              </span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-slate-500 hover:text-slate-300 p-1 rounded"
                  title={t('clear_history', 'Clear history')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2 overflow-y-auto max-h-80">
              {history.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  {t('calculation_history_empty', 'History is empty')}
                </div>
              ) : (
                history.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDisplay(item.result)}
                    className="w-full text-left p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-colors group"
                  >
                    <div className="text-[11px] font-mono text-slate-400 truncate">{item.expr}</div>
                    <div className="text-sm font-mono font-semibold text-slate-100 group-hover:text-indigo-300 tabular-nums">
                      = {item.result}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono text-center pt-2 border-t border-slate-800">
            {t('supports_numpad', 'Supports numpad keyboard')}
          </div>
        </div>
      </div>
    </div>
  );
};
