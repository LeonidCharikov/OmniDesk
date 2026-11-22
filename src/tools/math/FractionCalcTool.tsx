import React, { useMemo, useState } from 'react';
import { Divide } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  continuedFraction,
  decimalToExactFraction,
  normalizeFraction,
  operateFractions,
} from '../../utils/mathSuite.logic';

export const FractionCalcTool: React.FC = () => {
  const { t } = useI18n();
  const [n1, setN1] = useState('3');
  const [d1, setD1] = useState('8');
  const [op, setOp] = useState<'+' | '-' | '*' | '/'>('+');
  const [n2, setN2] = useState('5');
  const [d2, setD2] = useState('12');
  const [decInput, setDecInput] = useState('0.1(6)');

  const arithResult = useMemo(() => {
    try {
      const f1 = normalizeFraction(BigInt(n1 || '0'), BigInt(d1 || '1'));
      const f2 = normalizeFraction(BigInt(n2 || '0'), BigInt(d2 || '1'));
      const res = operateFractions(f1, f2, op);
      const whole = res.n / res.d;
      const rem = res.n % res.d;
      const absRem = rem < 0n ? -rem : rem;
      const decimal = Number(res.n) / Number(res.d);
      const cf = continuedFraction(res);
      return { res, whole, absRem, decimal, cf, error: null as string | null };
    } catch {
      return { res: null, whole: 0n, absRem: 0n, decimal: NaN, cf: [] as bigint[], error: t('frac_invalid', 'Enter valid integers (denominator ≠ 0).') };
    }
  }, [n1, d1, n2, d2, op, t]);

  const decFrac = useMemo(() => decimalToExactFraction(decInput), [decInput]);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Divide className="w-5 h-5 text-indigo-400" />
          {t('tool_fraction_calc_title', 'Exact Fraction & Rational Calculator')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_fraction_calc_desc', 'Arbitrary-precision BigInt fraction arithmetic, mixed numbers, repeating decimal conversion, and continued fractions.')}
        </p>
      </div>

      {/* Exact Arithmetic */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('frac_exact_ops', 'Exact Rational Arithmetic')}
        </h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col items-center gap-1 w-28">
            <input type="text" value={n1} onChange={e => setN1(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-center text-sm text-white" />
            <div className="w-full h-0.5 bg-slate-600" />
            <input type="text" value={d1} onChange={e => setD1(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-center text-sm text-white" />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {(['+', '-', '*', '/'] as const).map(symbol => (
              <button
                key={symbol}
                type="button"
                onClick={() => setOp(symbol)}
                className={`w-9 h-9 rounded-lg font-mono font-bold text-sm ${
                  op === symbol ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {symbol === '*' ? '×' : symbol === '/' ? '÷' : symbol}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-1 w-28">
            <input type="text" value={n2} onChange={e => setN2(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-center text-sm text-white" />
            <div className="w-full h-0.5 bg-slate-600" />
            <input type="text" value={d2} onChange={e => setD2(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-center text-sm text-white" />
          </div>
        </div>

        {arithResult.error || !arithResult.res ? (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">{arithResult.error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('frac_simplified', 'Simplified Fraction')}</span>
              <span className="text-2xl font-bold font-mono text-indigo-300">
                {arithResult.res.n.toString()}/{arithResult.res.d.toString()}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('frac_mixed', 'Mixed Number')}</span>
              <span className="text-xl font-bold font-mono text-emerald-300">
                {arithResult.whole !== 0n && arithResult.absRem !== 0n
                  ? `${arithResult.whole.toString()} ${arithResult.absRem.toString()}/${arithResult.res.d.toString()}`
                  : arithResult.absRem === 0n
                    ? arithResult.whole.toString()
                    : `${arithResult.res.n.toString()}/${arithResult.res.d.toString()}`}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('frac_decimal', 'Decimal')}</span>
              <span className="text-xl font-bold font-mono text-white">
                {Number.isFinite(arithResult.decimal) ? arithResult.decimal.toPrecision(10) : '—'}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">{t('frac_continued', 'Continued Fraction')}</span>
              <span className="text-sm font-bold font-mono text-amber-300">
                [{arithResult.cf.map(x => x.toString()).join('; ')}]
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Repeating Decimal to Exact Fraction */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {t('frac_dec_converter', 'Decimal & Repeating Decimal → Exact Fraction')}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={decInput}
            onChange={e => setDecInput(e.target.value)}
            placeholder="0.1(6) or 2.375"
            className="w-64 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-indigo-300"
          />
          {['0.(3)', '0.1(6)', '0.(142857)', '3.14159265'].map(ex => (
            <button
              key={ex}
              type="button"
              onClick={() => setDecInput(ex)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 hover:border-indigo-500/50"
            >
              {ex}
            </button>
          ))}
        </div>
        {decFrac ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 block">{t('frac_exact_ratio', 'Exact Rational Value')}</span>
              <span className="text-2xl font-bold font-mono text-emerald-300">
                {decFrac.n.toString()} / {decFrac.d.toString()}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400">
              CF: [{continuedFraction(decFrac).map(x => x.toString()).join('; ')}]
            </div>
          </div>
        ) : (
          <div className="text-xs text-amber-300">
            {t('frac_dec_hint', 'Use parentheses for repeating digits, e.g. 0.(3) = 1/3 or 0.1(6) = 1/6.')}
          </div>
        )}
      </div>
    </div>
  );
};
