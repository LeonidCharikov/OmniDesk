import { compileSafeMathExpression, evaluateSafeMathExpression } from './safeMathParser';

/* ============================================================================
   1. COMPLEX NUMBERS
   ============================================================================ */
export interface ComplexNum {
  re: number;
  im: number;
}

export function cAdd(a: ComplexNum, b: ComplexNum): ComplexNum {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function cSub(a: ComplexNum, b: ComplexNum): ComplexNum {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function cMul(a: ComplexNum, b: ComplexNum): ComplexNum {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

export function cDiv(a: ComplexNum, b: ComplexNum): ComplexNum {
  const denom = b.re * b.re + b.im * b.im;
  if (denom === 0) return { re: NaN, im: NaN };
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

export function cAbs(z: ComplexNum): number {
  return Math.hypot(z.re, z.im);
}

export function cArgRad(z: ComplexNum): number {
  return Math.atan2(z.im, z.re);
}

export function cPow(z: ComplexNum, n: number): ComplexNum {
  const r = cAbs(z);
  const theta = cArgRad(z);
  const rn = Math.pow(r, n);
  return { re: rn * Math.cos(n * theta), im: rn * Math.sin(n * theta) };
}

export function cNthRoots(z: ComplexNum, n: number): ComplexNum[] {
  const kCount = Math.max(1, Math.min(12, Math.floor(n)));
  const r = Math.pow(cAbs(z), 1 / kCount);
  const theta = cArgRad(z);
  const roots: ComplexNum[] = [];
  for (let k = 0; k < kCount; k++) {
    const angle = (theta + 2 * Math.PI * k) / kCount;
    roots.push({ re: r * Math.cos(angle), im: r * Math.sin(angle) });
  }
  return roots;
}

export function formatComplex(z: ComplexNum, digits = 4): string {
  const clean = (v: number) => (Math.abs(v) < 1e-10 ? 0 : Number(v.toFixed(digits)));
  const re = clean(z.re);
  const im = clean(z.im);
  if (!Number.isFinite(re) || !Number.isFinite(im)) return 'Undefined';
  if (im === 0) return `${re}`;
  if (re === 0) return `${im}i`;
  return `${re} ${im >= 0 ? '+' : '−'} ${Math.abs(im)}i`;
}

/* ============================================================================
   2. EQUATION & LINEAR SYSTEM SOLVER
   ============================================================================ */
export function solvePolynomialRoots(coeffsDesc: number[]): ComplexNum[] {
  // Trim leading zeros
  const c = [...coeffsDesc];
  while (c.length > 1 && Math.abs(c[0]) < 1e-12) c.shift();
  const deg = c.length - 1;
  if (deg <= 0) return [];
  if (deg === 1) return [{ re: -c[1] / c[0], im: 0 }];
  if (deg === 2) {
    const [a, b, d] = c;
    const disc = b * b - 4 * a * d;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      return [
        { re: (-b + s) / (2 * a), im: 0 },
        { re: (-b - s) / (2 * a), im: 0 },
      ];
    }
    const s = Math.sqrt(-disc);
    return [
      { re: -b / (2 * a), im: s / (2 * a) },
      { re: -b / (2 * a), im: -s / (2 * a) },
    ];
  }

  // Normalize to monic polynomial and run Durand-Kerner method
  const lead = c[0];
  const monic = c.map(v => v / lead);
  const evalPoly = (z: ComplexNum): ComplexNum => {
    let acc: ComplexNum = { re: monic[0], im: 0 };
    for (let i = 1; i < monic.length; i++) {
      acc = cAdd(cMul(acc, z), { re: monic[i], im: 0 });
    }
    return acc;
  };

  let roots: ComplexNum[] = Array.from({ length: deg }, (_, k) => {
    const angle = (2 * Math.PI * k) / deg + 0.12345;
    const radius = 1 + 0.2 * k;
    return { re: radius * Math.cos(angle), im: radius * Math.sin(angle) };
  });

  for (let iter = 0; iter < 150; iter++) {
    let maxDelta = 0;
    const nextRoots = [...roots];
    for (let i = 0; i < deg; i++) {
      let denom: ComplexNum = { re: 1, im: 0 };
      for (let j = 0; j < deg; j++) {
        if (i !== j) denom = cMul(denom, cSub(roots[i], roots[j]));
      }
      const delta = cDiv(evalPoly(roots[i]), denom);
      if (Number.isFinite(delta.re) && Number.isFinite(delta.im)) {
        nextRoots[i] = cSub(roots[i], delta);
        maxDelta = Math.max(maxDelta, cAbs(delta));
      }
    }
    roots = nextRoots;
    if (maxDelta < 1e-11) break;
  }

  return roots.map(r => ({
    re: Math.abs(r.re) < 1e-9 ? 0 : r.re,
    im: Math.abs(r.im) < 1e-7 ? 0 : r.im,
  }));
}

export interface LinearSystemResult {
  status: 'unique' | 'singular';
  solution: number[];
  steps: string[];
}

export function solveLinearSystem(matrixA: number[][], vectorB: number[]): LinearSystemResult {
  const n = matrixA.length;
  const aug = matrixA.map((row, i) => [...row.map(Number), Number(vectorB[i] ?? 0)]);
  const steps: string[] = [];

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[pivotRow][col])) pivotRow = r;
    }
    if (Math.abs(aug[pivotRow][col]) < 1e-12) {
      return { status: 'singular', solution: [], steps };
    }
    if (pivotRow !== col) {
      [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
      steps.push(`R${col + 1} ↔ R${pivotRow + 1}`);
    }
    const pivot = aug[col][col];
    if (Math.abs(pivot - 1) > 1e-12) {
      for (let j = col; j <= n; j++) aug[col][j] /= pivot;
      steps.push(`R${col + 1} ← R${col + 1} / ${Number(pivot.toFixed(4))}`);
    }
    for (let r = 0; r < n; r++) {
      if (r !== col && Math.abs(aug[r][col]) > 1e-12) {
        const factor = aug[r][col];
        for (let j = col; j <= n; j++) aug[r][j] -= factor * aug[col][j];
        steps.push(`R${r + 1} ← R${r + 1} − (${Number(factor.toFixed(4))})·R${col + 1}`);
      }
    }
  }

  return {
    status: 'unique',
    solution: aug.map(row => (Math.abs(row[n]) < 1e-12 ? 0 : row[n])),
    steps,
  };
}

export interface NumericRootResult {
  root: number | null;
  fx: number;
  iterations: number;
  method: string;
}

export function findNumericRoot(expr: string, a: number, b: number): NumericRootResult {
  const fn = compileSafeMathExpression(expr);
  let lo = Math.min(a, b);
  let hi = Math.max(a, b);
  let flo = fn(lo);
  let fhi = fn(hi);

  // If sign change exists, run bisection first then polish with Newton-Raphson
  if (Number.isFinite(flo) && Number.isFinite(fhi) && flo * fhi <= 0) {
    let mid = (lo + hi) / 2;
    for (let iter = 1; iter <= 60; iter++) {
      mid = (lo + hi) / 2;
      const fmid = fn(mid);
      if (!Number.isFinite(fmid)) break;
      if (Math.abs(fmid) < 1e-11 || Math.abs(hi - lo) < 1e-11) {
        return { root: mid, fx: fmid, iterations: iter, method: 'Bisection' };
      }
      if (flo * fmid <= 0) {
        hi = mid;
        fhi = fmid;
      } else {
        lo = mid;
        flo = fmid;
      }
    }
    return { root: mid, fx: fn(mid), iterations: 60, method: 'Bisection' };
  }

  // Otherwise run Newton-Raphson from midpoint
  let x = (lo + hi) / 2;
  const h = 1e-6;
  for (let iter = 1; iter <= 50; iter++) {
    const fx = fn(x);
    if (!Number.isFinite(fx)) return { root: null, fx: NaN, iterations: iter, method: 'Newton-Raphson' };
    if (Math.abs(fx) < 1e-10) return { root: x, fx, iterations: iter, method: 'Newton-Raphson' };
    const dfx = (fn(x + h) - fn(x - h)) / (2 * h);
    if (!Number.isFinite(dfx) || Math.abs(dfx) < 1e-12) break;
    x = x - fx / dfx;
  }
  const finalFx = fn(x);
  if (Number.isFinite(finalFx) && Math.abs(finalFx) < 1e-5) {
    return { root: x, fx: finalFx, iterations: 50, method: 'Newton-Raphson' };
  }
  return { root: null, fx: finalFx, iterations: 50, method: 'Newton-Raphson' };
}

/* ============================================================================
   3. CALCULUS WORKBENCH
   ============================================================================ */
export interface CalculusAnalysis {
  fx0: number;
  df1: number;
  df2: number;
  integral: number;
  limitLeft: number;
  limitRight: number;
  taylorCoeffs: number[]; // c_k = f^(k)(x0) / k!
}

export function analyzeCalculus(expr: string, x0: number, a: number, b: number, taylorDegree = 5): CalculusAnalysis {
  const fn = compileSafeMathExpression(expr);
  const h = 1e-4;
  const fx0 = fn(x0);
  const df1 = (fn(x0 + h) - fn(x0 - h)) / (2 * h);
  const df2 = (fn(x0 + h) - 2 * fx0 + fn(x0 - h)) / (h * h);

  // Composite Simpson's rule (n = 200 intervals)
  const n = 200;
  const step = (b - a) / n;
  let sum = fn(a) + fn(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * step;
    sum += (i % 2 === 0 ? 2 : 4) * fn(x);
  }
  const integral = (step / 3) * sum;

  const eps = 1e-6;
  const limitLeft = fn(x0 - eps);
  const limitRight = fn(x0 + eps);

  // Numerical Taylor coefficients via finite differences
  const deg = Math.max(1, Math.min(6, Math.floor(taylorDegree)));
  const taylorCoeffs: number[] = [];
  const dt = 0.02;
  let fact = 1;
  for (let k = 0; k <= deg; k++) {
    if (k > 0) fact *= k;
    let deriv = 0;
    // Central finite difference of order k
    let binom = 1;
    for (let j = 0; j <= k; j++) {
      if (j > 0) binom = (binom * (k - j + 1)) / j;
      const sign = j % 2 === 0 ? 1 : -1;
      const sample = fn(x0 + (k / 2 - j) * dt);
      deriv += sign * binom * sample;
    }
    deriv /= Math.pow(dt, k);
    taylorCoeffs.push(Number.isFinite(deriv) ? deriv / fact : 0);
  }

  return { fx0, df1, df2, integral, limitLeft, limitRight, taylorCoeffs };
}

export function evaluateTaylor(coeffs: number[], x0: number, x: number): number {
  const dx = x - x0;
  let sum = 0;
  let pow = 1;
  for (let i = 0; i < coeffs.length; i++) {
    sum += coeffs[i] * pow;
    pow *= dx;
  }
  return sum;
}

/* ============================================================================
   4. PROBABILITY DISTRIBUTIONS & HYPOTHESIS TESTING
   ============================================================================ */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax));
  return sign * y;
}

export function logGamma(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  const zm = z - 1;
  let x = p[0];
  for (let i = 1; i < g + 2; i++) x += p[i] / (zm + i);
  const t = zm + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zm + 0.5) * Math.log(t) - t + Math.log(x);
}

export function normalPdf(x: number, mean = 0, sd = 1): number {
  if (sd <= 0) return NaN;
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

export function normalCdf(x: number, mean = 0, sd = 1): number {
  if (sd <= 0) return NaN;
  return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
}

export function studentTPdf(tVal: number, df: number): number {
  if (df <= 0) return NaN;
  const coef = Math.exp(logGamma((df + 1) / 2) - logGamma(df / 2)) / Math.sqrt(df * Math.PI);
  return coef * Math.pow(1 + (tVal * tVal) / df, -(df + 1) / 2);
}

export function studentTCdf(tVal: number, df: number): number {
  if (df <= 0) return NaN;
  // Numeric Simpson integration from 0 to |t|
  const absT = Math.min(Math.abs(tVal), 40);
  const n = 200;
  const h = absT / n;
  let sum = studentTPdf(0, df) + studentTPdf(absT, df);
  for (let i = 1; i < n; i++) {
    sum += (i % 2 === 0 ? 2 : 4) * studentTPdf(i * h, df);
  }
  const area = (h / 3) * sum;
  return Math.min(1, Math.max(0, tVal >= 0 ? 0.5 + area : 0.5 - area));
}

export function chiSquarePdf(x: number, k: number): number {
  if (x <= 0 || k <= 0) return 0;
  const halfK = k / 2;
  return Math.exp((halfK - 1) * Math.log(x) - x / 2 - halfK * Math.log(2) - logGamma(halfK));
}

export function chiSquareCdf(x: number, k: number): number {
  if (x <= 0 || k <= 0) return 0;
  const n = 240;
  const h = x / n;
  let sum = chiSquarePdf(1e-9, k) + chiSquarePdf(x, k);
  for (let i = 1; i < n; i++) {
    sum += (i % 2 === 0 ? 2 : 4) * chiSquarePdf(i * h, k);
  }
  return Math.min(1, Math.max(0, (h / 3) * sum));
}

export function binomialPmf(k: number, n: number, p: number): number {
  if (k < 0 || k > n || p < 0 || p > 1) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  const logComb = logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  return Math.exp(logComb + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

export function binomialCdf(k: number, n: number, p: number): number {
  let sum = 0;
  for (let i = 0; i <= Math.min(n, Math.floor(k)); i++) sum += binomialPmf(i, n, p);
  return Math.min(1, sum);
}

export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || lambda <= 0) return 0;
  return Math.exp(k * Math.log(lambda) - lambda - logGamma(k + 1));
}

export function poissonCdf(k: number, lambda: number): number {
  let sum = 0;
  for (let i = 0; i <= Math.floor(k); i++) sum += poissonPmf(i, lambda);
  return Math.min(1, sum);
}

export interface AbTestResult {
  rateA: number;
  rateB: number;
  liftPercent: number;
  zScore: number;
  pValueTwoSided: number;
  significant95: boolean;
}

export function runAbProportionTest(convA: number, nA: number, convB: number, nB: number): AbTestResult {
  const rateA = nA > 0 ? convA / nA : 0;
  const rateB = nB > 0 ? convB / nB : 0;
  const pooled = nA + nB > 0 ? (convA + convB) / (nA + nB) : 0;
  const se = Math.sqrt(Math.max(1e-12, pooled * (1 - pooled) * (1 / Math.max(1, nA) + 1 / Math.max(1, nB))));
  const zScore = (rateB - rateA) / se;
  const pValueTwoSided = 2 * (1 - normalCdf(Math.abs(zScore)));
  const liftPercent = rateA > 0 ? ((rateB - rateA) / rateA) * 100 : 0;
  return { rateA, rateB, liftPercent, zScore, pValueTwoSided, significant95: pValueTwoSided < 0.05 };
}

/* ============================================================================
   5. REGRESSION & CURVE FITTING
   ============================================================================ */
export type FitModelType = 'linear' | 'poly2' | 'poly3' | 'exponential' | 'logarithmic' | 'power';

export interface DataPoint2D {
  x: number;
  y: number;
}

export interface CurveFitResult {
  formula: string;
  rSquared: number;
  rmse: number;
  predict: (x: number) => number;
  residuals: number[];
}

export function parseXyPoints(raw: string): DataPoint2D[] {
  const points: DataPoint2D[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[,\t;\s]+/).map(Number);
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      points.push({ x: parts[0], y: parts[1] });
    }
  }
  return points;
}

function fitPolynomialCoeffs(xs: number[], ys: number[], degree: number): number[] {
  const m = degree + 1;
  const A: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
  const B: number[] = Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      A[i][j] = xs.reduce((acc, x) => acc + Math.pow(x, i + j), 0);
    }
    B[i] = xs.reduce((acc, x, idx) => acc + ys[idx] * Math.pow(x, i), 0);
  }
  const solved = solveLinearSystem(A, B);
  return solved.status === 'unique' ? solved.solution : Array(m).fill(0);
}

export function fitCurve(points: DataPoint2D[], model: FitModelType): CurveFitResult | null {
  if (points.length < 2) return null;
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  let predict: (x: number) => number;
  let formula = '';

  if (model === 'linear' || model === 'poly2' || model === 'poly3') {
    const deg = model === 'linear' ? 1 : model === 'poly2' ? 2 : 3;
    if (points.length <= deg) return null;
    const c = fitPolynomialCoeffs(xs, ys, deg);
    predict = (x: number) => c.reduce((sum, coef, p) => sum + coef * Math.pow(x, p), 0);
    formula = c
      .map((coef, p) => {
        const val = Number(coef.toFixed(4));
        if (p === 0) return `${val}`;
        if (p === 1) return `${val >= 0 ? '+ ' : '− '}${Math.abs(val)}x`;
        return `${val >= 0 ? '+ ' : '− '}${Math.abs(val)}x^${p}`;
      })
      .join(' ');
  } else if (model === 'exponential') {
    const pos = points.filter(p => p.y > 0);
    if (pos.length < 2) return null;
    const [lnA, b] = fitPolynomialCoeffs(
      pos.map(p => p.x),
      pos.map(p => Math.log(p.y)),
      1
    );
    const a = Math.exp(lnA);
    predict = (x: number) => a * Math.exp(b * x);
    formula = `${a.toFixed(4)} · e^(${b.toFixed(4)}x)`;
  } else if (model === 'logarithmic') {
    const pos = points.filter(p => p.x > 0);
    if (pos.length < 2) return null;
    const [a, b] = fitPolynomialCoeffs(
      pos.map(p => Math.log(p.x)),
      pos.map(p => p.y),
      1
    );
    predict = (x: number) => (x > 0 ? a + b * Math.log(x) : NaN);
    formula = `${a.toFixed(4)} ${b >= 0 ? '+' : '−'} ${Math.abs(b).toFixed(4)}·ln(x)`;
  } else {
    const pos = points.filter(p => p.x > 0 && p.y > 0);
    if (pos.length < 2) return null;
    const [lnA, b] = fitPolynomialCoeffs(
      pos.map(p => Math.log(p.x)),
      pos.map(p => Math.log(p.y)),
      1
    );
    const a = Math.exp(lnA);
    predict = (x: number) => (x > 0 ? a * Math.pow(x, b) : NaN);
    formula = `${a.toFixed(4)} · x^(${b.toFixed(4)})`;
  }

  const meanY = ys.reduce((acc, y) => acc + y, 0) / ys.length;
  const residuals = points.map(p => p.y - predict(p.x));
  const ssRes = residuals.reduce((acc, r) => acc + (Number.isFinite(r) ? r * r : 0), 0);
  const ssTot = ys.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;
  const rmse = Math.sqrt(ssRes / points.length);

  return { formula, rSquared, rmse, predict, residuals };
}

/* ============================================================================
   6. VECTORS & 3D GEOMETRY
   ============================================================================ */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface VectorAnalysis {
  sum: Vec3;
  diff: Vec3;
  magA: number;
  magB: number;
  unitA: Vec3;
  dot: number;
  cross: Vec3;
  angleDeg: number;
  projAonB: Vec3;
  distance: number;
}

export function analyzeVectors(a: Vec3, b: Vec3): VectorAnalysis {
  const sum = { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  const diff = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const magA = Math.hypot(a.x, a.y, a.z);
  const magB = Math.hypot(b.x, b.y, b.z);
  const unitA = magA > 0 ? { x: a.x / magA, y: a.y / magA, z: a.z / magA } : { x: 0, y: 0, z: 0 };
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  const cross = {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
  const cosTheta = magA > 0 && magB > 0 ? Math.max(-1, Math.min(1, dot / (magA * magB))) : 1;
  const angleDeg = (Math.acos(cosTheta) * 180) / Math.PI;
  const bSq = magB * magB;
  const scale = bSq > 0 ? dot / bSq : 0;
  const projAonB = { x: b.x * scale, y: b.y * scale, z: b.z * scale };
  const distance = Math.hypot(diff.x, diff.y, diff.z);
  return { sum, diff, magA, magB, unitA, dot, cross, angleDeg, projAonB, distance };
}

export function planeFromThreePoints(p1: Vec3, p2: Vec3, p3: Vec3): { normal: Vec3; d: number; valid: boolean } {
  const u = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
  const v = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };
  const normal = {
    x: u.y * v.z - u.z * v.y,
    y: u.z * v.x - u.x * v.z,
    z: u.x * v.y - u.y * v.x,
  };
  const mag = Math.hypot(normal.x, normal.y, normal.z);
  const d = normal.x * p1.x + normal.y * p1.y + normal.z * p1.z;
  return { normal, d, valid: mag > 1e-9 };
}

/* ============================================================================
   7. GEOMETRY & TRIGONOMETRY SOLVER
   ============================================================================ */
export type TriangleMode = 'SSS' | 'SAS' | 'ASA' | 'AAS';

export interface TriangleSolution {
  valid: boolean;
  a: number;
  b: number;
  c: number;
  A: number;
  B: number;
  C: number;
  area: number;
  perimeter: number;
  inradius: number;
  circumradius: number;
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function solveTriangle(mode: TriangleMode, v1: number, v2: number, v3: number): TriangleSolution {
  const invalid: TriangleSolution = {
    valid: false,
    a: 0,
    b: 0,
    c: 0,
    A: 0,
    B: 0,
    C: 0,
    area: 0,
    perimeter: 0,
    inradius: 0,
    circumradius: 0,
  };
  if (v1 <= 0 || v2 <= 0 || v3 <= 0) return invalid;

  let a = 0;
  let b = 0;
  let c = 0;
  let A = 0;
  let B = 0;
  let C = 0;

  if (mode === 'SSS') {
    a = v1;
    b = v2;
    c = v3;
    if (a + b <= c || a + c <= b || b + c <= a) return invalid;
    A = Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / (2 * b * c)))) * RAD2DEG;
    B = Math.acos(Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c)))) * RAD2DEG;
    C = 180 - A - B;
  } else if (mode === 'SAS') {
    // v1 = a, v2 = angle C (deg), v3 = b
    a = v1;
    C = v2;
    b = v3;
    if (C >= 180) return invalid;
    c = Math.sqrt(Math.max(0, a * a + b * b - 2 * a * b * Math.cos(C * DEG2RAD)));
    if (c <= 0) return invalid;
    A = Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / (2 * b * c)))) * RAD2DEG;
    B = 180 - A - C;
  } else if (mode === 'ASA') {
    // v1 = angle A, v2 = side c, v3 = angle B
    A = v1;
    c = v2;
    B = v3;
    C = 180 - A - B;
    if (C <= 0) return invalid;
    const ratio = c / Math.sin(C * DEG2RAD);
    a = ratio * Math.sin(A * DEG2RAD);
    b = ratio * Math.sin(B * DEG2RAD);
  } else {
    // AAS: v1 = angle A, v2 = angle B, v3 = side a
    A = v1;
    B = v2;
    a = v3;
    C = 180 - A - B;
    if (C <= 0) return invalid;
    const ratio = a / Math.sin(A * DEG2RAD);
    b = ratio * Math.sin(B * DEG2RAD);
    c = ratio * Math.sin(C * DEG2RAD);
  }

  const perimeter = a + b + c;
  const s = perimeter / 2;
  const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
  const inradius = perimeter > 0 ? (2 * area) / perimeter : 0;
  const circumradius = area > 0 ? (a * b * c) / (4 * area) : 0;

  return { valid: true, a, b, c, A, B, C, area, perimeter, inradius, circumradius };
}

/* ============================================================================
   8. EXACT BIGINT FRACTION CALCULATOR
   ============================================================================ */
export interface BigFraction {
  n: bigint;
  d: bigint;
}

export function gcdBigInt(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const r = x % y;
    x = y;
    y = r;
  }
  return x === 0n ? 1n : x;
}

export function normalizeFraction(n: bigint, d: bigint): BigFraction {
  if (d === 0n) throw new Error('Division by zero');
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcdBigInt(n, d);
  return { n: n / g, d: d / g };
}

export function operateFractions(
  a: BigFraction,
  b: BigFraction,
  op: '+' | '-' | '*' | '/'
): BigFraction {
  if (op === '+') return normalizeFraction(a.n * b.d + b.n * a.d, a.d * b.d);
  if (op === '-') return normalizeFraction(a.n * b.d - b.n * a.d, a.d * b.d);
  if (op === '*') return normalizeFraction(a.n * b.n, a.d * b.d);
  return normalizeFraction(a.n * b.d, a.d * b.n);
}

export function decimalToExactFraction(input: string): BigFraction | null {
  const cleaned = input.trim();
  if (!cleaned) return null;
  const neg = cleaned.startsWith('-');
  const body = neg || cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;

  // Repeating decimal syntax like 0.(3) or 1.2(34)
  const repMatch = /^(\d*)(?:\.(\d*)\((\d+)\))?$/.exec(body);
  if (repMatch && repMatch[3]) {
    const intPart = repMatch[1] || '0';
    const nonRep = repMatch[2] || '';
    const rep = repMatch[3];
    const allDigits = BigInt(intPart + nonRep + rep);
    const nonRepDigits = BigInt(intPart + nonRep);
    const denom = BigInt('9'.repeat(rep.length) + '0'.repeat(nonRep.length));
    const num = allDigits - nonRepDigits;
    return normalizeFraction(neg ? -num : num, denom);
  }

  if (!/^\d+(\.\d+)?$/.test(body)) return null;
  const [intStr, fracStr = ''] = body.split('.');
  const denom = 10n ** BigInt(fracStr.length);
  const num = BigInt(intStr) * denom + (fracStr ? BigInt(fracStr) : 0n);
  return normalizeFraction(neg ? -num : num, denom);
}

export function continuedFraction(f: BigFraction, maxTerms = 12): bigint[] {
  const terms: bigint[] = [];
  let num = f.n;
  let den = f.d;
  for (let i = 0; i < maxTerms && den !== 0n; i++) {
    let q = num / den;
    let r = num % den;
    if (r < 0n) {
      q -= 1n;
      r += den;
    }
    terms.push(q);
    num = den;
    den = r;
  }
  return terms;
}

/* ============================================================================
   9. BOOLEAN ALGEBRA & TRUTH TABLE ENGINE
   ============================================================================ */
type BoolToken =
  | { type: 'var'; name: string }
  | { type: 'const'; val: boolean }
  | { type: 'op'; op: 'NOT' | 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'IMP' | 'IFF' }
  | { type: 'lparen' }
  | { type: 'rparen' };

function tokenizeBoolean(expr: string): BoolToken[] {
  const tokens: BoolToken[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }
    if (expr.slice(i, i + 3) === '<->') {
      tokens.push({ type: 'op', op: 'IFF' });
      i += 3;
      continue;
    }
    if (expr.slice(i, i + 2) === '->') {
      tokens.push({ type: 'op', op: 'IMP' });
      i += 2;
      continue;
    }
    if (ch === '!' || ch === '~' || ch === '¬') {
      tokens.push({ type: 'op', op: 'NOT' });
      i++;
      continue;
    }
    if (ch === '&' || ch === '*' || ch === '∧') {
      tokens.push({ type: 'op', op: 'AND' });
      i += expr[i + 1] === '&' ? 2 : 1;
      continue;
    }
    if (ch === '|' || ch === '+' || ch === '∨') {
      tokens.push({ type: 'op', op: 'OR' });
      i += expr[i + 1] === '|' ? 2 : 1;
      continue;
    }
    if (ch === '^' || ch === '⊕') {
      tokens.push({ type: 'op', op: 'XOR' });
      i++;
      continue;
    }
    if (ch === '0' || ch === '1') {
      tokens.push({ type: 'const', val: ch === '1' });
      i++;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let start = i;
      while (i < expr.length && /[A-Za-z0-9]/.test(expr[i])) i++;
      const word = expr.slice(start, i).toUpperCase();
      if (word === 'AND') tokens.push({ type: 'op', op: 'AND' });
      else if (word === 'OR') tokens.push({ type: 'op', op: 'OR' });
      else if (word === 'NOT') tokens.push({ type: 'op', op: 'NOT' });
      else if (word === 'XOR') tokens.push({ type: 'op', op: 'XOR' });
      else if (word === 'NAND') tokens.push({ type: 'op', op: 'NAND' });
      else if (word === 'NOR') tokens.push({ type: 'op', op: 'NOR' });
      else if (word === 'TRUE') tokens.push({ type: 'const', val: true });
      else if (word === 'FALSE') tokens.push({ type: 'const', val: false });
      else tokens.push({ type: 'var', name: word });
      continue;
    }
    throw new Error(`Unexpected token "${ch}"`);
  }
  return tokens;
}

class BoolParser {
  private pos = 0;
  constructor(private readonly tokens: BoolToken[], private readonly env: Record<string, boolean>) {}

  parse(): boolean {
    const res = this.parseIff();
    if (this.pos < this.tokens.length) throw new Error('Unexpected trailing token');
    return res;
  }

  private peek() {
    return this.tokens[this.pos];
  }

  private parseIff(): boolean {
    let left = this.parseImp();
    while (this.peek()?.type === 'op' && (this.peek() as { op: string }).op === 'IFF') {
      this.pos++;
      const right = this.parseImp();
      left = left === right;
    }
    return left;
  }

  private parseImp(): boolean {
    let left = this.parseOr();
    while (this.peek()?.type === 'op' && (this.peek() as { op: string }).op === 'IMP') {
      this.pos++;
      const right = this.parseOr();
      left = !left || right;
    }
    return left;
  }

  private parseOr(): boolean {
    let left = this.parseXor();
    while (
      this.peek()?.type === 'op' &&
      ((this.peek() as { op: string }).op === 'OR' || (this.peek() as { op: string }).op === 'NOR')
    ) {
      const op = (this.peek() as { op: 'OR' | 'NOR' }).op;
      this.pos++;
      const right = this.parseXor();
      left = op === 'OR' ? left || right : !(left || right);
    }
    return left;
  }

  private parseXor(): boolean {
    let left = this.parseAnd();
    while (this.peek()?.type === 'op' && (this.peek() as { op: string }).op === 'XOR') {
      this.pos++;
      const right = this.parseAnd();
      left = left !== right;
    }
    return left;
  }

  private parseAnd(): boolean {
    let left = this.parseNot();
    while (
      this.peek()?.type === 'op' &&
      ((this.peek() as { op: string }).op === 'AND' || (this.peek() as { op: string }).op === 'NAND')
    ) {
      const op = (this.peek() as { op: 'AND' | 'NAND' }).op;
      this.pos++;
      const right = this.parseNot();
      left = op === 'AND' ? left && right : !(left && right);
    }
    return left;
  }

  private parseNot(): boolean {
    if (this.peek()?.type === 'op' && (this.peek() as { op: string }).op === 'NOT') {
      this.pos++;
      return !this.parseNot();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): boolean {
    const tok = this.peek();
    if (!tok) throw new Error('Unexpected end of expression');
    if (tok.type === 'const') {
      this.pos++;
      return tok.val;
    }
    if (tok.type === 'var') {
      this.pos++;
      return Boolean(this.env[tok.name]);
    }
    if (tok.type === 'lparen') {
      this.pos++;
      const val = this.parseIff();
      if (this.peek()?.type !== 'rparen') throw new Error('Missing closing parenthesis');
      this.pos++;
      return val;
    }
    throw new Error('Invalid boolean syntax');
  }
}

export interface TruthTableRow {
  inputs: Record<string, boolean>;
  output: boolean;
  index: number;
}

export interface BooleanAnalysis {
  variables: string[];
  rows: TruthTableRow[];
  minterms: number[];
  maxterms: number[];
  canonicalSop: string;
  canonicalPos: string;
  simplifiedSop: string;
}

function simplifyQuineMcCluskey(vars: string[], minterms: number[]): string {
  const n = vars.length;
  if (minterms.length === 0) return '0';
  if (minterms.length === 1 << n) return '1';

  interface Implicant {
    bits: string;
    covers: number[];
    combined: boolean;
  }

  let current: Implicant[] = minterms.map(m => ({
    bits: m.toString(2).padStart(n, '0'),
    covers: [m],
    combined: false,
  }));

  const primes: Implicant[] = [];

  while (current.length > 0) {
    const nextMap = new Map<string, Implicant>();
    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        let diffs = 0;
        let merged = '';
        for (let b = 0; b < n; b++) {
          if (current[i].bits[b] === current[j].bits[b]) {
            merged += current[i].bits[b];
          } else {
            diffs++;
            merged += '-';
          }
        }
        if (diffs === 1) {
          current[i].combined = true;
          current[j].combined = true;
          if (!nextMap.has(merged)) {
            const covers = Array.from(new Set([...current[i].covers, ...current[j].covers])).sort((a, b) => a - b);
            nextMap.set(merged, { bits: merged, covers, combined: false });
          }
        }
      }
    }
    for (const imp of current) {
      if (!imp.combined && !primes.some(p => p.bits === imp.bits)) {
        primes.push(imp);
      }
    }
    current = Array.from(nextMap.values());
  }

  // Greedy essential cover
  const remaining = new Set(minterms);
  const chosen: Implicant[] = [];
  while (remaining.size > 0) {
    let best: Implicant | null = null;
    let bestCount = 0;
    for (const p of primes) {
      const count = p.covers.filter(m => remaining.has(m)).length;
      if (count > bestCount) {
        bestCount = count;
        best = p;
      }
    }
    if (!best) break;
    chosen.push(best);
    for (const m of best.covers) remaining.delete(m);
  }

  return chosen
    .map(imp => {
      const literals: string[] = [];
      for (let i = 0; i < n; i++) {
        if (imp.bits[i] === '1') literals.push(vars[i]);
        else if (imp.bits[i] === '0') literals.push(`¬${vars[i]}`);
      }
      return literals.length ? literals.join('·') : '1';
    })
    .join(' + ');
}

export function analyzeBooleanExpression(expr: string): BooleanAnalysis {
  const tokens = tokenizeBoolean(expr);
  const variables = Array.from(
    new Set(tokens.filter((t): t is { type: 'var'; name: string } => t.type === 'var').map(t => t.name))
  )
    .sort()
    .slice(0, 4);

  const rowCount = 1 << variables.length;
  const rows: TruthTableRow[] = [];
  const minterms: number[] = [];
  const maxterms: number[] = [];

  for (let idx = 0; idx < rowCount; idx++) {
    const inputs: Record<string, boolean> = {};
    for (let v = 0; v < variables.length; v++) {
      inputs[variables[v]] = Boolean((idx >> (variables.length - 1 - v)) & 1);
    }
    const output = new BoolParser(tokens, inputs).parse();
    rows.push({ inputs, output, index: idx });
    if (output) minterms.push(idx);
    else maxterms.push(idx);
  }

  const canonicalSop =
    minterms.length === 0
      ? '0'
      : minterms
          .map(idx =>
            variables.map((v, i) => (((idx >> (variables.length - 1 - i)) & 1) ? v : `¬${v}`)).join('·')
          )
          .join(' + ');

  const canonicalPos =
    maxterms.length === 0
      ? '1'
      : maxterms
          .map(
            idx =>
              `(${variables
                .map((v, i) => (((idx >> (variables.length - 1 - i)) & 1) ? `¬${v}` : v))
                .join(' + ')})`
          )
          .join('·');

  const simplifiedSop = simplifyQuineMcCluskey(variables, minterms);

  return { variables, rows, minterms, maxterms, canonicalSop, canonicalPos, simplifiedSop };
}

/* ============================================================================
   10. UNIT-AWARE FORMULA SCRATCHPAD
   ============================================================================ */
interface UnitDef {
  dim: 'length' | 'mass' | 'time' | 'speed' | 'data';
  factor: number; // to base unit (m, kg, s, m/s, B)
}

const UNIT_TABLE: Record<string, UnitDef> = {
  mm: { dim: 'length', factor: 0.001 },
  cm: { dim: 'length', factor: 0.01 },
  m: { dim: 'length', factor: 1 },
  km: { dim: 'length', factor: 1000 },
  in: { dim: 'length', factor: 0.0254 },
  ft: { dim: 'length', factor: 0.3048 },
  mi: { dim: 'length', factor: 1609.344 },
  mg: { dim: 'mass', factor: 1e-6 },
  g: { dim: 'mass', factor: 0.001 },
  kg: { dim: 'mass', factor: 1 },
  lb: { dim: 'mass', factor: 0.45359237 },
  oz: { dim: 'mass', factor: 0.028349523125 },
  ms: { dim: 'time', factor: 0.001 },
  s: { dim: 'time', factor: 1 },
  sec: { dim: 'time', factor: 1 },
  min: { dim: 'time', factor: 60 },
  h: { dim: 'time', factor: 3600 },
  hr: { dim: 'time', factor: 3600 },
  day: { dim: 'time', factor: 86400 },
  'm/s': { dim: 'speed', factor: 1 },
  'km/h': { dim: 'speed', factor: 1 / 3.6 },
  mph: { dim: 'speed', factor: 0.44704 },
  kb: { dim: 'data', factor: 1024 },
  mb: { dim: 'data', factor: 1024 ** 2 },
  gb: { dim: 'data', factor: 1024 ** 3 },
};

export interface ScratchpadLineResult {
  lineNumber: number;
  raw: string;
  variable?: string;
  value?: number;
  unit?: string;
  formatted: string;
  error?: string;
}

export function evaluateFormulaPad(text: string): ScratchpadLineResult[] {
  const vars: Record<string, { value: number; unit?: string }> = {};
  const results: ScratchpadLineResult[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      results.push({ lineNumber: i + 1, raw, formatted: '' });
      continue;
    }

    try {
      let varName: string | undefined;
      let exprPart = trimmed;

      const assignMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/.exec(trimmed);
      if (assignMatch) {
        varName = assignMatch[1];
        exprPart = assignMatch[2].trim();
      }

      // Check optional trailing "in <targetUnit>" conversion
      let targetUnit: string | undefined;
      const inMatch = /^(.+?)\s+(?:in|to)\s+([a-zA-Z/]+)$/.exec(exprPart);
      if (inMatch && UNIT_TABLE[inMatch[2].toLowerCase()]) {
        exprPart = inMatch[1].trim();
        targetUnit = inMatch[2].toLowerCase();
      }

      // Handle simple "X <lenUnit> / Y <timeUnit>" speed detection
      let inferredDim: UnitDef['dim'] | undefined;
      const speedMatch = /^([0-9.]+)\s*(km|m|mi|ft|cm|mm)\s*\/\s*([0-9.]+)\s*(h|hr|min|s|sec|day)$/i.exec(exprPart);
      if (speedMatch) {
        const dist = Number(speedMatch[1]) * UNIT_TABLE[speedMatch[2].toLowerCase()].factor;
        const time = Number(speedMatch[3]) * UNIT_TABLE[speedMatch[4].toLowerCase()].factor;
        const baseSpeed = dist / time;
        inferredDim = 'speed';
        const outUnit = targetUnit && UNIT_TABLE[targetUnit]?.dim === 'speed' ? targetUnit : 'm/s';
        const finalVal = baseSpeed / UNIT_TABLE[outUnit].factor;
        if (varName) vars[varName] = { value: finalVal, unit: outUnit };
        results.push({
          lineNumber: i + 1,
          raw,
          variable: varName,
          value: finalVal,
          unit: outUnit,
          formatted: `${Number(finalVal.toFixed(6))} ${outUnit}`,
        });
        continue;
      }

      // Substitute known unit literals like "5 km" -> "(5 * 1000)"
      let processed = exprPart.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
      processed = processed.replace(
        /\b(\d+(?:\.\d+)?)\s*(km\/h|m\/s|mph|mm|cm|km|mi|ft|mg|kg|lb|oz|ms|sec|min|hr|day|kb|mb|gb|m|g|s|h)\b/gi,
        (_m, numStr: string, uStr: string) => {
          const def = UNIT_TABLE[uStr.toLowerCase()];
          if (!def) return _m;
          if (!inferredDim) inferredDim = def.dim;
          return `(${numStr}*${def.factor})`;
        }
      );

      // Substitute previously defined variables (longest name first)
      const varNames = Object.keys(vars).sort((a, b) => b.length - a.length);
      for (const name of varNames) {
        const re = new RegExp(`\\b${name}\\b`, 'g');
        if (re.test(processed)) {
          const v = vars[name];
          const unitDef = v.unit ? UNIT_TABLE[v.unit] : undefined;
          const numeric = unitDef ? v.value * unitDef.factor : v.value;
          if (unitDef && !inferredDim) inferredDim = unitDef.dim;
          processed = processed.replace(re, `(${numeric})`);
        }
      }

      const baseVal = evaluateSafeMathExpression(processed);
      if (!Number.isFinite(baseVal)) {
        throw new Error('Invalid expression');
      }

      let outVal = baseVal;
      let outUnit: string | undefined;
      if (targetUnit && UNIT_TABLE[targetUnit]) {
        const targetDef = UNIT_TABLE[targetUnit];
        if (!inferredDim || targetDef.dim === inferredDim) {
          outVal = baseVal / targetDef.factor;
          outUnit = targetUnit;
        }
      } else if (inferredDim) {
        outUnit =
          inferredDim === 'length'
            ? 'm'
            : inferredDim === 'mass'
              ? 'kg'
              : inferredDim === 'time'
                ? 's'
                : inferredDim === 'speed'
                  ? 'm/s'
                  : 'B';
      }

      if (varName) vars[varName] = { value: outVal, unit: outUnit };
      const formattedNum = Number.isInteger(outVal) ? String(outVal) : Number(outVal.toFixed(6)).toString();
      results.push({
        lineNumber: i + 1,
        raw,
        variable: varName,
        value: outVal,
        unit: outUnit,
        formatted: outUnit ? `${formattedNum} ${outUnit}` : formattedNum,
      });
    } catch {
      results.push({ lineNumber: i + 1, raw, formatted: '', error: 'Syntax error' });
    }
  }

  return results;
}

/* ============================================================================
   11. ERROR PROPAGATION & SIGNIFICANT FIGURES
   ============================================================================ */
export function countSignificantFigures(numStr: string): number {
  const s = numStr.trim().replace(/^[+-]/, '').split(/[eE]/)[0];
  if (!/^\d*\.?\d+$/.test(s)) return 0;
  if (s.includes('.')) {
    const stripped = s.replace('.', '').replace(/^0+/, '');
    return stripped.length;
  }
  const stripped = s.replace(/^0+/, '').replace(/0+$/, '');
  return stripped.length || (s.includes('0') ? 1 : 0);
}

export interface UncertainVar {
  name: string;
  value: number;
  uncertainty: number;
}

export interface ErrorPropagationResult {
  value: number;
  uncertainty: number;
  relativePercent: number;
  contributions: Array<{ name: string; partial: number; varianceSharePct: number }>;
}

export function propagateFormulaError(formula: string, variables: UncertainVar[]): ErrorPropagationResult | null {
  const evalAt = (overrides: Record<string, number>): number => {
    let expr = formula;
    const sorted = [...variables].sort((a, b) => b.name.length - a.name.length);
    for (const v of sorted) {
      const val = overrides[v.name] ?? v.value;
      expr = expr.replace(new RegExp(`\\b${v.name}\\b`, 'g'), `(${val})`);
    }
    return evaluateSafeMathExpression(expr);
  };

  try {
    const baseVal = evalAt({});
    if (!Number.isFinite(baseVal)) return null;

    const partials: Array<{ name: string; partial: number; termSq: number }> = [];
    let totalVar = 0;

    for (const v of variables) {
      const h = Math.max(1e-6, Math.abs(v.value) * 1e-5);
      const fPlus = evalAt({ [v.name]: v.value + h });
      const fMinus = evalAt({ [v.name]: v.value - h });
      const partial = (fPlus - fMinus) / (2 * h);
      const termSq = Number.isFinite(partial) ? (partial * v.uncertainty) ** 2 : 0;
      totalVar += termSq;
      partials.push({ name: v.name, partial: Number.isFinite(partial) ? partial : 0, termSq });
    }

    const uncertainty = Math.sqrt(totalVar);
    const relativePercent = baseVal !== 0 ? (uncertainty / Math.abs(baseVal)) * 100 : 0;

    return {
      value: baseVal,
      uncertainty,
      relativePercent,
      contributions: partials.map(p => ({
        name: p.name,
        partial: p.partial,
        varianceSharePct: totalVar > 0 ? (p.termSq / totalVar) * 100 : 0,
      })),
    };
  } catch {
    return null;
  }
}
