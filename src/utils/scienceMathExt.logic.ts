import { compileSafeMultiVarExpression } from './safeMathParser';

/**
 * Pure, framework-free engines for Thermodynamics/Heat/Psychrometrics,
 * Chemical Kinetics, Spectroscopy/Beer-Lambert, Op-Amp/555/PCB,
 * Linear Programming/Simplex, RK4 ODE/Slope Field, Graph Algorithms,
 * Sequences/Series, and Modular Number Theory.
 */

/* ─────────────────────────────────────────────────────────────
   1. THERMODYNAMICS, HEAT TRANSFER & PSYCHROMETRICS
   ───────────────────────────────────────────────────────────── */
export interface WallLayer {
  name: string;
  thicknessM: number;
  conductivityWmK: number; // k (W / m·K)
}

export function computeWallHeatTransfer(layers: readonly WallLayer[], areaM2: number, deltaT: number) {
  let totalR = 0;
  for (const l of layers) {
    if (l.thicknessM > 0 && l.conductivityWmK > 0) {
      totalR += l.thicknessM / l.conductivityWmK;
    }
  }
  const uValue = totalR > 0 ? 1 / totalR : 0;
  const heatFluxW = uValue * Math.max(0, areaM2) * deltaT;
  return { totalR, uValue, heatFluxW };
}

export function computeRadiationHeatW(emissivity: number, areaM2: number, tempObjK: number, tempSurrK: number): number {
  const SIGMA = 5.670374419e-8;
  const eps = Math.max(0, Math.min(1, emissivity));
  return eps * SIGMA * Math.max(0, areaM2) * (Math.pow(Math.max(0, tempObjK), 4) - Math.pow(Math.max(0, tempSurrK), 4));
}

export function computeCarnotOtto(tHotK: number, tColdK: number, compressionRatio: number, gamma = 1.4) {
  const carnotEffPct = tHotK > 0 && tColdK < tHotK ? (1 - tColdK / tHotK) * 100 : 0;
  const copHeatPump = tHotK > tColdK ? tHotK / (tHotK - tColdK) : 0;
  const ottoEffPct = compressionRatio > 1 ? (1 - 1 / Math.pow(compressionRatio, gamma - 1)) * 100 : 0;
  return { carnotEffPct, copHeatPump, ottoEffPct };
}

export function computeVanDerWaals(nMoles: number, volumeL: number, tempK: number, aAttr: number, bVol: number) {
  // R = 0.082057366 L·atm / (mol·K)
  const R = 0.082057366;
  const idealAtm = volumeL > 0 ? (nMoles * R * tempK) / volumeL : 0;
  const denom = volumeL - nMoles * bVol;
  const realAtm = denom > 1e-6 && volumeL > 0 ? (nMoles * R * tempK) / denom - (aAttr * nMoles * nMoles) / (volumeL * volumeL) : NaN;
  const deviationPct = idealAtm !== 0 && Number.isFinite(realAtm) ? ((realAtm - idealAtm) / idealAtm) * 100 : 0;
  return { idealAtm, realAtm, deviationPct, idealKpa: idealAtm * 101.325, realKpa: realAtm * 101.325 };
}

export function computePsychrometrics(tempC: number, relHumidityPct: number, pressureKpa = 101.325) {
  const rh = Math.max(1, Math.min(100, relHumidityPct));
  // Magnus-Tetens saturation vapor pressure (kPa)
  const esKpa = 0.61094 * Math.exp((17.625 * tempC) / (tempC + 243.04));
  const eaKpa = esKpa * (rh / 100);
  const lnRatio = Math.log(eaKpa / 0.61094);
  const dewPointC = (243.04 * lnRatio) / (17.625 - lnRatio);
  // Stull (2011) wet-bulb approximation (valid at sea-level pressure)
  const wetBulbC =
    tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tempC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;
  const humidityRatioGkg = pressureKpa > eaKpa ? (621.98 * eaKpa) / (pressureKpa - eaKpa) : 0;
  return { esKpa, eaKpa, dewPointC, wetBulbC, humidityRatioGkg };
}

/* ─────────────────────────────────────────────────────────────
   2. CHEMICAL KINETICS & ARRHENIUS STUDIO
   ───────────────────────────────────────────────────────────── */
export type ReactionOrder = 0 | 1 | 2;

export function computeKinetics(order: ReactionOrder, c0: number, kRate: number, timeS: number) {
  const cInit = Math.max(1e-9, c0);
  const k = Math.max(1e-12, kRate);
  const t = Math.max(0, timeS);

  let ct = cInit;
  let halfLife = 0;

  if (order === 0) {
    ct = Math.max(0, cInit - k * t);
    halfLife = cInit / (2 * k);
  } else if (order === 1) {
    ct = cInit * Math.exp(-k * t);
    halfLife = Math.LN2 / k;
  } else {
    ct = 1 / (1 / cInit + k * t);
    halfLife = 1 / (k * cInit);
  }

  const percentReacted = ((cInit - ct) / cInit) * 100;
  const maxT = Math.max(t * 1.25, halfLife * 4, 1);
  const curve: Array<{ t: number; c: number }> = [];
  for (let i = 0; i <= 40; i++) {
    const ti = (maxT * i) / 40;
    const ci =
      order === 0
        ? Math.max(0, cInit - k * ti)
        : order === 1
        ? cInit * Math.exp(-k * ti)
        : 1 / (1 / cInit + k * ti);
    curve.push({ t: ti, c: ci });
  }

  return { ct, halfLife, percentReacted, curve };
}

export function computeArrhenius(preExpA: number, eaKjMol: number, t1K: number, t2K: number) {
  const R_KJ = 0.008314462618; // kJ/(mol·K)
  const k1 = preExpA * Math.exp(-eaKjMol / (R_KJ * Math.max(1, t1K)));
  const k2 = preExpA * Math.exp(-eaKjMol / (R_KJ * Math.max(1, t2K)));
  const ratio = k1 > 0 ? k2 / k1 : 0;
  return { k1, k2, ratio };
}

/* ─────────────────────────────────────────────────────────────
   3. SPECTROSCOPY & BEER-LAMBERT LAB
   ───────────────────────────────────────────────────────────── */
export function computeBeerLambert(epsilon: number, pathCm: number, concMolL: number) {
  const absorbance = Math.max(0, epsilon * pathCm * concMolL);
  const transmittancePct = Math.pow(10, -absorbance) * 100;
  return { absorbance, transmittancePct };
}

export function computePhotonFromWavelengthNm(wavelengthNm: number) {
  const C = 299792458;
  const H = 6.62607015e-34;
  const EV = 1.602176634e-19;
  const NA = 6.02214076e23;

  const lamM = Math.max(1e-12, wavelengthNm * 1e-9);
  const freqHz = C / lamM;
  const energyJ = H * freqHz;
  const energyEv = energyJ / EV;
  const energyKjMol = (energyJ * NA) / 1000;
  const wavenumberCm1 = 1e7 / Math.max(1e-9, wavelengthNm);

  let region = 'Radio / Microwave';
  if (wavelengthNm < 0.01) region = 'Gamma Ray';
  else if (wavelengthNm < 10) region = 'X-Ray';
  else if (wavelengthNm < 380) region = 'Ultraviolet (UV)';
  else if (wavelengthNm <= 750) region = 'Visible Light';
  else if (wavelengthNm < 1e6) region = 'Infrared (IR)';

  return { freqHz, energyJ, energyEv, energyKjMol, wavenumberCm1, region };
}

/* ─────────────────────────────────────────────────────────────
   4. ELECTRONICS EXTENSIONS: OP-AMP, 555 TIMER & PCB TRACE WIDTH
   ───────────────────────────────────────────────────────────── */
export function computeOpAmp(rIn: number, rF: number, vIn: number) {
  const safeRin = Math.max(1e-9, rIn);
  const invGain = -rF / safeRin;
  const nonInvGain = 1 + rF / safeRin;
  return {
    invGain,
    invVout: invGain * vIn,
    nonInvGain,
    nonInvVout: nonInvGain * vIn,
    invGainDb: 20 * Math.log10(Math.max(1e-9, Math.abs(invGain))),
    nonInvGainDb: 20 * Math.log10(Math.max(1e-9, Math.abs(nonInvGain))),
  };
}

export function compute555Timer(r1Ohm: number, r2Ohm: number, cUf: number) {
  const cF = Math.max(1e-12, cUf * 1e-6);
  const tHighS = 0.693 * (r1Ohm + r2Ohm) * cF;
  const tLowS = 0.693 * r2Ohm * cF;
  const periodS = tHighS + tLowS;
  const freqHz = periodS > 0 ? 1 / periodS : 0;
  const dutyCyclePct = periodS > 0 ? (tHighS / periodS) * 100 : 0;
  const monostablePulseS = 1.1 * r1Ohm * cF;
  return { tHighS, tLowS, periodS, freqHz, dutyCyclePct, monostablePulseS };
}

export function computePcbTraceWidthIpc2221(currentA: number, tempRiseC: number, copperOz: number, isExternal: boolean) {
  // IPC-2221: I = k * dT^0.44 * A^0.725  (A in mils^2)
  const k = isExternal ? 0.048 : 0.024;
  const dt = Math.max(0.5, tempRiseC);
  const areaMil2 = Math.pow(Math.max(0, currentA) / (k * Math.pow(dt, 0.44)), 1 / 0.725);
  const thicknessMil = Math.max(0.25, copperOz) * 1.378;
  const widthMil = areaMil2 / thicknessMil;
  const widthMm = widthMil * 0.0254;
  return { widthMil, widthMm, areaMil2 };
}

/* ─────────────────────────────────────────────────────────────
   5. LINEAR PROGRAMMING 2D GRAPHICAL & SIMPLEX SOLVER
   ───────────────────────────────────────────────────────────── */
export interface LinearConstraint2D {
  a: number;
  b: number;
  rhs: number;
  op: '<=' | '>=';
}

export interface Lp2DResult {
  feasible: boolean;
  vertices: Array<{ x: number; y: number; z: number }>;
  optimal: { x: number; y: number; z: number } | null;
}

export function solveLinearProgram2D(
  c1: number,
  c2: number,
  maximize: boolean,
  constraints: readonly LinearConstraint2D[]
): Lp2DResult {
  // Include x >= 0, y >= 0, and bounding lines for safe closed visualization
  const lines: Array<{ a: number; b: number; rhs: number; op: '<=' | '>=' }> = [
    ...constraints,
    { a: 1, b: 0, rhs: 0, op: '>=' },
    { a: 0, b: 1, rhs: 0, op: '>=' },
  ];

  const isFeasiblePoint = (x: number, y: number): boolean => {
    const eps = 1e-6;
    for (const c of lines) {
      const lhs = c.a * x + c.b * y;
      if (c.op === '<=' && lhs > c.rhs + eps) return false;
      if (c.op === '>=' && lhs < c.rhs - eps) return false;
    }
    return true;
  };

  const rawPoints: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const l1 = lines[i];
      const l2 = lines[j];
      const det = l1.a * l2.b - l2.a * l1.b;
      if (Math.abs(det) < 1e-10) continue;
      const x = (l1.rhs * l2.b - l2.rhs * l1.b) / det;
      const y = (l1.a * l2.rhs - l2.a * l1.rhs) / det;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (isFeasiblePoint(x, y)) {
        const dup = rawPoints.some(p => Math.hypot(p.x - x, p.y - y) < 1e-5);
        if (!dup) rawPoints.push({ x: Math.abs(x) < 1e-9 ? 0 : x, y: Math.abs(y) < 1e-9 ? 0 : y });
      }
    }
  }

  if (rawPoints.length === 0) {
    return { feasible: false, vertices: [], optimal: null };
  }

  // Sort vertices counter-clockwise around centroid for SVG polygon
  const cx = rawPoints.reduce((s, p) => s + p.x, 0) / rawPoints.length;
  const cy = rawPoints.reduce((s, p) => s + p.y, 0) / rawPoints.length;
  rawPoints.sort((p1, p2) => Math.atan2(p1.y - cy, p1.x - cx) - Math.atan2(p2.y - cy, p2.x - cx));

  const vertices = rawPoints.map(p => ({ x: p.x, y: p.y, z: c1 * p.x + c2 * p.y }));
  let optimal = vertices[0];
  for (const v of vertices) {
    if (maximize ? v.z > optimal.z : v.z < optimal.z) {
      optimal = v;
    }
  }

  return { feasible: true, vertices, optimal };
}

/* ─────────────────────────────────────────────────────────────
   6. ODE SOLVER (EULER VS. RK4) & SLOPE FIELD
   ───────────────────────────────────────────────────────────── */
export interface OdePoint {
  x: number;
  yRk4: number;
  yEuler: number;
}

export interface OdeResult {
  valid: boolean;
  points: OdePoint[];
  slopeSegments: Array<{ x: number; y: number; slope: number }>;
  error?: string;
}

export function solveOdeFirstOrder(
  expr: string,
  x0: number,
  y0: number,
  xEnd: number,
  steps = 40
): OdeResult {
  let fn: (vars: Record<string, number>) => number;
  try {
    fn = compileSafeMultiVarExpression(expr, ['x', 'y']);
    const probe = fn({ x: x0, y: y0 });
    if (!Number.isFinite(probe)) return { valid: false, points: [], slopeSegments: [], error: 'Expression returned non-finite value.' };
  } catch (err: unknown) {
    return { valid: false, points: [], slopeSegments: [], error: err instanceof Error ? err.message : 'Invalid syntax' };
  }

  const n = Math.max(4, Math.min(200, Math.round(steps)));
  const h = (xEnd - x0) / n;
  const points: OdePoint[] = [{ x: x0, yRk4: y0, yEuler: y0 }];

  let x = x0;
  let yRk4 = y0;
  let yEuler = y0;

  for (let i = 0; i < n; i++) {
    const k1 = fn({ x, y: yRk4 });
    const k2 = fn({ x: x + h / 2, y: yRk4 + (h / 2) * k1 });
    const k3 = fn({ x: x + h / 2, y: yRk4 + (h / 2) * k2 });
    const k4 = fn({ x: x + h, y: yRk4 + h * k3 });
    const nextRk4 = yRk4 + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);

    const slopeEuler = fn({ x, y: yEuler });
    const nextEuler = yEuler + h * slopeEuler;

    x += h;
    yRk4 = Math.max(-1e6, Math.min(1e6, Number.isFinite(nextRk4) ? nextRk4 : yRk4));
    yEuler = Math.max(-1e6, Math.min(1e6, Number.isFinite(nextEuler) ? nextEuler : yEuler));
    points.push({ x, yRk4, yEuler });
  }

  // Build 11x9 slope field grid around solution bounds
  const ys = points.map(p => p.yRk4);
  const yMin = Math.min(...ys, y0) - 1;
  const yMax = Math.max(...ys, y0) + 1;
  const slopeSegments: Array<{ x: number; y: number; slope: number }> = [];
  for (let ix = 0; ix <= 10; ix++) {
    const gx = x0 + ((xEnd - x0) * ix) / 10;
    for (let iy = 0; iy <= 8; iy++) {
      const gy = yMin + ((yMax - yMin) * iy) / 8;
      const sl = fn({ x: gx, y: gy });
      if (Number.isFinite(sl)) {
        slopeSegments.push({ x: gx, y: gy, slope: sl });
      }
    }
  }

  return { valid: true, points, slopeSegments };
}

/* ─────────────────────────────────────────────────────────────
   7. GRAPH THEORY: DIJKSTRA, KRUSKAL MST, BFS, TOPO SORT
   ───────────────────────────────────────────────────────────── */
export interface GraphNode {
  id: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

export interface GraphAnalysisResult {
  shortestPath: string[];
  shortestDistance: number | null;
  mstEdges: GraphEdge[];
  mstTotalWeight: number;
  bfsOrder: string[];
  topoOrder: string[] | null;
}

export function analyzeGraph(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  startId: string,
  endId: string,
  directed: boolean
): GraphAnalysisResult {
  const ids = nodes.map(n => n.id);
  const adj = new Map<string, Array<{ to: string; weight: number }>>();
  for (const id of ids) adj.set(id, []);
  for (const e of edges) {
    if (!adj.has(e.from) || !adj.has(e.to)) continue;
    adj.get(e.from)!.push({ to: e.to, weight: Math.max(0, e.weight) });
    if (!directed) {
      adj.get(e.to)!.push({ to: e.from, weight: Math.max(0, e.weight) });
    }
  }

  // Dijkstra
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const unvisited = new Set<string>(ids);
  for (const id of ids) {
    dist.set(id, id === startId ? 0 : Infinity);
    prev.set(id, null);
  }

  while (unvisited.size > 0) {
    let bestId: string | null = null;
    let bestD = Infinity;
    for (const id of unvisited) {
      const d = dist.get(id) ?? Infinity;
      if (d < bestD) {
        bestD = d;
        bestId = id;
      }
    }
    if (bestId === null || bestD === Infinity) break;
    unvisited.delete(bestId);
    if (bestId === endId) break;

    for (const edge of adj.get(bestId) ?? []) {
      const alt = bestD + edge.weight;
      if (alt < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, bestId);
      }
    }
  }

  const endDist = dist.get(endId) ?? Infinity;
  const shortestPath: string[] = [];
  if (Number.isFinite(endDist)) {
    let curr: string | null = endId;
    while (curr !== null) {
      shortestPath.unshift(curr);
      curr = prev.get(curr) ?? null;
    }
  }

  // BFS order from startId
  const bfsOrder: string[] = [];
  if (adj.has(startId)) {
    const visited = new Set<string>([startId]);
    const queue = [startId];
    while (queue.length > 0) {
      const u = queue.shift()!;
      bfsOrder.push(u);
      for (const nb of adj.get(u) ?? []) {
        if (!visited.has(nb.to)) {
          visited.add(nb.to);
          queue.push(nb.to);
        }
      }
    }
  }

  // Kruskal MST (undirected interpretation of edge weights)
  const parent = new Map<string, string>();
  for (const id of ids) parent.set(id, id);
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let curr = x;
    while (curr !== root) {
      const nxt = parent.get(curr)!;
      parent.set(curr, root);
      curr = nxt;
    }
    return root;
  };

  const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
  const mstEdges: GraphEdge[] = [];
  let mstTotalWeight = 0;
  for (const e of sortedEdges) {
    if (!parent.has(e.from) || !parent.has(e.to)) continue;
    const ra = find(e.from);
    const rb = find(e.to);
    if (ra !== rb) {
      parent.set(ra, rb);
      mstEdges.push(e);
      mstTotalWeight += e.weight;
    }
  }

  // Topological sort (only meaningful for directed graphs)
  let topoOrder: string[] | null = null;
  if (directed) {
    const inDeg = new Map<string, number>();
    for (const id of ids) inDeg.set(id, 0);
    for (const e of edges) {
      if (inDeg.has(e.to) && inDeg.has(e.from)) {
        inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
      }
    }
    const q = ids.filter(id => (inDeg.get(id) ?? 0) === 0);
    const out: string[] = [];
    while (q.length > 0) {
      const u = q.shift()!;
      out.push(u);
      for (const nb of adj.get(u) ?? []) {
        const nextDeg = (inDeg.get(nb.to) ?? 1) - 1;
        inDeg.set(nb.to, nextDeg);
        if (nextDeg === 0) q.push(nb.to);
      }
    }
    topoOrder = out.length === ids.length ? out : null;
  }

  return {
    shortestPath,
    shortestDistance: Number.isFinite(endDist) ? endDist : null,
    mstEdges,
    mstTotalWeight,
    bfsOrder,
    topoOrder,
  };
}

/* ─────────────────────────────────────────────────────────────
   8. SEQUENCES, SERIES & CONVERGENCE EXPLORER
   ───────────────────────────────────────────────────────────── */
export type SequenceMode = 'arithmetic' | 'geometric' | 'fibonacci' | 'pseries' | 'custom';

export interface SequenceTerm {
  n: number;
  term: number;
  partialSum: number;
}

export interface SequenceAnalysisResult {
  valid: boolean;
  terms: SequenceTerm[];
  sumTotal: number;
  lastRatio: number | null;
  convergenceHint: 'converges' | 'diverges' | 'inconclusive';
  closedFormSum: number | null;
}

export function evaluateSequenceSeries(params: {
  mode: SequenceMode;
  a1: number;
  diffOrRatio: number;
  pPower: number;
  customExpr: string;
  count: number;
}): SequenceAnalysisResult {
  const nCount = Math.max(1, Math.min(100, Math.round(params.count)));
  let customFn: ((vars: Record<string, number>) => number) | null = null;

  if (params.mode === 'custom') {
    try {
      customFn = compileSafeMultiVarExpression(params.customExpr, ['n', 'x']);
    } catch {
      return { valid: false, terms: [], sumTotal: 0, lastRatio: null, convergenceHint: 'inconclusive', closedFormSum: null };
    }
  }

  const terms: SequenceTerm[] = [];
  let partialSum = 0;
  let fibPrev = 0;
  let fibCurr = params.a1 || 1;

  for (let n = 1; n <= nCount; n++) {
    let val = 0;
    if (params.mode === 'arithmetic') {
      val = params.a1 + (n - 1) * params.diffOrRatio;
    } else if (params.mode === 'geometric') {
      val = params.a1 * Math.pow(params.diffOrRatio, n - 1);
    } else if (params.mode === 'fibonacci') {
      if (n === 1) {
        val = fibCurr;
      } else {
        const nxt = fibPrev + fibCurr;
        fibPrev = fibCurr;
        fibCurr = nxt;
        val = fibCurr;
      }
    } else if (params.mode === 'pseries') {
      val = 1 / Math.pow(n, params.pPower);
    } else if (customFn) {
      val = customFn({ n, x: n });
    }

    if (!Number.isFinite(val)) {
      return { valid: false, terms: [], sumTotal: 0, lastRatio: null, convergenceHint: 'inconclusive', closedFormSum: null };
    }
    partialSum += val;
    terms.push({ n, term: val, partialSum });
  }

  let lastRatio: number | null = null;
  if (terms.length >= 2) {
    const prev = terms[terms.length - 2].term;
    const curr = terms[terms.length - 1].term;
    if (Math.abs(prev) > 1e-12) {
      lastRatio = Math.abs(curr / prev);
    }
  }

  let convergenceHint: SequenceAnalysisResult['convergenceHint'] = 'inconclusive';
  let closedFormSum: number | null = null;

  if (params.mode === 'geometric') {
    if (Math.abs(params.diffOrRatio) < 1) {
      convergenceHint = 'converges';
      closedFormSum = params.a1 / (1 - params.diffOrRatio);
    } else {
      convergenceHint = 'diverges';
    }
  } else if (params.mode === 'pseries') {
    convergenceHint = params.pPower > 1 ? 'converges' : 'diverges';
    if (Math.abs(params.pPower - 2) < 1e-9) closedFormSum = (Math.PI * Math.PI) / 6;
  } else if (params.mode === 'arithmetic') {
    convergenceHint = params.a1 === 0 && params.diffOrRatio === 0 ? 'converges' : 'diverges';
  } else if (params.mode === 'fibonacci') {
    convergenceHint = 'diverges';
  } else if (lastRatio !== null) {
    if (lastRatio < 0.999) convergenceHint = 'converges';
    else if (lastRatio > 1.001) convergenceHint = 'diverges';
  }

  return { valid: true, terms, sumTotal: partialSum, lastRatio, convergenceHint, closedFormSum };
}

/* ─────────────────────────────────────────────────────────────
   9. MODULAR ARITHMETIC, EXTENDED GCD, CRT & EULER TOTIENT
   ───────────────────────────────────────────────────────────── */
export function bigModPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod <= 0n) return 0n;
  if (mod === 1n) return 0n;
  let result = 1n;
  let b = ((base % mod) + mod) % mod;
  let e = exp < 0n ? 0n : exp;
  while (e > 0n) {
    if ((e & 1n) === 1n) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return result;
}

export function extendedGcdBigInt(a: bigint, b: bigint): { gcd: bigint; x: bigint; y: bigint } {
  let oldR = a;
  let r = b;
  let oldS = 1n;
  let s = 0n;
  let oldT = 0n;
  let t = 1n;

  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }

  if (oldR < 0n) {
    return { gcd: -oldR, x: -oldS, y: -oldT };
  }
  return { gcd: oldR, x: oldS, y: oldT };
}

export function modInverseBigInt(a: bigint, mod: bigint): bigint | null {
  if (mod <= 1n) return null;
  const { gcd, x } = extendedGcdBigInt(a, mod);
  if (gcd !== 1n) return null;
  return ((x % mod) + mod) % mod;
}

export function eulerTotient(n: number): number {
  let num = Math.floor(Math.abs(n));
  if (num <= 0) return 0;
  let result = num;
  for (let p = 2; p * p <= num; p++) {
    if (num % p === 0) {
      while (num % p === 0) num = Math.floor(num / p);
      result -= Math.floor(result / p);
    }
  }
  if (num > 1) result -= Math.floor(result / num);
  return result;
}

export function solveChineseRemainder(
  pairs: ReadonlyArray<{ remainder: bigint; modulus: bigint }>
): { valid: boolean; solution: bigint; combinedModulus: bigint } {
  if (pairs.length === 0) return { valid: false, solution: 0n, combinedModulus: 1n };
  let x = ((pairs[0].remainder % pairs[0].modulus) + pairs[0].modulus) % pairs[0].modulus;
  let m = pairs[0].modulus;
  if (m <= 0n) return { valid: false, solution: 0n, combinedModulus: 1n };

  for (let i = 1; i < pairs.length; i++) {
    const a2 = pairs[i].remainder;
    const m2 = pairs[i].modulus;
    if (m2 <= 0n) return { valid: false, solution: 0n, combinedModulus: 1n };
    const { gcd, x: s } = extendedGcdBigInt(m, m2);
    if ((a2 - x) % gcd !== 0n) {
      return { valid: false, solution: 0n, combinedModulus: 1n };
    }
    const lcm = (m / gcd) * m2;
    const k = (((a2 - x) / gcd) * s) % (m2 / gcd);
    x = (((x + m * k) % lcm) + lcm) % lcm;
    m = lcm;
  }

  return { valid: true, solution: x, combinedModulus: m };
}
