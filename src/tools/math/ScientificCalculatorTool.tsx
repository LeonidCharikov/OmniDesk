import React, { useState, useEffect } from 'react';
import { Calculator, History, Trash2, RotateCcw, Copy, Check } from 'lucide-react';
import { useI18n } from '../../i18n/context';

export const ScientificCalculatorTool: React.FC = () => {
  const { t, currentLanguage } = useI18n();
  const [mode, setMode] = useState<'standard' | 'scientific'>('scientific');
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [memory, setMemory] = useState<number>(0);
  const [isRad, setIsRad] = useState(true);
  const [history, setHistory] = useState<Array<{ expr: string; result: string }>>([
    { expr: '25 × 14', result: '350' },
    { expr: 'sin(π / 2)', result: '1' },
  ]);
  const [copied, setCopied] = useState(false);

  // Keyboard support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '+', '-', '*', '/'].includes(e.key)) {
        appendSymbol(e.key === '*' ? '×' : e.key === '/' ? '÷' : e.key);
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
  });

  const appendSymbol = (s: string) => {
    setDisplay(prev => {
      if (prev === '0' && !isNaN(Number(s))) return s;
      if (prev === 'Chyba') return s;
      return prev + s;
    });
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
  };

  const handleBackspace = () => {
    setDisplay(prev => {
      if (prev.length <= 1 || prev === 'Chyba') return '0';
      return prev.slice(0, -1);
    });
  };

  const calculateResult = () => {
    try {
      // Sanitize and replace math symbols for JS eval
      let sanitized = display
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'Math.PI')
        .replace(/\be\b/g, 'Math.E');

      // Functions
      // If safe eval
      const evalExpr = sanitized;
      // Evaluate using Function constructor for pure mathematical strings
      // eslint-disable-next-line no-new-func
      const res = Function(`"use strict"; return (${evalExpr})`)();
      if (typeof res !== 'number' || isNaN(res) || !isFinite(res)) {
        throw new Error('Neplatný výsledek');
      }

      const formatted = Number.isInteger(res) ? res.toString() : parseFloat(res.toFixed(10)).toString();
      setHistory(h => [{ expr: display, result: formatted }, ...h.slice(0, 9)]);
      setExpression(display + ' =');
      setDisplay(formatted);
    } catch {
      setDisplay('Chyba');
    }
  };

  const applyMathFunc = (fn: (x: number) => number, label: string) => {
    try {
      const val = parseFloat(display);
      if (isNaN(val)) return;
      const res = fn(val);
      if (isNaN(res) || !isFinite(res)) {
        setDisplay('Chyba');
        return;
      }
      const formatted = Number.isInteger(res) ? res.toString() : parseFloat(res.toFixed(10)).toString();
      setHistory(h => [{ expr: `${label}(${val})`, result: formatted }, ...h.slice(0, 9)]);
      setExpression(`${label}(${val}) =`);
      setDisplay(formatted);
    } catch {
      setDisplay('Chyba');
    }
  };

  // Factorial helper
  const factorial = (n: number): number => {
    if (n < 0 || n > 170) return NaN;
    if (n === 0 || n === 1) return 1;
    let acc = 1;
    for (let i = 2; i <= Math.floor(n); i++) acc *= i;
    return acc;
  };

  const copyDisplay = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{t('tool_scientific_calc_title', 'Klasická & Vědecká Kalkulačka')}</h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_scientific_calc_desc', 'Standardní i vědecký režim, goniometrie, mocniny, paměť (M+/MR) a historie výpočtů.')}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setMode('standard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === 'standard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('calc_standard', 'Klasická')}
          </button>
          <button
            onClick={() => setMode('scientific')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === 'scientific' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('calc_scientific', 'Vědecká')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-6">
        {/* Main Calculator Body */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          {/* Display screen */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-right space-y-1 relative group">
            <div className="text-xs font-mono text-slate-500 h-4 truncate">{expression}</div>
            <div className="text-3xl font-mono font-bold text-white tracking-tight truncate tabular-nums">
              {display}
            </div>
            <button
              onClick={copyDisplay}
              className="absolute left-3 bottom-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 opacity-0 group-hover:opacity-100 transition-opacity"
              title={t('copy_number', 'Kopírovat číslo')}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Rad/Deg & Memory strip */}
          <div className="flex items-center justify-between text-xs font-mono">
            {mode === 'scientific' ? (
              <button
                onClick={() => setIsRad(!isRad)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-indigo-400 font-semibold transition-colors"
              >
                {isRad ? 'RAD' : 'DEG'}
              </button>
            ) : <div />}

            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <button
                onClick={() => setMemory(0)}
                className="px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
              >
                MC
              </button>
              <button
                onClick={() => setDisplay(memory.toString())}
                className="px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
              >
                MR
              </button>
              <button
                onClick={() => setMemory(m => m + (parseFloat(display) || 0))}
                className="px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
              >
                M+
              </button>
              <button
                onClick={() => setMemory(m => m - (parseFloat(display) || 0))}
                className="px-2 py-0.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
              >
                M-
              </button>
              {memory !== 0 && (
                <span className="text-[10px] text-indigo-400 font-bold ml-1">M ({memory})</span>
              )}
            </div>
          </div>

          {/* Keypad Grid */}
          <div className={`grid gap-2 ${mode === 'scientific' ? 'grid-cols-5' : 'grid-cols-4'}`}>
            {/* Scientific specific buttons */}
            {mode === 'scientific' && (
              <>
                <button
                  onClick={() => applyMathFunc(x => (isRad ? Math.sin(x) : Math.sin((x * Math.PI) / 180)), 'sin')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  sin
                </button>
                <button
                  onClick={() => applyMathFunc(x => (isRad ? Math.cos(x) : Math.cos((x * Math.PI) / 180)), 'cos')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  cos
                </button>
                <button
                  onClick={() => applyMathFunc(x => (isRad ? Math.tan(x) : Math.tan((x * Math.PI) / 180)), 'tan')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  tan
                </button>
                <button
                  onClick={() => applyMathFunc(Math.log, 'ln')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  ln
                </button>
                <button
                  onClick={() => applyMathFunc(Math.log10, 'log')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  log
                </button>

                <button
                  onClick={() => applyMathFunc(Math.sqrt, '√')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  √x
                </button>
                <button
                  onClick={() => applyMathFunc(x => Math.pow(x, 2), 'sqr')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  x²
                </button>
                <button
                  onClick={() => appendSymbol('**')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  xʸ
                </button>
                <button
                  onClick={() => applyMathFunc(factorial, 'n!')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  n!
                </button>
                <button
                  onClick={() => applyMathFunc(x => 1 / x, '1/x')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  1/x
                </button>

                <button
                  onClick={() => appendSymbol('π')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-indigo-300 rounded-lg transition-colors"
                >
                  π
                </button>
                <button
                  onClick={() => appendSymbol('e')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-indigo-300 rounded-lg transition-colors"
                >
                  e
                </button>
                <button
                  onClick={() => appendSymbol('(')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  (
                </button>
                <button
                  onClick={() => appendSymbol(')')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  )
                </button>
                <button
                  onClick={() => applyMathFunc(x => -x, 'neg')}
                  className="p-2.5 text-xs font-mono bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                >
                  ±
                </button>
              </>
            )}

            {/* Standard Keypad */}
            <button
              onClick={handleClear}
              className="p-3 text-xs font-mono font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-xl transition-colors"
            >
              AC
            </button>
            <button
              onClick={handleBackspace}
              className="p-3 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            >
              ⌫
            </button>
            <button
              onClick={() => appendSymbol('%')}
              className="p-3 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            >
              %
            </button>
            <button
              onClick={() => appendSymbol('÷')}
              className="p-3 text-sm font-mono font-bold bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 rounded-xl transition-colors"
            >
              ÷
            </button>

            {['7', '8', '9'].map(n => (
              <button
                key={n}
                onClick={() => appendSymbol(n)}
                className="p-3 text-base font-mono bg-slate-950 hover:bg-slate-800 text-white border border-slate-800/60 rounded-xl transition-colors"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => appendSymbol('×')}
              className="p-3 text-sm font-mono font-bold bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 rounded-xl transition-colors"
            >
              ×
            </button>

            {['4', '5', '6'].map(n => (
              <button
                key={n}
                onClick={() => appendSymbol(n)}
                className="p-3 text-base font-mono bg-slate-950 hover:bg-slate-800 text-white border border-slate-800/60 rounded-xl transition-colors"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => appendSymbol('-')}
              className="p-3 text-sm font-mono font-bold bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 rounded-xl transition-colors"
            >
              -
            </button>

            {['1', '2', '3'].map(n => (
              <button
                key={n}
                onClick={() => appendSymbol(n)}
                className="p-3 text-base font-mono bg-slate-950 hover:bg-slate-800 text-white border border-slate-800/60 rounded-xl transition-colors"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => appendSymbol('+')}
              className="p-3 text-sm font-mono font-bold bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/50 rounded-xl transition-colors"
            >
              +
            </button>

            <button
              onClick={() => appendSymbol('0')}
              className="p-3 text-base font-mono bg-slate-950 hover:bg-slate-800 text-white border border-slate-800/60 rounded-xl transition-colors col-span-2"
            >
              0
            </button>
            <button
              onClick={() => appendSymbol('.')}
              className="p-3 text-base font-mono bg-slate-950 hover:bg-slate-800 text-white border border-slate-800/60 rounded-xl transition-colors"
            >
              .
            </button>
            <button
              onClick={calculateResult}
              className="p-3 text-base font-mono font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-sm"
            >
              =
            </button>
          </div>
        </div>

        {/* History Sidebar */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                Historie
              </span>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="text-slate-500 hover:text-slate-300 p-1 rounded"
                  title={t('clear_history', 'Smazat historii')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2 overflow-y-auto max-h-80">
              {history.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">{t('calculation_history_empty', 'Historie je prázdná')}</div>
              ) : (
                history.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => setDisplay(item.result)}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition-colors group"
                  >
                    <div className="text-[11px] font-mono text-slate-400 truncate">{item.expr}</div>
                    <div className="text-sm font-mono font-semibold text-slate-100 group-hover:text-indigo-300">
                      = {item.result}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono text-center pt-2 border-t border-slate-800">
            Podporuje numpad klávesnici
          </div>
        </div>
      </div>
    </div>
  );
};
