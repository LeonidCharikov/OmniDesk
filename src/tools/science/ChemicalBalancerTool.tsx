import React, { useState, useMemo, useId } from 'react';
import { FlaskConical, Copy, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { ELEMENTS_BY_SYMBOL } from './periodicTableData';

function parseFormula(formula: string): Record<string, number> | null {
  const clean = formula.trim().replace(/\s+/g, '');
  if (!clean) return null;
  const stack: Array<Record<string, number>> = [{}];
  let i = 0;

  while (i < clean.length) {
    const ch = clean[i];
    if (ch === '(' || ch === '[') {
      stack.push({});
      i++;
    } else if (ch === ')' || ch === ']') {
      if (stack.length < 2) return null;
      i++;
      let numStr = '';
      while (i < clean.length && /\d/.test(clean[i])) numStr += clean[i++];
      const mult = numStr ? Number(numStr) : 1;
      const top = stack.pop()!;
      const cur = stack[stack.length - 1];
      for (const [el, cnt] of Object.entries(top)) {
        cur[el] = (cur[el] || 0) + cnt * mult;
      }
    } else if (/[A-Z]/.test(ch)) {
      let sym = ch;
      i++;
      while (i < clean.length && /[a-z]/.test(clean[i])) sym += clean[i++];
      if (!ELEMENTS_BY_SYMBOL[sym]) return null;
      let numStr = '';
      while (i < clean.length && /\d/.test(clean[i])) numStr += clean[i++];
      const cnt = numStr ? Number(numStr) : 1;
      const cur = stack[stack.length - 1];
      cur[sym] = (cur[sym] || 0) + cnt;
    } else {
      return null;
    }
  }

  return stack.length === 1 && Object.keys(stack[0]).length > 0 ? stack[0] : null;
}

function getMolarMass(counts: Record<string, number>): number {
  return Object.entries(counts).reduce((sum, [sym, cnt]) => sum + (ELEMENTS_BY_SYMBOL[sym]?.mass || 0) * cnt, 0);
}

// Exact BigInt rational arithmetic for chemical equation nullspace
interface Frac {
  n: bigint;
  d: bigint;
}

function gcdBig(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

function lcmBig(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  return (a / gcdBig(a, b)) * b;
}

function makeFrac(n: bigint, d = 1n): Frac {
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcdBig(n, d);
  return { n: n / g, d: d / g };
}

const subFrac = (a: Frac, b: Frac): Frac => makeFrac(a.n * b.d - b.n * a.d, a.d * b.d);
const mulFrac = (a: Frac, b: Frac): Frac => makeFrac(a.n * b.n, a.d * b.d);
const divFrac = (a: Frac, b: Frac): Frac => makeFrac(a.n * b.d, a.d * b.n);

function solveNullSpace(matrix: number[][]): number[] | null {
  const rows = matrix.length;
  const cols = matrix[0]?.length || 0;
  if (!rows || cols < 2) return null;

  const M: Frac[][] = matrix.map(r => r.map(v => makeFrac(BigInt(v))));
  let pivotRow = 0;
  const pivotCols: number[] = [];

  for (let col = 0; col < cols && pivotRow < rows; col++) {
    let sel = -1;
    for (let r = pivotRow; r < rows; r++) {
      if (M[r][col].n !== 0n) {
        sel = r;
        break;
      }
    }
    if (sel === -1) continue;

    [M[pivotRow], M[sel]] = [M[sel], M[pivotRow]];
    const pv = M[pivotRow][col];
    for (let c = col; c < cols; c++) M[pivotRow][c] = divFrac(M[pivotRow][c], pv);

    for (let r = 0; r < rows; r++) {
      if (r !== pivotRow && M[r][col].n !== 0n) {
        const factor = M[r][col];
        for (let c = col; c < cols; c++) {
          M[r][c] = subFrac(M[r][c], mulFrac(factor, M[pivotRow][c]));
        }
      }
    }
    pivotCols.push(col);
    pivotRow++;
  }

  const freeCols: number[] = [];
  for (let c = 0; c < cols; c++) {
    if (!pivotCols.includes(c)) freeCols.push(c);
  }
  if (freeCols.length !== 1) return null;

  const freeCol = freeCols[0];
  const vec: Frac[] = Array(cols).fill(makeFrac(0n));
  vec[freeCol] = makeFrac(1n);
  for (let i = 0; i < pivotCols.length; i++) {
    const pc = pivotCols[i];
    vec[pc] = makeFrac(-M[i][freeCol].n, M[i][freeCol].d);
  }

  let commonDen = 1n;
  for (const f of vec) commonDen = lcmBig(commonDen, f.d);
  let ints = vec.map(f => (f.n * commonDen) / f.d);
  if (ints[0] < 0n) ints = ints.map(x => -x);
  if (ints.some(x => x <= 0n)) return null;

  let g = ints[0];
  for (const x of ints.slice(1)) g = gcdBig(g, x);
  return ints.map(x => Number(x / g));
}

export const ChemicalBalancerTool: React.FC = () => {
  const { t } = useI18n();
  const [equation, setEquation] = useState('Fe + O2 -> Fe2O3');
  const [gramsByReactant, setGramsByReactant] = useState<Record<number, string>>({ 0: '10', 1: '10' });
  const [copied, setCopied] = useState(false);

  const eqId = useId();

  const solved = useMemo(() => {
    const arrow = equation.includes('->') ? '->' : equation.includes('=') ? '=' : null;
    if (!arrow) return null;
    const [leftStr, rightStr] = equation.split(arrow);
    if (!leftStr || !rightStr) return null;

    const cleanTerm = (s: string) => s.trim().replace(/^\d+\s*/, '');
    const leftTerms = leftStr.split('+').map(cleanTerm).filter(Boolean);
    const rightTerms = rightStr.split('+').map(cleanTerm).filter(Boolean);
    if (!leftTerms.length || !rightTerms.length) return null;

    const allParsed = [...leftTerms, ...rightTerms].map(parseFormula);
    if (allParsed.some(p => p === null)) return null;
    const parsed = allParsed as Array<Record<string, number>>;

    const elements = Array.from(new Set(parsed.flatMap(p => Object.keys(p))));
    const matrix: number[][] = elements.map(el =>
      parsed.map((term, idx) => {
        const cnt = term[el] || 0;
        return idx < leftTerms.length ? cnt : -cnt;
      })
    );

    const coeffs = solveNullSpace(matrix);
    if (!coeffs) return null;

    const formatSide = (terms: string[], offset: number) =>
      terms
        .map((term, i) => {
          const c = coeffs[offset + i];
          return c === 1 ? term : `${c} ${term}`;
        })
        .join(' + ');

    return {
      leftTerms,
      rightTerms,
      coeffs,
      parsed,
      masses: parsed.map(getMolarMass),
      formatted: `${formatSide(leftTerms, 0)} → ${formatSide(rightTerms, leftTerms.length)}`,
    };
  }, [equation]);

  const stoichiometry = useMemo(() => {
    if (!solved) return null;
    const extents: Array<{ idx: number; moles: number; extent: number }> = [];
    for (let i = 0; i < solved.leftTerms.length; i++) {
      const g = Number(gramsByReactant[i] ?? '');
      if (!Number.isFinite(g) || g <= 0 || solved.masses[i] <= 0) return null;
      const moles = g / solved.masses[i];
      extents.push({ idx: i, moles, extent: moles / solved.coeffs[i] });
    }
    if (!extents.length) return null;
    const minExtent = Math.min(...extents.map(e => e.extent));
    const limitingIdx = extents.find(e => e.extent === minExtent)?.idx ?? 0;
    const products = solved.rightTerms.map((term, i) => {
      const cIdx = solved.leftTerms.length + i;
      const moles = minExtent * solved.coeffs[cIdx];
      const grams = moles * solved.masses[cIdx];
      return { term, moles, grams };
    });
    return { limitingIdx, products };
  }, [solved, gramsByReactant]);

  const copyEq = () => {
    if (!solved) return;
    navigator.clipboard.writeText(solved.formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-indigo-400" />
            {t('tool_chemical_balancer_title', 'Chemical Equation Balancer & Stoichiometry')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_chemical_balancer_desc', 'Balance chemical reactions automatically and compute limiting reagents and theoretical product yields.')}
          </p>
        </div>

        {solved && (
          <button
            onClick={copyEq}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('copied', 'Copied') : t('copy', 'Copy')}
          </button>
        )}
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <label htmlFor={eqId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          {t('chem_bal_input_label', 'Unbalanced Equation (use -> or =)')}
        </label>
        <input
          id={eqId}
          type="text"
          value={equation}
          onChange={e => setEquation(e.target.value)}
          placeholder="Fe + O2 -> Fe2O3"
          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-base font-mono text-indigo-300 focus:outline-none"
        />

        <div className="flex flex-wrap gap-2">
          {[
            'Fe + O2 -> Fe2O3',
            'C3H8 + O2 -> CO2 + H2O',
            'Al + Fe2O3 -> Al2O3 + Fe',
            'Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O',
            'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2',
          ].map(ex => (
            <button
              key={ex}
              onClick={() => setEquation(ex)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-xs font-mono text-slate-300"
            >
              {ex}
            </button>
          ))}
        </div>

        {solved ? (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-700/50">
            <span className="text-[11px] text-emerald-400 uppercase font-semibold block mb-1">
              {t('chem_bal_balanced', 'Balanced Equation')}
            </span>
            <p className="text-lg sm:text-xl font-bold font-mono text-white">{solved.formatted}</p>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{t('chem_bal_invalid', 'Unable to balance equation. Verify element symbols (case-sensitive) and -> separator.')}</span>
          </div>
        )}
      </div>

      {/* Stoichiometry & Limiting Reagent */}
      {solved && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('chem_bal_stoich', 'Limiting Reagent & Theoretical Yield')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {solved.leftTerms.map((term, i) => (
              <div key={`${term}-${i}`} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-indigo-300">
                    {solved.coeffs[i]} × {term}
                  </span>
                  <span className="text-slate-500 font-mono">{solved.masses[i].toFixed(2)} g/mol</span>
                </div>
                <label className="block text-[11px] text-slate-400">
                  {t('chem_bal_mass_g', 'Available Mass (g)')}
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={gramsByReactant[i] ?? '10'}
                    onChange={e => setGramsByReactant({ ...gramsByReactant, [i]: e.target.value })}
                    className="mt-1 w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-200"
                  />
                </label>
                {stoichiometry && stoichiometry.limitingIdx === i && (
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                    {t('chem_bal_limiting', 'Limiting Reagent')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {stoichiometry && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
              {stoichiometry.products.map((prod, idx) => (
                <div key={`${prod.term}-${idx}`} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-mono text-emerald-300 font-semibold block">{prod.term}</span>
                  <span className="text-lg font-bold font-mono text-white block mt-1">{prod.grams.toFixed(3)} g</span>
                  <span className="text-[11px] font-mono text-slate-400">{prod.moles.toFixed(4)} mol</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
