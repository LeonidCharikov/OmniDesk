import { describe, expect, it } from 'vitest';
import {
  analyzeBooleanExpression,
  analyzeCalculus,
  analyzeVectors,
  cMul,
  cNthRoots,
  continuedFraction,
  countSignificantFigures,
  decimalToExactFraction,
  evaluateFormulaPad,
  findNumericRoot,
  fitCurve,
  normalCdf,
  operateFractions,
  propagateFormulaError,
  runAbProportionTest,
  solveLinearSystem,
  solvePolynomialRoots,
  solveTriangle,
} from '../utils/mathSuite.logic';
import {
  analyzeGibbs,
  analyzePcrPrimer,
  calculateBeamDeflection,
  calculateDecay,
  calculateElectrochemistry,
  calculateOrbitMetrics,
  calculateReynolds,
  calculateSolutionPh,
  generateSerialDilution,
  generateTitrationCurve,
  scanRestrictionSites,
  solveIce1to1,
  solveSnell,
  solveThinLens,
} from '../utils/scienceSuite.logic';

describe('mathSuite.logic', () => {
  it('solves quadratic and cubic polynomials including complex roots', () => {
    const realRoots = solvePolynomialRoots([1, -5, 6]).map(r => r.re).sort((a, b) => a - b);
    expect(realRoots[0]).toBeCloseTo(2, 6);
    expect(realRoots[1]).toBeCloseTo(3, 6);

    const complexRoots = solvePolynomialRoots([1, 0, 4]);
    expect(complexRoots.every(r => Math.abs(r.re) < 1e-6 && Math.abs(Math.abs(r.im) - 2) < 1e-6)).toBe(true);
  });

  it('solves linear systems via Gaussian elimination and finds numeric roots', () => {
    const res = solveLinearSystem(
      [
        [2, 1, -1],
        [-3, -1, 2],
        [-2, 1, 2],
      ],
      [8, -11, -3]
    );
    expect(res.status).toBe('unique');
    expect(res.solution[0]).toBeCloseTo(2, 6);
    expect(res.solution[1]).toBeCloseTo(3, 6);
    expect(res.solution[2]).toBeCloseTo(-1, 6);

    const root = findNumericRoot('x^2 - 2', 1, 2);
    expect(root.root).toBeCloseTo(Math.SQRT2, 6);
  });

  it('computes derivatives, definite integrals, and probability CDF', () => {
    const calc = analyzeCalculus('x^2', 3, 0, 3);
    expect(calc.df1).toBeCloseTo(6, 4);
    expect(calc.df2).toBeCloseTo(2, 3);
    expect(calc.integral).toBeCloseTo(9, 4);

    expect(normalCdf(0)).toBeCloseTo(0.5, 5);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    const ab = runAbProportionTest(100, 1000, 150, 1000);
    expect(ab.significant95).toBe(true);
  });

  it('fits curves, analyzes vectors, complex roots, and triangles', () => {
    const fit = fitCurve(
      [
        { x: 1, y: 3 },
        { x: 2, y: 5 },
        { x: 3, y: 7 },
      ],
      'linear'
    );
    expect(fit).not.toBeNull();
    expect(fit!.rSquared).toBeCloseTo(1, 6);
    expect(fit!.predict(10)).toBeCloseTo(21, 5);

    const v = analyzeVectors({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    expect(v.dot).toBe(0);
    expect(v.angleDeg).toBeCloseTo(90, 5);
    expect(v.cross.z).toBeCloseTo(1, 5);

    expect(cMul({ re: 0, im: 1 }, { re: 0, im: 1 }).re).toBeCloseTo(-1, 6);
    expect(cNthRoots({ re: 1, im: 0 }, 4).length).toBe(4);

    const tri = solveTriangle('SSS', 3, 4, 5);
    expect(tri.valid).toBe(true);
    expect(tri.area).toBeCloseTo(6, 5);
    expect(tri.C).toBeCloseTo(90, 5);
  });

  it('handles exact fractions, boolean tables, formula scratchpad, and error propagation', () => {
    const sum = operateFractions({ n: 1n, d: 3n }, { n: 1n, d: 6n }, '+');
    expect(sum).toEqual({ n: 1n, d: 2n });

    const rep = decimalToExactFraction('0.1(6)');
    expect(rep).toEqual({ n: 1n, d: 6n });
    expect(continuedFraction({ n: 22n, d: 7n })).toEqual([3n, 7n]);

    const bool = analyzeBooleanExpression('(A AND B) OR (A AND NOT B)');
    expect(bool.simplifiedSop).toBe('A');

    const pad = evaluateFormulaPad('d = 12 km / 45 min in km/h\nx = 2 + 3');
    expect(pad[0].value).toBeCloseTo(16, 4);
    expect(pad[1].value).toBe(5);

    expect(countSignificantFigures('0.00450')).toBe(3);
    const err = propagateFormulaError('x * y', [
      { name: 'x', value: 10, uncertainty: 0.1 },
      { name: 'y', value: 20, uncertainty: 0.2 },
    ]);
    expect(err?.value).toBeCloseTo(200, 5);
    expect(err?.uncertainty).toBeCloseTo(Math.hypot(20 * 0.1, 10 * 0.2), 5);
  });
});

describe('scienceSuite.logic', () => {
  it('computes solution pH, titration equivalence, and serial dilution', () => {
    const strongAcid = calculateSolutionPh('strong-acid', 0.01);
    expect(strongAcid.pH).toBeCloseTo(2, 4);

    const tit = generateTitrationCurve('weak-acid', 0.1, 25, 0.1, 4.76);
    expect(tit.eqVolumeMl).toBeCloseTo(25, 4);
    expect(tit.eqPh).toBeGreaterThan(7);

    const steps = generateSerialDilution(100, 2, 10, 4);
    expect(steps[3].concentration).toBeCloseTo(6.25, 5);
  });

  it('computes Gibbs free energy, ICE equilibrium, electrochemistry, and radioactive decay', () => {
    const gibbs = analyzeGibbs(-100, -100, 298.15);
    expect(gibbs.spontaneous).toBe(true);
    expect(gibbs.crossoverTempK).toBeCloseTo(1000, 4);

    const ice = solveIce1to1(1, 1, 0, 0, 4);
    expect(ice.eqC).toBeCloseTo(2 / 3, 5);

    const echem = calculateElectrochemistry(0.34, -0.76, 2, 298.15, 1);
    expect(echem.e0Cell).toBeCloseTo(1.1, 5);
    expect(echem.spontaneous).toBe(true);

    const dec = calculateDecay(100, 5730, 11460);
    expect(dec.remaining).toBeCloseTo(25, 4);
  });

  it('computes optics, orbital mechanics, PCR primers, beam deflection, and Reynolds number', () => {
    const lens = solveThinLens(10, 20, 5);
    expect(lens.di).toBeCloseTo(20, 4);
    expect(lens.magnification).toBeCloseTo(-1, 4);

    const snell = solveSnell(1.5, 1.0, 60);
    expect(snell.tir).toBe(true);

    const orbit = calculateOrbitMetrics(5.9722e24, 6371, 400, 35786);
    expect(orbit.vCirc1KmS).toBeGreaterThan(7.5);
    expect(orbit.vCirc1KmS).toBeLessThan(7.8);
    expect(orbit.totalDvKmS).toBeGreaterThan(3.8);

    const primer = analyzePcrPrimer('ATGCGGAATTCGTACC');
    expect(primer.len).toBe(16);
    expect(scanRestrictionSites('ATGCGGAATTCGTACC').some(e => e.name === 'EcoRI')).toBe(true);

    const beam = calculateBeamDeflection('simply-supported', 1000, 2, 200, 100);
    expect(beam.maxMomentNm).toBeCloseTo(500, 4);
    expect(calculateReynolds(1000, 0.01, 0.05, 0.001).regime).toBe('laminar');
  });
});
