/* ============================================================================
   1. pH, BUFFERS & TITRATION SIMULATOR
   ============================================================================ */
export interface AcidBasePreset {
  name: string;
  formula: string;
  type: 'strong-acid' | 'weak-acid' | 'strong-base' | 'weak-base';
  pKa?: number;
}

export const ACID_BASE_PRESETS: AcidBasePreset[] = [
  { name: 'Hydrochloric acid', formula: 'HCl', type: 'strong-acid' },
  { name: 'Nitric acid', formula: 'HNO3', type: 'strong-acid' },
  { name: 'Acetic acid', formula: 'CH3COOH', type: 'weak-acid', pKa: 4.76 },
  { name: 'Formic acid', formula: 'HCOOH', type: 'weak-acid', pKa: 3.75 },
  { name: 'Benzoic acid', formula: 'C6H5COOH', type: 'weak-acid', pKa: 4.20 },
  { name: 'Hydrofluoric acid', formula: 'HF', type: 'weak-acid', pKa: 3.17 },
  { name: 'Carbonic acid (pKa1)', formula: 'H2CO3', type: 'weak-acid', pKa: 6.35 },
  { name: 'Phosphoric acid (pKa2)', formula: 'H2PO4-', type: 'weak-acid', pKa: 7.21 },
  { name: 'Sodium hydroxide', formula: 'NaOH', type: 'strong-base' },
  { name: 'Ammonia (NH4+ pKa)', formula: 'NH3', type: 'weak-base', pKa: 9.25 },
];

export function calculateSolutionPh(
  type: AcidBasePreset['type'],
  molarity: number,
  pKa = 4.76
): { pH: number; pOH: number; hConc: number; ohConc: number } {
  const c = Math.max(1e-12, molarity);
  let pH = 7;
  if (type === 'strong-acid') {
    const h = 0.5 * (c + Math.sqrt(c * c + 4e-14));
    pH = -Math.log10(h);
  } else if (type === 'strong-base') {
    const oh = 0.5 * (c + Math.sqrt(c * c + 4e-14));
    pH = 14 + Math.log10(oh);
  } else if (type === 'weak-acid') {
    const ka = Math.pow(10, -pKa);
    const h = 0.5 * (-ka + Math.sqrt(ka * ka + 4 * ka * c));
    pH = -Math.log10(Math.max(1e-14, h));
  } else {
    const kb = Math.pow(10, -(14 - pKa));
    const oh = 0.5 * (-kb + Math.sqrt(kb * kb + 4 * kb * c));
    pH = 14 + Math.log10(Math.max(1e-14, oh));
  }
  pH = Math.max(0, Math.min(14, pH));
  const pOH = 14 - pH;
  return { pH, pOH, hConc: Math.pow(10, -pH), ohConc: Math.pow(10, -pOH) };
}

export interface TitrationPoint {
  volumeMl: number;
  pH: number;
}

export function generateTitrationCurve(
  analyteType: 'strong-acid' | 'weak-acid' | 'weak-base',
  cAnalyte: number,
  vAnalyteMl: number,
  cTitrant: number,
  pKa: number
): { points: TitrationPoint[]; eqVolumeMl: number; eqPh: number; halfEqVolumeMl: number } {
  const eqVolumeMl = cTitrant > 0 ? (cAnalyte * vAnalyteMl) / cTitrant : 0;
  const maxVol = Math.max(10, eqVolumeMl * 2);
  const points: TitrationPoint[] = [];
  const ka = Math.pow(10, -pKa);
  const kw = 1e-14;

  for (let i = 0; i <= 120; i++) {
    const vt = (maxVol * i) / 120;
    const totalV = vAnalyteMl + vt;
    const molesA = cAnalyte * vAnalyteMl;
    const molesT = cTitrant * vt;
    let pH = 7;

    if (analyteType === 'strong-acid') {
      if (molesA > molesT + 1e-12) {
        const h = (molesA - molesT) / totalV;
        pH = -Math.log10(Math.max(1e-14, h));
      } else if (molesT > molesA + 1e-12) {
        const oh = (molesT - molesA) / totalV;
        pH = 14 + Math.log10(Math.max(1e-14, oh));
      } else {
        pH = 7;
      }
    } else if (analyteType === 'weak-acid') {
      if (vt === 0) {
        pH = calculateSolutionPh('weak-acid', cAnalyte, pKa).pH;
      } else if (molesT < molesA - 1e-9) {
        pH = pKa + Math.log10(molesT / (molesA - molesT));
      } else if (Math.abs(molesT - molesA) <= 1e-9) {
        const kb = kw / ka;
        const cSalt = molesA / totalV;
        const oh = Math.sqrt(kb * cSalt);
        pH = 14 + Math.log10(Math.max(1e-14, oh));
      } else {
        const oh = (molesT - molesA) / totalV;
        pH = 14 + Math.log10(Math.max(1e-14, oh));
      }
    } else {
      // Weak base titrated with strong acid
      if (vt === 0) {
        pH = calculateSolutionPh('weak-base', cAnalyte, pKa).pH;
      } else if (molesT < molesA - 1e-9) {
        pH = pKa + Math.log10((molesA - molesT) / molesT);
      } else if (Math.abs(molesT - molesA) <= 1e-9) {
        const cSalt = molesA / totalV;
        const h = Math.sqrt(ka * cSalt);
        pH = -Math.log10(Math.max(1e-14, h));
      } else {
        const h = (molesT - molesA) / totalV;
        pH = -Math.log10(Math.max(1e-14, h));
      }
    }

    points.push({ volumeMl: vt, pH: Math.max(0, Math.min(14, pH)) });
  }

  let eqPh = 7;
  if (analyteType === 'weak-acid') {
    const cSalt = (cAnalyte * vAnalyteMl) / (vAnalyteMl + eqVolumeMl);
    eqPh = 14 + Math.log10(Math.sqrt((kw / ka) * cSalt));
  } else if (analyteType === 'weak-base') {
    const cSalt = (cAnalyte * vAnalyteMl) / (vAnalyteMl + eqVolumeMl);
    eqPh = -Math.log10(Math.sqrt(ka * cSalt));
  }

  return { points, eqVolumeMl, eqPh: Math.max(0, Math.min(14, eqPh)), halfEqVolumeMl: eqVolumeMl / 2 };
}

/* ============================================================================
   2. SOLUTION DILUTION & SERIAL DILUTION
   ============================================================================ */
export interface SerialDilutionStep {
  tube: number;
  transferMl: number;
  diluentMl: number;
  cumulativeFactor: number;
  concentration: number;
}

export function generateSerialDilution(
  stockConc: number,
  dilutionFactor: number,
  finalTubeVolMl: number,
  stepsCount: number
): SerialDilutionStep[] {
  const factor = Math.max(1.01, dilutionFactor);
  const transferMl = finalTubeVolMl / factor;
  const diluentMl = finalTubeVolMl - transferMl;
  const steps: SerialDilutionStep[] = [];
  for (let i = 1; i <= Math.min(20, Math.max(1, Math.floor(stepsCount))); i++) {
    const cumulativeFactor = Math.pow(factor, i);
    steps.push({
      tube: i,
      transferMl,
      diluentMl,
      cumulativeFactor,
      concentration: stockConc / cumulativeFactor,
    });
  }
  return steps;
}

/* ============================================================================
   3. VSEPR MOLECULAR GEOMETRY & FUNCTIONAL GROUPS
   ============================================================================ */
export interface VseprGeometry {
  steric: number;
  bonding: number;
  lone: number;
  electronGeometry: string;
  molecularGeometry: string;
  hybridization: string;
  bondAngles: string;
  polarUsually: boolean;
  examples: string[];
}

export const VSEPR_TABLE: VseprGeometry[] = [
  { steric: 2, bonding: 2, lone: 0, electronGeometry: 'Linear', molecularGeometry: 'Linear', hybridization: 'sp', bondAngles: '180°', polarUsually: false, examples: ['CO₂', 'BeCl₂', 'HCN'] },
  { steric: 3, bonding: 3, lone: 0, electronGeometry: 'Trigonal Planar', molecularGeometry: 'Trigonal Planar', hybridization: 'sp²', bondAngles: '120°', polarUsually: false, examples: ['BF₃', 'SO₃', 'CO₃²⁻'] },
  { steric: 3, bonding: 2, lone: 1, electronGeometry: 'Trigonal Planar', molecularGeometry: 'Bent (Angular)', hybridization: 'sp²', bondAngles: '<120° (~117°)', polarUsually: true, examples: ['SO₂', 'O₃', 'NO₂⁻'] },
  { steric: 4, bonding: 4, lone: 0, electronGeometry: 'Tetrahedral', molecularGeometry: 'Tetrahedral', hybridization: 'sp³', bondAngles: '109.5°', polarUsually: false, examples: ['CH₄', 'CCl₄', 'NH₄⁺'] },
  { steric: 4, bonding: 3, lone: 1, electronGeometry: 'Tetrahedral', molecularGeometry: 'Trigonal Pyramidal', hybridization: 'sp³', bondAngles: '~107°', polarUsually: true, examples: ['NH₃', 'PCl₃', 'H₃O⁺'] },
  { steric: 4, bonding: 2, lone: 2, electronGeometry: 'Tetrahedral', molecularGeometry: 'Bent (V-Shaped)', hybridization: 'sp³', bondAngles: '~104.5°', polarUsually: true, examples: ['H₂O', 'H₂S', 'OF₂'] },
  { steric: 5, bonding: 5, lone: 0, electronGeometry: 'Trigonal Bipyramidal', molecularGeometry: 'Trigonal Bipyramidal', hybridization: 'sp³d', bondAngles: '90°, 120°', polarUsually: false, examples: ['PCl₅', 'PF₅'] },
  { steric: 5, bonding: 4, lone: 1, electronGeometry: 'Trigonal Bipyramidal', molecularGeometry: 'Seesaw', hybridization: 'sp³d', bondAngles: '<90°, <120°', polarUsually: true, examples: ['SF₄', 'TeCl₄'] },
  { steric: 5, bonding: 3, lone: 2, electronGeometry: 'Trigonal Bipyramidal', molecularGeometry: 'T-Shaped', hybridization: 'sp³d', bondAngles: '<90° (~87°)', polarUsually: true, examples: ['ClF₃', 'BrF₃'] },
  { steric: 5, bonding: 2, lone: 3, electronGeometry: 'Trigonal Bipyramidal', molecularGeometry: 'Linear', hybridization: 'sp³d', bondAngles: '180°', polarUsually: false, examples: ['XeF₂', 'I₃⁻'] },
  { steric: 6, bonding: 6, lone: 0, electronGeometry: 'Octahedral', molecularGeometry: 'Octahedral', hybridization: 'sp³d²', bondAngles: '90°', polarUsually: false, examples: ['SF₆', 'Mo(CO)₆'] },
  { steric: 6, bonding: 5, lone: 1, electronGeometry: 'Octahedral', molecularGeometry: 'Square Pyramidal', hybridization: 'sp³d²', bondAngles: '<90° (~84.8°)', polarUsually: true, examples: ['BrF₅', 'IF₅'] },
  { steric: 6, bonding: 4, lone: 2, electronGeometry: 'Octahedral', molecularGeometry: 'Square Planar', hybridization: 'sp³d²', bondAngles: '90°', polarUsually: false, examples: ['XeF₄', 'PtCl₄²⁻'] },
];

export interface FunctionalGroupInfo {
  name: string;
  formula: string;
  suffix: string;
  example: string;
  polarity: string;
}

export const FUNCTIONAL_GROUPS: FunctionalGroupInfo[] = [
  { name: 'Hydroxyl (Alcohol)', formula: 'R–OH', suffix: '-ol', example: 'Ethanol (CH₃CH₂OH)', polarity: 'Polar (H-bonding)' },
  { name: 'Carbonyl (Aldehyde)', formula: 'R–CHO', suffix: '-al', example: 'Ethanal (CH₃CHO)', polarity: 'Polar' },
  { name: 'Carbonyl (Ketone)', formula: 'R–CO–R′', suffix: '-one', example: 'Acetone (CH₃COCH₃)', polarity: 'Polar' },
  { name: 'Carboxyl (Acid)', formula: 'R–COOH', suffix: '-oic acid', example: 'Acetic acid', polarity: 'Strongly Polar / Acidic' },
  { name: 'Ester', formula: 'R–COO–R′', suffix: '-oate', example: 'Ethyl acetate', polarity: 'Moderately Polar' },
  { name: 'Amine', formula: 'R–NH₂', suffix: '-amine', example: 'Methylamine', polarity: 'Polar / Basic' },
  { name: 'Amide', formula: 'R–CONH₂', suffix: '-amide', example: 'Acetamide', polarity: 'Strongly Polar' },
  { name: 'Ether', formula: 'R–O–R′', suffix: 'ether', example: 'Diethyl ether', polarity: 'Slightly Polar' },
  { name: 'Nitrile', formula: 'R–C≡N', suffix: '-nitrile', example: 'Acetonitrile', polarity: 'Polar' },
  { name: 'Phenyl (Aromatic)', formula: '–C₆H₅', suffix: 'benzene', example: 'Toluene', polarity: 'Non-polar' },
];

/* ============================================================================
   4. THERMOCHEMISTRY & EQUILIBRIUM (ICE TABLE)
   ============================================================================ */
export interface ThermoSpecies {
  formula: string;
  name: string;
  state: string;
  dHf: number; // kJ/mol
  S: number; // J/(mol·K)
  dGf: number; // kJ/mol
}

export const THERMO_DATABASE: ThermoSpecies[] = [
  { formula: 'H2O(l)', name: 'Water (liquid)', state: 'l', dHf: -285.83, S: 69.95, dGf: -237.14 },
  { formula: 'H2O(g)', name: 'Water (gas)', state: 'g', dHf: -241.83, S: 188.84, dGf: -228.57 },
  { formula: 'CO2(g)', name: 'Carbon dioxide', state: 'g', dHf: -393.51, S: 213.78, dGf: -394.36 },
  { formula: 'CO(g)', name: 'Carbon monoxide', state: 'g', dHf: -110.53, S: 197.66, dGf: -137.17 },
  { formula: 'CH4(g)', name: 'Methane', state: 'g', dHf: -74.87, S: 186.25, dGf: -50.72 },
  { formula: 'C2H5OH(l)', name: 'Ethanol', state: 'l', dHf: -277.69, S: 160.7, dGf: -174.78 },
  { formula: 'C6H12O6(s)', name: 'Glucose', state: 's', dHf: -1273.3, S: 209.2, dGf: -910.4 },
  { formula: 'NH3(g)', name: 'Ammonia', state: 'g', dHf: -45.9, S: 192.77, dGf: -16.45 },
  { formula: 'NO2(g)', name: 'Nitrogen dioxide', state: 'g', dHf: 33.18, S: 240.06, dGf: 51.31 },
  { formula: 'N2O4(g)', name: 'Dinitrogen tetroxide', state: 'g', dHf: 9.16, S: 304.29, dGf: 97.89 },
  { formula: 'O2(g)', name: 'Oxygen', state: 'g', dHf: 0, S: 205.15, dGf: 0 },
  { formula: 'H2(g)', name: 'Hydrogen', state: 'g', dHf: 0, S: 130.68, dGf: 0 },
  { formula: 'N2(g)', name: 'Nitrogen', state: 'g', dHf: 0, S: 191.61, dGf: 0 },
  { formula: 'C(s)', name: 'Carbon (graphite)', state: 's', dHf: 0, S: 5.74, dGf: 0 },
  { formula: 'Fe2O3(s)', name: 'Iron(III) oxide', state: 's', dHf: -824.2, S: 87.4, dGf: -742.2 },
  { formula: 'CaCO3(s)', name: 'Calcium carbonate', state: 's', dHf: -1206.9, S: 92.9, dGf: -1128.8 },
  { formula: 'CaO(s)', name: 'Calcium oxide', state: 's', dHf: -635.09, S: 39.75, dGf: -604.03 },
  { formula: 'HCl(g)', name: 'Hydrogen chloride', state: 'g', dHf: -92.31, S: 186.91, dGf: -95.3 },
  { formula: 'NaCl(s)', name: 'Sodium chloride', state: 's', dHf: -411.15, S: 72.13, dGf: -384.14 },
];

export interface GibbsAnalysis {
  deltaG: number; // kJ/mol
  spontaneous: boolean;
  equilibriumK: number;
  crossoverTempK: number | null;
}

export function analyzeGibbs(deltaHKj: number, deltaSJ: number, tempK: number): GibbsAnalysis {
  const R = 0.008314462618; // kJ/(mol·K)
  const deltaG = deltaHKj - (tempK * deltaSJ) / 1000;
  const exponent = Math.max(-700, Math.min(700, -deltaG / (R * Math.max(1e-3, tempK))));
  const equilibriumK = Math.exp(exponent);
  const crossoverTempK = Math.abs(deltaSJ) > 1e-9 ? (deltaHKj * 1000) / deltaSJ : null;
  return {
    deltaG,
    spontaneous: deltaG < 0,
    equilibriumK,
    crossoverTempK: crossoverTempK !== null && crossoverTempK > 0 ? crossoverTempK : null,
  };
}

export interface IceResult {
  qInitial: number;
  direction: 'forward' | 'reverse' | 'equilibrium';
  xShift: number;
  eqA: number;
  eqB: number;
  eqC: number;
  eqD: number;
}

// Solves A + B <-> C + D (1:1:1:1) equilibrium shift x cleanly via quadratic formula
export function solveIce1to1(initA: number, initB: number, initC: number, initD: number, K: number): IceResult {
  const denom = initA * initB;
  const qInitial = denom > 0 ? (initC * initD) / denom : Infinity;
  const direction =
    Math.abs(qInitial - K) < 1e-9 ? 'equilibrium' : qInitial < K ? 'forward' : 'reverse';

  // (C + x)(D + x) = K(A - x)(B - x)
  // (1 - K)x^2 + (C + D + K(A + B))x + (CD - KAB) = 0
  const qa = 1 - K;
  const qb = initC + initD + K * (initA + initB);
  const qc = initC * initD - K * initA * initB;

  let x = 0;
  if (Math.abs(qa) < 1e-12) {
    x = Math.abs(qb) > 1e-12 ? -qc / qb : 0;
  } else {
    const disc = Math.max(0, qb * qb - 4 * qa * qc);
    const r1 = (-qb + Math.sqrt(disc)) / (2 * qa);
    const r2 = (-qb - Math.sqrt(disc)) / (2 * qa);
    const isValid = (cand: number) =>
      initA - cand >= -1e-9 && initB - cand >= -1e-9 && initC + cand >= -1e-9 && initD + cand >= -1e-9;
    if (isValid(r1)) x = r1;
    else if (isValid(r2)) x = r2;
  }

  return {
    qInitial,
    direction,
    xShift: x,
    eqA: Math.max(0, initA - x),
    eqB: Math.max(0, initB - x),
    eqC: Math.max(0, initC + x),
    eqD: Math.max(0, initD + x),
  };
}

/* ============================================================================
   5. ELECTROCHEMISTRY & REDOX
   ============================================================================ */
export interface HalfCell {
  id: string;
  reaction: string;
  e0: number; // Volts vs SHE
  electrons: number;
  molarMass: number; // g/mol of deposited/active species
}

export const HALF_CELLS: HalfCell[] = [
  { id: 'F2', reaction: 'F₂(g) + 2e⁻ → 2F⁻(aq)', e0: 2.87, electrons: 2, molarMass: 37.997 },
  { id: 'MnO4', reaction: 'MnO₄⁻ + 8H⁺ + 5e⁻ → Mn²⁺ + 4H₂O', e0: 1.51, electrons: 5, molarMass: 54.938 },
  { id: 'Au', reaction: 'Au³⁺(aq) + 3e⁻ → Au(s)', e0: 1.50, electrons: 3, molarMass: 196.967 },
  { id: 'Cl2', reaction: 'Cl₂(g) + 2e⁻ → 2Cl⁻(aq)', e0: 1.36, electrons: 2, molarMass: 70.906 },
  { id: 'O2', reaction: 'O₂(g) + 4H⁺ + 4e⁻ → 2H₂O(l)', e0: 1.23, electrons: 4, molarMass: 31.999 },
  { id: 'Ag', reaction: 'Ag⁺(aq) + e⁻ → Ag(s)', e0: 0.80, electrons: 1, molarMass: 107.868 },
  { id: 'Fe3', reaction: 'Fe³⁺(aq) + e⁻ → Fe²⁺(aq)', e0: 0.77, electrons: 1, molarMass: 55.845 },
  { id: 'I2', reaction: 'I₂(s) + 2e⁻ → 2I⁻(aq)', e0: 0.54, electrons: 2, molarMass: 253.809 },
  { id: 'Cu', reaction: 'Cu²⁺(aq) + 2e⁻ → Cu(s)', e0: 0.34, electrons: 2, molarMass: 63.546 },
  { id: 'H2', reaction: '2H⁺(aq) + 2e⁻ → H₂(g) [SHE]', e0: 0.0, electrons: 2, molarMass: 2.016 },
  { id: 'Pb', reaction: 'Pb²⁺(aq) + 2e⁻ → Pb(s)', e0: -0.13, electrons: 2, molarMass: 207.2 },
  { id: 'Ni', reaction: 'Ni²⁺(aq) + 2e⁻ → Ni(s)', e0: -0.26, electrons: 2, molarMass: 58.693 },
  { id: 'Fe2', reaction: 'Fe²⁺(aq) + 2e⁻ → Fe(s)', e0: -0.44, electrons: 2, molarMass: 55.845 },
  { id: 'Zn', reaction: 'Zn²⁺(aq) + 2e⁻ → Zn(s)', e0: -0.76, electrons: 2, molarMass: 65.38 },
  { id: 'Al', reaction: 'Al³⁺(aq) + 3e⁻ → Al(s)', e0: -1.66, electrons: 3, molarMass: 26.982 },
  { id: 'Mg', reaction: 'Mg²⁺(aq) + 2e⁻ → Mg(s)', e0: -2.37, electrons: 2, molarMass: 24.305 },
  { id: 'Na', reaction: 'Na⁺(aq) + e⁻ → Na(s)', e0: -2.71, electrons: 1, molarMass: 22.99 },
  { id: 'Li', reaction: 'Li⁺(aq) + e⁻ → Li(s)', e0: -3.04, electrons: 1, molarMass: 6.94 },
];

export const FARADAY_C = 96485.33212;

export function calculateElectrochemistry(
  eCathode: number,
  eAnode: number,
  nElectrons: number,
  tempK: number,
  reactionQ: number
): { e0Cell: number; eCellNernst: number; deltaGKj: number; spontaneous: boolean } {
  const R = 8.314462618;
  const n = Math.max(1, nElectrons);
  const e0Cell = eCathode - eAnode;
  const eCellNernst = e0Cell - ((R * tempK) / (n * FARADAY_C)) * Math.log(Math.max(1e-30, reactionQ));
  const deltaGKj = (-n * FARADAY_C * eCellNernst) / 1000;
  return { e0Cell, eCellNernst, deltaGKj, spontaneous: eCellNernst > 0 };
}

export function calculateFaradayElectrolysis(currentA: number, timeSec: number, molarMass: number, nElectrons: number) {
  const chargeC = currentA * timeSec;
  const molesE = chargeC / FARADAY_C;
  const molesSubstance = molesE / Math.max(1, nElectrons);
  const massGrams = molesSubstance * molarMass;
  return { chargeC, molesE, molesSubstance, massGrams };
}

/* ============================================================================
   6. ISOTOPE & RADIOACTIVE DECAY
   ============================================================================ */
export interface IsotopePreset {
  symbol: string;
  name: string;
  halfLifeValue: number;
  unit: 's' | 'min' | 'h' | 'd' | 'yr';
  mode: string;
}

export const ISOTOPE_PRESETS: IsotopePreset[] = [
  { symbol: '¹⁴C', name: 'Carbon-14', halfLifeValue: 5730, unit: 'yr', mode: 'β⁻' },
  { symbol: '³H', name: 'Tritium', halfLifeValue: 12.32, unit: 'yr', mode: 'β⁻' },
  { symbol: '⁶⁰Co', name: 'Cobalt-60', halfLifeValue: 5.271, unit: 'yr', mode: 'β⁻, γ' },
  { symbol: '⁹⁹ᵐTc', name: 'Technetium-99m', halfLifeValue: 6.006, unit: 'h', mode: 'γ (IT)' },
  { symbol: '¹³¹I', name: 'Iodine-131', halfLifeValue: 8.02, unit: 'd', mode: 'β⁻, γ' },
  { symbol: '¹³⁷Cs', name: 'Cesium-137', halfLifeValue: 30.17, unit: 'yr', mode: 'β⁻, γ' },
  { symbol: '²²²Rn', name: 'Radon-222', halfLifeValue: 3.8235, unit: 'd', mode: 'α' },
  { symbol: '²²⁶Ra', name: 'Radium-226', halfLifeValue: 1600, unit: 'yr', mode: 'α' },
  { symbol: '²³⁵U', name: 'Uranium-235', halfLifeValue: 7.04e8, unit: 'yr', mode: 'α' },
  { symbol: '²³⁸U', name: 'Uranium-238', halfLifeValue: 4.468e9, unit: 'yr', mode: 'α' },
];

export function calculateDecay(n0: number, halfLife: number, elapsedTime: number) {
  const hl = Math.max(1e-12, halfLife);
  const lambda = Math.LN2 / hl;
  const meanLifetime = 1 / lambda;
  const remaining = n0 * Math.exp(-lambda * Math.max(0, elapsedTime));
  const decayed = Math.max(0, n0 - remaining);
  const fractionPct = n0 > 0 ? (remaining / n0) * 100 : 0;
  const halfLivesElapsed = elapsedTime / hl;
  return { lambda, meanLifetime, remaining, decayed, fractionPct, halfLivesElapsed };
}

export function calculateElapsedTimeFromFraction(remainingPct: number, halfLife: number): number {
  const frac = Math.max(1e-9, Math.min(1, remainingPct / 100));
  return (-halfLife / Math.LN2) * Math.log(frac);
}

/* ============================================================================
   7. OPTICS & LENS / MIRROR RAY SIMULATOR
   ============================================================================ */
export interface OpticsResult {
  di: number; // image distance
  magnification: number;
  imageHeight: number;
  isReal: boolean;
  isUpright: boolean;
  opticalPowerD: number;
}

export function solveThinLens(focalLengthCm: number, objectDistCm: number, objectHeightCm: number): OpticsResult {
  const f = focalLengthCm;
  const d0 = Math.max(0.01, objectDistCm);
  const invDi = 1 / f - 1 / d0;
  const di = Math.abs(invDi) < 1e-9 ? Infinity : 1 / invDi;
  const magnification = Number.isFinite(di) ? -di / d0 : Infinity;
  const imageHeight = Number.isFinite(magnification) ? magnification * objectHeightCm : Infinity;
  return {
    di,
    magnification,
    imageHeight,
    isReal: Number.isFinite(di) && di > 0,
    isUpright: Number.isFinite(magnification) && magnification > 0,
    opticalPowerD: f !== 0 ? 100 / f : Infinity,
  };
}

export function solveSnell(n1: number, n2: number, theta1Deg: number) {
  const rad1 = (theta1Deg * Math.PI) / 180;
  const sin2 = (n1 / n2) * Math.sin(rad1);
  const tir = Math.abs(sin2) > 1;
  const theta2Deg = tir ? null : (Math.asin(sin2) * 180) / Math.PI;
  const criticalAngleDeg = n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : null;
  const brewsterAngleDeg = (Math.atan(n2 / n1) * 180) / Math.PI;
  return { theta2Deg, tir, criticalAngleDeg, brewsterAngleDeg };
}

/* ============================================================================
   8. SIGNAL & WAVE LAB (FOURIER / BODE / DOPPLER)
   ============================================================================ */
export interface HarmonicTerm {
  n: number;
  amplitude: number;
  phaseDeg: number;
}

export function synthesizeFourier(harmonics: HarmonicTerm[], samples = 240): Array<{ t: number; y: number }> {
  const out: Array<{ t: number; y: number }> = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * 2 * Math.PI;
    let y = 0;
    for (const h of harmonics) {
      y += h.amplitude * Math.sin(h.n * t + (h.phaseDeg * Math.PI) / 180);
    }
    out.push({ t, y });
  }
  return out;
}

export function computeRcBodePoint(freqHz: number, rOhm: number, cFarad: number, mode: 'lowpass' | 'highpass') {
  const fc = 1 / (2 * Math.PI * Math.max(1e-12, rOhm * cFarad));
  const ratio = freqHz / fc;
  const mag =
    mode === 'lowpass' ? 1 / Math.sqrt(1 + ratio * ratio) : ratio / Math.sqrt(1 + ratio * ratio);
  const magDb = 20 * Math.log10(Math.max(1e-9, mag));
  const phaseDeg =
    mode === 'lowpass'
      ? (-Math.atan(ratio) * 180) / Math.PI
      : ((Math.PI / 2 - Math.atan(ratio)) * 180) / Math.PI;
  return { fc, magDb, phaseDeg };
}

export function calculateDoppler(fSourceHz: number, vWave: number, vObserver: number, vSource: number) {
  // Positive vObserver = moving toward source; positive vSource = moving toward observer
  const denom = Math.max(1e-6, vWave - vSource);
  const fObserved = fSourceHz * ((vWave + vObserver) / denom);
  return { fObserved, shiftHz: fObserved - fSourceHz };
}

/* ============================================================================
   9. ASTROPHYSICS & ORBITAL MECHANICS
   ============================================================================ */
export const G_CONST = 6.6743e-11;
export const C_LIGHT = 299792458;

export interface CelestialBody {
  id: string;
  name: string;
  massKg: number;
  radiusKm: number;
}

export const CELESTIAL_BODIES: CelestialBody[] = [
  { id: 'earth', name: 'Earth', massKg: 5.9722e24, radiusKm: 6371 },
  { id: 'moon', name: 'Moon', massKg: 7.342e22, radiusKm: 1737.4 },
  { id: 'mars', name: 'Mars', massKg: 6.4171e23, radiusKm: 3389.5 },
  { id: 'jupiter', name: 'Jupiter', massKg: 1.8982e27, radiusKm: 69911 },
  { id: 'sun', name: 'Sun', massKg: 1.98847e30, radiusKm: 696340 },
];

export function calculateOrbitMetrics(massKg: number, bodyRadiusKm: number, alt1Km: number, alt2Km: number) {
  const mu = G_CONST * massKg;
  const r1 = (bodyRadiusKm + Math.max(0, alt1Km)) * 1000;
  const r2 = (bodyRadiusKm + Math.max(0, alt2Km)) * 1000;

  const vCirc1 = Math.sqrt(mu / r1);
  const vEscape1 = Math.sqrt((2 * mu) / r1);
  const period1Sec = 2 * Math.PI * Math.sqrt(Math.pow(r1, 3) / mu);

  // Hohmann transfer from r1 to r2
  const aTrans = (r1 + r2) / 2;
  const vTrans1 = Math.sqrt(mu * (2 / r1 - 1 / aTrans));
  const vTrans2 = Math.sqrt(mu * (2 / r2 - 1 / aTrans));
  const vCirc2 = Math.sqrt(mu / r2);
  const dv1 = Math.abs(vTrans1 - vCirc1);
  const dv2 = Math.abs(vCirc2 - vTrans2);
  const transferTimeSec = Math.PI * Math.sqrt(Math.pow(aTrans, 3) / mu);
  const schwarzschildM = (2 * mu) / (C_LIGHT * C_LIGHT);

  return {
    vCirc1KmS: vCirc1 / 1000,
    vEscape1KmS: vEscape1 / 1000,
    period1Min: period1Sec / 60,
    dv1KmS: dv1 / 1000,
    dv2KmS: dv2 / 1000,
    totalDvKmS: (dv1 + dv2) / 1000,
    transferTimeMin: transferTimeSec / 60,
    schwarzschildM,
  };
}

/* ============================================================================
   10. MICROBIOLOGY & PCR / LAB BIO
   ============================================================================ */
export interface RestrictionEnzyme {
  name: string;
  site: string;
  cutOffset: number;
}

export const RESTRICTION_ENZYMES: RestrictionEnzyme[] = [
  { name: 'EcoRI', site: 'GAATTC', cutOffset: 1 },
  { name: 'BamHI', site: 'GGATCC', cutOffset: 1 },
  { name: 'HindIII', site: 'AAGCTT', cutOffset: 1 },
  { name: 'NotI', site: 'GCGGCCGC', cutOffset: 2 },
  { name: 'XhoI', site: 'CTCGAG', cutOffset: 1 },
  { name: 'SalI', site: 'GTCGAC', cutOffset: 1 },
  { name: 'PstI', site: 'CTGCAG', cutOffset: 5 },
  { name: 'KpnI', site: 'GGTACC', cutOffset: 5 },
  { name: 'SacI', site: 'GAGCTC', cutOffset: 5 },
  { name: 'SmaI', site: 'CCCGGG', cutOffset: 3 },
  { name: 'BglII', site: 'AGATCT', cutOffset: 1 },
  { name: 'NdeI', site: 'CATATG', cutOffset: 2 },
];

export function analyzePcrPrimer(seqRaw: string, naConcMm = 50) {
  const seq = seqRaw.toUpperCase().replace(/[^ACGT]/g, '');
  const len = seq.length;
  const counts = { A: 0, C: 0, G: 0, T: 0 };
  for (const ch of seq) counts[ch as keyof typeof counts]++;
  const gcPct = len > 0 ? ((counts.G + counts.C) / len) * 100 : 0;
  const tmWallace = len > 0 ? 2 * (counts.A + counts.T) + 4 * (counts.G + counts.C) : 0;
  // Salt-adjusted Marmur-Doty formula for oligos > 13 nt
  const saltTerm = 16.6 * Math.log10(Math.max(1, naConcMm) / 1000);
  const tmSalt = len > 0 ? 81.5 + saltTerm + 0.41 * gcPct - 675 / len : 0;
  const threePrime = seq.slice(-5);
  const gcClamp = (threePrime.match(/[GC]/g) || []).length;
  return { seq, len, gcPct, tmWallace, tmSalt, recommendedTa: Math.max(45, tmSalt - 5), gcClamp };
}

export function scanRestrictionSites(seqRaw: string) {
  const seq = seqRaw.toUpperCase().replace(/[^ACGT]/g, '');
  return RESTRICTION_ENZYMES.map(enz => {
    const positions: number[] = [];
    let idx = seq.indexOf(enz.site);
    while (idx !== -1) {
      positions.push(idx + enz.cutOffset);
      idx = seq.indexOf(enz.site, idx + 1);
    }
    return { ...enz, positions };
  }).filter(item => item.positions.length > 0);
}

export function convertDnaNgToNm(ngPerUl: number, lengthBp: number, isSingleStranded = false): number {
  const mwPerBp = isSingleStranded ? 330 : 660;
  if (lengthBp <= 0) return 0;
  return (ngPerUl * 1e6) / (mwPerBp * lengthBp);
}

export function calculateLigationInsertNg(
  vectorNg: number,
  vectorKb: number,
  insertKb: number,
  molarRatio: number
): number {
  if (vectorKb <= 0) return 0;
  return vectorNg * (insertKb / vectorKb) * molarRatio;
}

/* ============================================================================
   11. MATERIALS, STRUCTURAL MECHANICS & CODATA CONSTANTS
   ============================================================================ */
export interface CodataConstant {
  name: string;
  symbol: string;
  value: string;
  unit: string;
}

export const CODATA_CONSTANTS: CodataConstant[] = [
  { name: 'Speed of light in vacuum', symbol: 'c', value: '299 792 458', unit: 'm/s' },
  { name: 'Planck constant', symbol: 'h', value: '6.626 070 15 × 10⁻³⁴', unit: 'J·s' },
  { name: 'Elementary charge', symbol: 'e', value: '1.602 176 634 × 10⁻¹⁹', unit: 'C' },
  { name: 'Boltzmann constant', symbol: 'kB', value: '1.380 649 × 10⁻²³', unit: 'J/K' },
  { name: 'Avogadro constant', symbol: 'NA', value: '6.022 140 76 × 10²³', unit: 'mol⁻¹' },
  { name: 'Molar gas constant', symbol: 'R', value: '8.314 462 618', unit: 'J/(mol·K)' },
  { name: 'Faraday constant', symbol: 'F', value: '96 485.332 12', unit: 'C/mol' },
  { name: 'Newtonian constant of gravitation', symbol: 'G', value: '6.674 30 × 10⁻¹¹', unit: 'm³/(kg·s²)' },
  { name: 'Standard gravity', symbol: 'g₀', value: '9.806 65', unit: 'm/s²' },
  { name: 'Electron mass', symbol: 'me', value: '9.109 383 7015 × 10⁻³¹', unit: 'kg' },
  { name: 'Proton mass', symbol: 'mp', value: '1.672 621 923 69 × 10⁻²⁷', unit: 'kg' },
  { name: 'Stefan–Boltzmann constant', symbol: 'σ', value: '5.670 374 419 × 10⁻⁸', unit: 'W/(m²·K⁴)' },
  { name: 'Vacuum electric permittivity', symbol: 'ε₀', value: '8.854 187 8128 × 10⁻¹²', unit: 'F/m' },
];

export interface MaterialProp {
  name: string;
  youngGpa: number;
  yieldMpa: number;
  densityKgM3: number;
  thermalAlpha1e6: number; // ×10⁻⁶ /K
}

export const ENGINEERING_MATERIALS: MaterialProp[] = [
  { name: 'Structural Steel (A36)', youngGpa: 200, yieldMpa: 250, densityKgM3: 7850, thermalAlpha1e6: 12 },
  { name: 'Stainless Steel (304)', youngGpa: 193, yieldMpa: 215, densityKgM3: 8000, thermalAlpha1e6: 17.3 },
  { name: 'Aluminum (6061-T6)', youngGpa: 68.9, yieldMpa: 276, densityKgM3: 2700, thermalAlpha1e6: 23.6 },
  { name: 'Titanium (Ti-6Al-4V)', youngGpa: 113.8, yieldMpa: 880, densityKgM3: 4430, thermalAlpha1e6: 8.6 },
  { name: 'Copper (Annealed)', youngGpa: 117, yieldMpa: 70, densityKgM3: 8960, thermalAlpha1e6: 16.5 },
  { name: 'Carbon Fiber (CFRP)', youngGpa: 150, yieldMpa: 600, densityKgM3: 1600, thermalAlpha1e6: 2.0 },
  { name: 'Concrete (Standard)', youngGpa: 30, yieldMpa: 30, densityKgM3: 2400, thermalAlpha1e6: 10 },
  { name: 'Oak Wood (Parallel)', youngGpa: 11, yieldMpa: 45, densityKgM3: 750, thermalAlpha1e6: 5.0 },
];

export function calculateBeamDeflection(
  support: 'simply-supported' | 'cantilever',
  loadN: number,
  lengthM: number,
  youngGpa: number,
  inertiaCm4: number
) {
  const E = Math.max(1e-6, youngGpa) * 1e9; // Pa
  const I = Math.max(1e-9, inertiaCm4) * 1e-8; // m^4
  const L = Math.max(0.01, lengthM);
  const maxDeflectionM =
    support === 'simply-supported' ? (loadN * L ** 3) / (48 * E * I) : (loadN * L ** 3) / (3 * E * I);
  const maxMomentNm = support === 'simply-supported' ? (loadN * L) / 4 : loadN * L;
  return { maxDeflectionMm: maxDeflectionM * 1000, maxMomentNm };
}

export function calculateReynolds(densityKgM3: number, velocityMs: number, diameterM: number, viscosityPaS: number) {
  const re = viscosityPaS > 0 ? (densityKgM3 * velocityMs * diameterM) / viscosityPaS : 0;
  const regime: 'laminar' | 'transitional' | 'turbulent' =
    re < 2300 ? 'laminar' : re < 4000 ? 'transitional' : 'turbulent';
  return { re, regime };
}
