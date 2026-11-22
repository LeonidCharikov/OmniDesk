import React, { useState, useId, useMemo } from 'react';
import { Divide, Layers, Hash, KeyRound } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  bigModPow,
  eulerTotient,
  extendedGcdBigInt,
  modInverseBigInt,
  solveChineseRemainder,
} from '../../utils/scienceMathExt.logic';

export const CombinatoricsTool: React.FC = () => {
  const { t } = useI18n();
  const [n, setN] = useState<number>(6);
  const [k, setK] = useState<number>(3);
  const [withRepetition, setWithRepetition] = useState<boolean>(false);

  // Number theory inputs
  const [numA, setNumA] = useState<number>(144);
  const [numB, setNumB] = useState<number>(60);
  const [factorNum, setFactorNum] = useState<number>(360);

  // Modular Arithmetic & CRT inputs
  const [modBase, setModBase] = useState('7');
  const [modExp, setModExp] = useState('128');
  const [modM, setModM] = useState('101');
  const [crtText, setCrtText] = useState('2 mod 3\n3 mod 5\n2 mod 7');

  const nInputId = useId();
  const kInputId = useId();
  const numAId = useId();
  const numBId = useId();
  const factorInputId = useId();

  const bigFact = (num: number): bigint => {
    if (num < 0) return 0n;
    let res = 1n;
    for (let i = 2n; i <= BigInt(num); i++) res *= i;
    return res;
  };

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
        variations = t('impossible_k_greater_n', 'N/A (k > n)');
        combinations = t('impossible_k_greater_n', 'N/A (k > n)');
        permutations = bigFact(n).toLocaleString();
      }
    }
  } catch {
    permutations = t('number_too_large', 'Number too large');
    variations = t('number_too_large', 'Number too large');
    combinations = t('number_too_large', 'Number too large');
  }

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
  const extGcd = useMemo(() => extendedGcdBigInt(BigInt(Math.trunc(numA)), BigInt(Math.trunc(numB))), [numA, numB]);

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
  const totientVal = useMemo(() => eulerTotient(factorNum), [factorNum]);

  const modResult = useMemo(() => {
    try {
      const b = BigInt(modBase.trim() || '0');
      const e = BigInt(modExp.trim() || '0');
      const m = BigInt(modM.trim() || '1');
      if (m <= 0n) return null;
      return {
        pow: bigModPow(b, e, m).toString(),
        inv: modInverseBigInt(b, m)?.toString() ?? null,
      };
    } catch {
      return null;
    }
  }, [modBase, modExp, modM]);

  const crtResult = useMemo(() => {
    const pairs: Array<{ remainder: bigint; modulus: bigint }> = [];
    for (const rawLine of crtText.split(/\r?\n/)) {
      const m = rawLine.trim().match(/^(-?\d+)\s*(?:mod|,|\s)\s*(\d+)$/i);
      if (!m) continue;
      try {
        pairs.push({ remainder: BigInt(m[1]), modulus: BigInt(m[2]) });
      } catch {
        // skip
      }
    }
    if (pairs.length === 0) return null;
    return solveChineseRemainder(pairs);
  }, [crtText]);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white">
          {t('tool_combinatorics_tool_title', 'Combinatorics & Modular Number Theory')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('combinatorics_tool_desc', 'Permutations, combinations, Extended GCD/LCM, prime factorization, Euler’s totient, modular exponentiation & Chinese Remainder Theorem.')}
        </p>
      </div>

      {/* Part 1: Combinatorics */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            {t('combinatorics_counts', 'Combinatorial Counts: P(n), V(n, k), C(n, k)')}
          </span>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={withRepetition}
              onChange={e => setWithRepetition(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
            />
            <span>{t('with_repetition', 'With repetition')}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor={nInputId} className="text-xs text-slate-400 font-mono">
              {t('total_elements_n', 'Total elements (n):')}
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
              {t('subset_size_k', 'Selection size (k):')}
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
            <span className="text-xs text-slate-400 block">{t('combinations', 'Combinations')} C({n}, {k})</span>
            <span className="text-lg font-bold font-mono text-indigo-400 block mt-1 break-all">{combinations}</span>
            <span className="text-[10px] text-slate-500 font-mono">{t('order_does_not_matter', 'Order does not matter')}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('variations', 'Variations')} V({n}, {k})</span>
            <span className="text-lg font-bold font-mono text-white block mt-1 break-all">{variations}</span>
            <span className="text-[10px] text-slate-500 font-mono">{t('order_matters', 'Order matters')}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-400 block">{t('permutations', 'Permutations')} P({n}) = {n}!</span>
            <span className="text-lg font-bold font-mono text-amber-400 block mt-1 break-all">{permutations}</span>
            <span className="text-[10px] text-slate-500 font-mono">{t('all_possible_orders', 'All possible orders')}</span>
          </div>
        </div>
      </div>

      {/* Part 2: Extended GCD/LCM & Prime Factorization / Totient */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Divide className="w-3.5 h-3.5" />
            {t('gcd_lcm_title', 'Divisibility: Extended GCD & LCM')}
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={numAId} className="text-[11px] text-slate-400 font-mono">{t('number_a', 'Number A:')}</label>
              <input id={numAId} type="number" value={numA} onChange={e => setNumA(parseInt(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-sm text-white" />
            </div>
            <div className="space-y-1">
              <label htmlFor={numBId} className="text-[11px] text-slate-400 font-mono">{t('number_b', 'Number B:')}</label>
              <input id={numBId} type="number" value={numB} onChange={e => setNumB(parseInt(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-sm text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">{t('greatest_common_divisor', 'GCD')}</span>
              <span className="text-lg font-mono font-bold text-emerald-400">{currentGcd}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase block">{t('least_common_multiple', 'LCM')}</span>
              <span className="text-lg font-mono font-bold text-indigo-300">{currentLcm}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
            {t('comb_bezout', 'Bézout Identity')}: ({extGcd.x.toString()})·{numA} + ({extGcd.y.toString()})·{numB} = {extGcd.gcd.toString()}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            {t('prime_factorization_title', 'Prime Factorization & Euler Totient φ(n)')}
          </span>

          <div className="space-y-1">
            <label htmlFor={factorInputId} className="text-[11px] text-slate-400 font-mono">{t('number_to_factor', 'Number to factor:')}</label>
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
                {factorResult.isPrime ? t('is_prime_number', 'PRIME number') : t('is_composite_number', 'Composite number')}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-900/60 font-mono text-sm text-indigo-300 text-center border border-slate-800/80">
              {factorNum} = {factorResult.factors.join(' × ')}
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">{t('comb_totient', 'Euler’s Totient φ(n)')}:</span>
              <span className="font-mono font-bold text-emerald-300">φ({factorNum}) = {totientVal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Part 3: Modular Exponentiation, Inverse & Chinese Remainder Theorem */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            {t('comb_mod_title', 'Modular Exponentiation & Inverse')}
          </span>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-[11px] text-slate-400 font-mono">
              Base (a)
              <input value={modBase} onChange={e => setModBase(e.target.value)} className="mt-1 w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white" />
            </label>
            <label className="text-[11px] text-slate-400 font-mono">
              Exp (e)
              <input value={modExp} onChange={e => setModExp(e.target.value)} className="mt-1 w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white" />
            </label>
            <label className="text-[11px] text-slate-400 font-mono">
              Mod (m)
              <input value={modM} onChange={e => setModM(e.target.value)} className="mt-1 w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white" />
            </label>
          </div>
          {modResult && (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">a^e mod m</span>
                <span className="text-base font-bold text-emerald-300 break-all">{modResult.pow}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">a⁻¹ mod m</span>
                <span className="text-base font-bold text-indigo-300 break-all">
                  {modResult.inv ?? t('comb_no_inv', 'No inverse (gcd ≠ 1)')}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            {t('comb_crt_title', 'Chinese Remainder Theorem (x ≡ r mod m)')}
          </span>
          <textarea
            rows={3}
            value={crtText}
            onChange={e => setCrtText(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white"
            placeholder="2 mod 3&#10;3 mod 5&#10;2 mod 7"
          />
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
            {crtResult?.valid ? (
              <span className="text-emerald-300 font-bold">
                x ≡ {crtResult.solution.toString()} (mod {crtResult.combinedModulus.toString()})
              </span>
            ) : (
              <span className="text-amber-300">{t('comb_crt_invalid', 'No solution or invalid congruences.')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
