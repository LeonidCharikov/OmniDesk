import React, { useState, useId } from 'react';
import { Divide, Layers, Hash } from 'lucide-react';
import { useI18n } from '../../i18n/context';

export const CombinatoricsTool: React.FC = () => {
  const { t } = useI18n();
  const [n, setN] = useState<number>(6);
  const [k, setK] = useState<number>(3);
  const [withRepetition, setWithRepetition] = useState<boolean>(false);

  // Number theory inputs
  const [numA, setNumA] = useState<number>(144);
  const [numB, setNumB] = useState<number>(60);
  const [factorNum, setFactorNum] = useState<number>(360);

  const nInputId = useId();
  const kInputId = useId();
  const numAId = useId();
  const numBId = useId();
  const factorInputId = useId();

  // Helper BigInt factorial
  const bigFact = (num: number): bigint => {
    if (num < 0) return 0n;
    let res = 1n;
    for (let i = 2n; i <= BigInt(num); i++) res *= i;
    return res;
  };

  // Combinatorics
  let permutations = '0';
  let variations = '0';
  let combinations = '0';

  try {
    const bigN = BigInt(n);
    const bigK = BigInt(k);

    if (withRepetition) {
      variations = (bigN ** bigK).toLocaleString();
      combinations = (bigFact(n + k - 1) / (bigFact(k) * bigFact(n - 1))).toLocaleString();
      permutations = (bigN ** bigN).toLocaleString();
    } else {
      if (k <= n) {
        permutations = bigFact(n).toLocaleString();
        variations = (bigFact(n) / bigFact(n - k)).toLocaleString();
        combinations = (bigFact(n) / (bigFact(k) * bigFact(n - k))).toLocaleString();
      } else {
        variations = t('impossible_k_greater_n', 'Nelze (k > n)');
        combinations = t('impossible_k_greater_n', 'Nelze (k > n)');
        permutations = bigFact(n).toLocaleString();
      }
    }
  } catch {
    permutations = t('number_too_large', 'Příliš velké číslo');
    variations = t('number_too_large', 'Příliš velké číslo');
    combinations = t('number_too_large', 'Příliš velké číslo');
  }

  // GCD & LCM
  const gcd = (a: number, b: number): number => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  };

  const currentGcd = gcd(numA, numB);
  const currentLcm = numA && numB ? Math.abs(numA * numB) / currentGcd : 0;

  // Prime factorization
  const primeFactors = (val: number): { factors: number[]; isPrime: boolean } => {
    if (val < 2) return { factors: [], isPrime: false };
    const factors: number[] = [];
    let d = 2;
    let temp = val;
    while (temp >= d * d) {
      if (temp % d === 0) {
        factors.push(d);
        temp /= d;
      } else {
        d++;
      }
    }
    factors.push(temp);
    const isPrime = factors.length === 1 && factors[0] === val;
    return { factors, isPrime };
  };

  const factorResult = primeFactors(factorNum);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white">
          {t('tool_combinatorics_tool_title', 'Kombinatorika & Teorie Čísel')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('combinatorics_tool_desc', 'Permutace, kombinace, variace, Eukleidův algoritmus (NSD a NSN) a prvočíselný rozklad.')}
        </p>
      </div>

      {/* Part 1: Combinatorics */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            {t('combinatorics_counts', 'Kombinatorické počty: P(n), V(n, k), C(n, k)')}
          </span>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={withRepetition}
              onChange={e => setWithRepetition(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
            />
            <span>{t('with_repetition', 'S opakováním prvků')}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor={nInputId} className="text-xs text-slate-400 font-mono">
              {t('total_elements_n', 'Celkový počet prvků (n):')}
            </label>
            <input
              id={nInputId}
              type="number"
              min="0"
              max="100"
              value={n}
              onChange={e => setN(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-sm text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={kInputId} className="text-xs text-slate-400 font-mono">
              {t('subset_size_k', 'Velikost výběru / třída (k):')}
            </label>
            <input
              id={kInputId}
              type="number"
              min="0"
              max="100"
              value={k}
              onChange={e => setK(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono text-sm text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('combinations', 'Kombinace')} C({n}, {k})</span>
            <span className="text-lg font-bold font-mono text-indigo-400 block mt-1 break-all">
              {combinations}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{t('order_does_not_matter', 'Nezáleží na pořadí')}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('variations', 'Variace')} V({n}, {k})</span>
            <span className="text-lg font-bold font-mono text-white block mt-1 break-all">
              {variations}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{t('order_matters', 'Záleží na pořadí')}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('permutations', 'Permutace')} P({n}) = {n}!</span>
            <span className="text-lg font-bold font-mono text-amber-400 block mt-1 break-all">
              {permutations}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{t('all_possible_orders', 'Všechna možná pořadí')}</span>
          </div>
        </div>
      </div>

      {/* Part 2: GCD & LCM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Divide className="w-3.5 h-3.5" />
            {t('gcd_lcm_title', 'Dělitelnost: NSD (GCD) & NSN (LCM)')}
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={numAId} className="text-[11px] text-slate-400 font-mono">{t('number_a', 'Číslo A:')}</label>
              <input
                id={numAId}
                type="number"
                value={numA}
                onChange={e => setNumA(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-sm text-white"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={numBId} className="text-[11px] text-slate-400 font-mono">{t('number_b', 'Číslo B:')}</label>
              <input
                id={numBId}
                type="number"
                value={numB}
                onChange={e => setNumB(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">{t('greatest_common_divisor', 'Největší spol. dělitel (NSD)')}</span>
              <span className="text-lg font-mono font-bold text-emerald-400">{currentGcd}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">{t('least_common_multiple', 'Nejmenší spol. násobek (NSN)')}</span>
              <span className="text-lg font-mono font-bold text-indigo-300">{currentLcm}</span>
            </div>
          </div>
        </div>

        {/* Part 3: Prime Factorization */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            {t('prime_factorization_title', 'Prvočíselný rozklad & Test prvočíselnosti')}
          </span>

          <div className="space-y-1">
            <label htmlFor={factorInputId} className="text-[11px] text-slate-400 font-mono">
              {t('number_to_factor', 'Číslo k rozkladu:')}
            </label>
            <input
              id={factorInputId}
              type="number"
              min="2"
              max="999999999"
              value={factorNum}
              onChange={e => setFactorNum(Math.max(2, parseInt(e.target.value) || 2))}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-sm text-white"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{t('status', 'Status')}:</span>
              <span className={`font-mono font-semibold ${factorResult.isPrime ? 'text-emerald-400' : 'text-amber-400'}`}>
                {factorResult.isPrime ? t('is_prime_number', 'Číslo je PRVOČÍSLO') : t('is_composite_number', 'Složené číslo')}
              </span>
            </div>
            <div className="text-xs text-slate-400">{t('factorization', 'Rozklad')}:</div>
            <div className="p-2 rounded bg-slate-900/60 font-mono text-sm text-indigo-300 text-center border border-slate-800/80">
              {factorNum} = {factorResult.factors.join(' × ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
