import { describe, it, expect } from 'vitest';
import {
  simulateDebtPayoff,
  simulateRentVsBuy,
  simulateDividendDrip,
  computeBlackScholes,
  computeKellyFraction,
  computeBondMetrics,
  computeProgressiveSalaryTax,
  computeInflationImpact,
} from '../utils/financeSuite.logic';
import {
  computeWallHeatTransfer,
  computeRadiationHeatW,
  computeCarnotOtto,
  computeVanDerWaals,
  computePsychrometrics,
  computeKinetics,
  computeArrhenius,
  computeBeerLambert,
  computePhotonFromWavelengthNm,
  computeOpAmp,
  compute555Timer,
  computePcbTraceWidthIpc2221,
  solveLinearProgram2D,
  solveOdeFirstOrder,
  analyzeGraph,
  evaluateSequenceSeries,
  bigModPow,
  extendedGcdBigInt,
  modInverseBigInt,
  eulerTotient,
  solveChineseRemainder,
} from '../utils/scienceMathExt.logic';

describe('financeSuite.logic', () => {
  it('avalanche pays less or equal interest than snowball', () => {
    const debts = [
      { id: '1', name: 'Small Low APR', balance: 2000, aprPct: 5, minPayment: 100 },
      { id: '2', name: 'Large High APR', balance: 8000, aprPct: 22, minPayment: 200 },
    ];
    const snow = simulateDebtPayoff(debts, 300, 'snowball');
    const aval = simulateDebtPayoff(debts, 300, 'avalanche');
    expect(aval.capped).toBe(false);
    expect(snow.capped).toBe(false);
    expect(aval.totalInterestPaid).toBeLessThan(snow.totalInterestPaid);
  });

  it('simulates rent vs buy net worth schedule cleanly', () => {
    const res = simulateRentVsBuy({
      homePrice: 400000,
      downPaymentPct: 20,
      mortgageRatePct: 5,
      loanTermYears: 30,
      propertyTaxPct: 1,
      maintenancePct: 1,
      homeAppreciationPct: 4,
      closingBuyPct: 3,
      closingSellPct: 5,
      monthlyRent: 2200,
      rentInflationPct: 3,
      investmentReturnPct: 6,
      horizonYears: 15,
    });
    expect(res.monthlyMortgagePayment).toBeCloseTo(1717.83, 1);
    expect(res.schedule.length).toBe(15);
    expect(res.finalBuyNetWorth).toBeGreaterThan(0);
  });

  it('simulates DRIP reinvestment outperforming cash payout portfolio value', () => {
    const withDrip = simulateDividendDrip({
      initialInvestment: 20000,
      monthlyContribution: 300,
      startingYieldPct: 4,
      dividendGrowthPct: 5,
      priceGrowthPct: 4,
      taxRatePct: 15,
      reinvestDividends: true,
      years: 15,
    });
    const noDrip = simulateDividendDrip({
      initialInvestment: 20000,
      monthlyContribution: 300,
      startingYieldPct: 4,
      dividendGrowthPct: 5,
      priceGrowthPct: 4,
      taxRatePct: 15,
      reinvestDividends: false,
      years: 15,
    });
    expect(withDrip.finalPortfolioValue).toBeGreaterThan(noDrip.finalPortfolioValue);
    expect(withDrip.finalAnnualNetDividend).toBeGreaterThan(noDrip.finalAnnualNetDividend);
  });

  it('satisfies Black-Scholes put-call parity and Kelly formula', () => {
    const bs = computeBlackScholes({
      spot: 100,
      strike: 100,
      timeYears: 1,
      riskFreeRatePct: 5,
      volatilityPct: 20,
      dividendYieldPct: 0,
    });
    // Put-Call Parity: C - P = S - K * exp(-rT)
    const lhs = bs.call.price - bs.put.price;
    const rhs = 100 - 100 * Math.exp(-0.05);
    expect(lhs).toBeCloseTo(rhs, 4);
    expect(bs.call.delta).toBeGreaterThan(0.5);
    expect(bs.call.delta - bs.put.delta).toBeCloseTo(1, 5);

    const kelly = computeKellyFraction(60, 2);
    // f* = 0.6 - 0.4 / 2 = 0.4 -> 40%
    expect(kelly.fullKellyPct).toBeCloseTo(40, 4);
    expect(kelly.halfKellyPct).toBeCloseTo(20, 4);
  });

  it('solves par bond YTM equal to coupon rate', () => {
    const bond = computeBondMetrics({
      faceValue: 1000,
      couponRatePct: 6,
      marketPrice: 1000,
      yearsToMaturity: 10,
      paymentsPerYear: 2,
    });
    expect(bond.ytmPct).toBeCloseTo(6, 3);
    expect(bond.currentYieldPct).toBeCloseTo(6, 3);
    expect(bond.macaulayDuration).toBeGreaterThan(7);
    expect(bond.modifiedDuration).toBeLessThan(bond.macaulayDuration);
  });

  it('computes progressive salary tax and inflation Fisher return', () => {
    const tax = computeProgressiveSalaryTax({
      grossAnnual: 100000,
      standardDeduction: 10000,
      employeeSocialHealthPct: 10,
      employerPayrollPct: 15,
      taxCreditAnnual: 1000,
      brackets: [
        { upTo: 50000, ratePct: 15 },
        { upTo: null, ratePct: 25 },
      ],
    });
    // Taxable = 90k -> 50k*0.15 + 40k*0.25 = 7500 + 10000 = 17500 - 1000 credit = 16500
    expect(tax.incomeTaxAnnual).toBeCloseTo(16500, 2);
    expect(tax.netAnnual).toBeCloseTo(73500, 2);

    const inf = computeInflationImpact(1000, 3, 10, 4);
    expect(inf.futureEquivalentCost).toBeCloseTo(1000 * Math.pow(1.03, 10), 2);
    expect(inf.requiredNominalReturnPct).toBeCloseTo((1.04 * 1.03 - 1) * 100, 4);
  });
});

describe('scienceMathExt.logic', () => {
  it('computes thermodynamics, real gas & psychrometrics accurately', () => {
    const wall = computeWallHeatTransfer([{ name: 'Foam', thicknessM: 0.1, conductivityWmK: 0.04 }], 10, 20);
    expect(wall.totalR).toBeCloseTo(2.5, 4);
    expect(wall.uValue).toBeCloseTo(0.4, 4);
    expect(wall.heatFluxW).toBeCloseTo(80, 3);

    expect(computeRadiationHeatW(1, 1, 300, 300)).toBeCloseTo(0, 6);

    const cyc = computeCarnotOtto(600, 300, 8, 1.4);
    expect(cyc.carnotEffPct).toBeCloseTo(50, 4);
    expect(cyc.copHeatPump).toBeCloseTo(2, 4);
    expect(cyc.ottoEffPct).toBeGreaterThan(50);

    const vdw = computeVanDerWaals(1, 22.414, 273.15, 0, 0);
    expect(vdw.idealAtm).toBeCloseTo(1, 2);
    expect(vdw.realAtm).toBeCloseTo(1, 2);

    const psy = computePsychrometrics(25, 100);
    expect(psy.dewPointC).toBeCloseTo(25, 1);
  });

  it('computes chemical kinetics, Arrhenius, Beer-Lambert & photon energy', () => {
    const kin = computeKinetics(1, 1, Math.LN2, 1);
    expect(kin.halfLife).toBeCloseTo(1, 5);
    expect(kin.ct).toBeCloseTo(0.5, 5);

    const arr = computeArrhenius(1e10, 50, 300, 320);
    expect(arr.ratio).toBeGreaterThan(1);

    const beer = computeBeerLambert(1000, 1, 0.001);
    expect(beer.absorbance).toBeCloseTo(1, 5);
    expect(beer.transmittancePct).toBeCloseTo(10, 4);

    const ph = computePhotonFromWavelengthNm(500);
    expect(ph.region).toBe('Visible Light');
    expect(ph.energyEv).toBeCloseTo(2.4797, 3);
  });

  it('computes Op-Amp, 555 Timer & IPC-2221 PCB trace width', () => {
    const op = computeOpAmp(1000, 9000, 0.5);
    expect(op.invGain).toBeCloseTo(-9, 5);
    expect(op.nonInvGain).toBeCloseTo(10, 5);

    const t555 = compute555Timer(1000, 10000, 10);
    expect(t555.freqHz).toBeGreaterThan(6);
    expect(t555.dutyCyclePct).toBeGreaterThan(50);

    const pcb = computePcbTraceWidthIpc2221(2, 10, 1, true);
    expect(pcb.widthMil).toBeGreaterThan(20);
    expect(pcb.widthMm).toBeCloseTo(pcb.widthMil * 0.0254, 5);
  });

  it('solves 2D Linear Programming, RK4 ODE, Graph Algorithms, Sequences & Modular Math', () => {
    const lp = solveLinearProgram2D(3, 5, true, [
      { a: 1, b: 0, op: '<=', rhs: 4 },
      { a: 0, b: 2, op: '<=', rhs: 12 },
      { a: 3, b: 2, op: '<=', rhs: 18 },
    ]);
    expect(lp.feasible).toBe(true);
    expect(lp.optimal?.x).toBeCloseTo(2, 4);
    expect(lp.optimal?.y).toBeCloseTo(6, 4);
    expect(lp.optimal?.z).toBeCloseTo(36, 4);

    // y' = y, y(0) = 1 => y(1) = e
    const ode = solveOdeFirstOrder('y', 0, 1, 1, 20);
    expect(ode.valid).toBe(true);
    expect(ode.points[ode.points.length - 1].yRk4).toBeCloseTo(Math.E, 4);

    const g = analyzeGraph(
      [
        { id: 'A', x: 0, y: 0 },
        { id: 'B', x: 1, y: 0 },
        { id: 'C', x: 2, y: 0 },
      ],
      [
        { from: 'A', to: 'B', weight: 2 },
        { from: 'B', to: 'C', weight: 3 },
        { from: 'A', to: 'C', weight: 10 },
      ],
      'A',
      'C',
      true
    );
    expect(g.shortestPath).toEqual(['A', 'B', 'C']);
    expect(g.shortestDistance).toBe(5);
    expect(g.mstTotalWeight).toBe(5);
    expect(g.topoOrder).toEqual(['A', 'B', 'C']);

    const seq = evaluateSequenceSeries({ mode: 'geometric', a1: 1, diffOrRatio: 0.5, pPower: 2, customExpr: '', count: 30 });
    expect(seq.valid).toBe(true);
    expect(seq.convergenceHint).toBe('converges');
    expect(seq.closedFormSum).toBeCloseTo(2, 6);

    expect(bigModPow(2n, 10n, 1000n)).toBe(24n);
    const eg = extendedGcdBigInt(240n, 46n);
    expect(eg.gcd).toBe(2n);
    expect(240n * eg.x + 46n * eg.y).toBe(2n);
    expect(modInverseBigInt(3n, 11n)).toBe(4n);
    expect(eulerTotient(36)).toBe(12);

    const crt = solveChineseRemainder([
      { remainder: 2n, modulus: 3n },
      { remainder: 3n, modulus: 5n },
      { remainder: 2n, modulus: 7n },
    ]);
    expect(crt.valid).toBe(true);
    expect(crt.solution).toBe(23n);
    expect(crt.combinedModulus).toBe(105n);
  });
});
