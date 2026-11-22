/**
 * Pure, framework-free financial calculation engines for OmniDesk Finance tools.
 * Zero `any`, zero external APIs, 100% deterministic offline math.
 */

/* ─────────────────────────────────────────────────────────────
   1. DEBT PAYOFF PLANNER (SNOWBALL VS. AVALANCHE)
   ───────────────────────────────────────────────────────────── */
export interface DebtAccount {
  id: string;
  name: string;
  balance: number;
  aprPct: number;
  minPayment: number;
}

export interface DebtPayoffMonthPoint {
  month: number;
  totalBalance: number;
  cumulativeInterest: number;
}

export interface DebtStrategyResult {
  strategy: 'snowball' | 'avalanche';
  monthsToPayoff: number;
  totalInterestPaid: number;
  totalPaid: number;
  payoffOrder: Array<{ id: string; name: string; paidOffMonth: number }>;
  timeline: DebtPayoffMonthPoint[];
  capped: boolean;
}

export function simulateDebtPayoff(
  debts: readonly DebtAccount[],
  extraMonthlyPayment: number,
  strategy: 'snowball' | 'avalanche',
  maxMonths = 600
): DebtStrategyResult {
  const active = debts
    .filter(d => d.balance > 0)
    .map(d => ({
      id: d.id,
      name: d.name,
      balance: Math.max(0, d.balance),
      monthlyRate: Math.max(0, d.aprPct) / 100 / 12,
      minPayment: Math.max(0, d.minPayment),
      paidOffMonth: 0,
    }));

  const timeline: DebtPayoffMonthPoint[] = [
    {
      month: 0,
      totalBalance: active.reduce((s, d) => s + d.balance, 0),
      cumulativeInterest: 0,
    },
  ];

  const extraBudget = Math.max(0, extraMonthlyPayment);
  const baseMinBudget = active.reduce((s, d) => s + d.minPayment, 0);
  const totalMonthlyBudget = baseMinBudget + extraBudget;

  let month = 0;
  let totalInterestPaid = 0;
  let totalPaid = 0;

  while (month < maxMonths && active.some(d => d.balance > 0.005)) {
    month += 1;

    // 1. Accrue interest
    for (const d of active) {
      if (d.balance <= 0) continue;
      const interest = d.balance * d.monthlyRate;
      d.balance += interest;
      totalInterestPaid += interest;
    }

    // 2. Pay minimum payments first
    let remainingBudget = totalMonthlyBudget;
    for (const d of active) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.balance, d.minPayment, remainingBudget);
      d.balance -= pay;
      totalPaid += pay;
      remainingBudget -= pay;
      if (d.balance <= 0.005) {
        d.balance = 0;
        if (d.paidOffMonth === 0) d.paidOffMonth = month;
      }
    }

    // 3. Roll leftover budget onto priority target (snowball = lowest balance, avalanche = highest APR)
    if (remainingBudget > 0.005) {
      const targets = active
        .filter(d => d.balance > 0)
        .sort((a, b) =>
          strategy === 'snowball'
            ? a.balance - b.balance || b.monthlyRate - a.monthlyRate
            : b.monthlyRate - a.monthlyRate || a.balance - b.balance
        );

      for (const target of targets) {
        if (remainingBudget <= 0.005) break;
        const pay = Math.min(target.balance, remainingBudget);
        target.balance -= pay;
        totalPaid += pay;
        remainingBudget -= pay;
        if (target.balance <= 0.005) {
          target.balance = 0;
          if (target.paidOffMonth === 0) target.paidOffMonth = month;
        }
      }
    }

    timeline.push({
      month,
      totalBalance: active.reduce((s, d) => s + d.balance, 0),
      cumulativeInterest: totalInterestPaid,
    });
  }

  const capped = active.some(d => d.balance > 0.005);
  const payoffOrder = active
    .filter(d => d.paidOffMonth > 0)
    .sort((a, b) => a.paidOffMonth - b.paidOffMonth)
    .map(d => ({ id: d.id, name: d.name, paidOffMonth: d.paidOffMonth }));

  return {
    strategy,
    monthsToPayoff: month,
    totalInterestPaid,
    totalPaid,
    payoffOrder,
    timeline,
    capped,
  };
}

/* ─────────────────────────────────────────────────────────────
   2. RENT VS. BUY HOME CALCULATOR
   ───────────────────────────────────────────────────────────── */
export interface RentVsBuyInput {
  homePrice: number;
  downPaymentPct: number;
  mortgageRatePct: number;
  loanTermYears: number;
  propertyTaxPct: number;
  maintenancePct: number;
  homeAppreciationPct: number;
  closingBuyPct: number;
  closingSellPct: number;
  monthlyRent: number;
  rentInflationPct: number;
  investmentReturnPct: number;
  horizonYears: number;
}

export interface RentVsBuyYearRow {
  year: number;
  buyNetWorth: number;
  rentNetWorth: number;
  homeValue: number;
  loanBalance: number;
  monthlyRentAtYear: number;
}

export interface RentVsBuyResult {
  monthlyMortgagePayment: number;
  initialCashOutlayBuy: number;
  breakEvenYear: number | null;
  finalBuyNetWorth: number;
  finalRentNetWorth: number;
  advantageBuy: number;
  schedule: RentVsBuyYearRow[];
}

export function simulateRentVsBuy(inp: RentVsBuyInput): RentVsBuyResult {
  const price = Math.max(1, inp.homePrice);
  const down = price * (Math.max(0, Math.min(100, inp.downPaymentPct)) / 100);
  const loanPrincipal = Math.max(0, price - down);
  const closingBuy = price * (Math.max(0, inp.closingBuyPct) / 100);
  const initialCashOutlayBuy = down + closingBuy;

  const rMonthly = Math.max(0, inp.mortgageRatePct) / 100 / 12;
  const nMonths = Math.max(1, Math.round(inp.loanTermYears * 12));
  const monthlyMortgagePayment =
    loanPrincipal <= 0
      ? 0
      : rMonthly === 0
      ? loanPrincipal / nMonths
      : (loanPrincipal * (rMonthly * Math.pow(1 + rMonthly, nMonths))) / (Math.pow(1 + rMonthly, nMonths) - 1);

  const invMonthlyRate = Math.pow(1 + inp.investmentReturnPct / 100, 1 / 12) - 1;
  const horizon = Math.max(1, Math.min(50, Math.round(inp.horizonYears)));

  let homeValue = price;
  let loanBalance = loanPrincipal;
  // Renter starts by investing what the buyer paid upfront (down payment + closing costs)
  let renterPortfolio = initialCashOutlayBuy;
  let buyerSidePortfolio = 0;

  let breakEvenYear: number | null = null;
  const schedule: RentVsBuyYearRow[] = [];

  for (let yr = 1; yr <= horizon; yr++) {
    const currentMonthlyRent = inp.monthlyRent * Math.pow(1 + inp.rentInflationPct / 100, yr - 1);

    for (let m = 1; m <= 12; m++) {
      // Mortgage payment & amortization
      let mortPay = 0;
      if (loanBalance > 0.01) {
        const interest = loanBalance * rMonthly;
        mortPay = Math.min(monthlyMortgagePayment, loanBalance + interest);
        const principalPaid = Math.max(0, mortPay - interest);
        loanBalance = Math.max(0, loanBalance - principalPaid);
      }

      const monthlyTax = (homeValue * (inp.propertyTaxPct / 100)) / 12;
      const monthlyMaint = (homeValue * (inp.maintenancePct / 100)) / 12;
      const totalBuyMonthlyCost = mortPay + monthlyTax + monthlyMaint;

      // Compound side investment portfolios
      renterPortfolio *= 1 + invMonthlyRate;
      buyerSidePortfolio *= 1 + invMonthlyRate;

      // Whoever pays less this month invests the difference
      const diff = totalBuyMonthlyCost - currentMonthlyRent;
      if (diff > 0) {
        renterPortfolio += diff;
      } else {
        buyerSidePortfolio += -diff;
      }

      // Monthly home appreciation
      homeValue *= Math.pow(1 + inp.homeAppreciationPct / 100, 1 / 12);
    }

    const sellingCosts = homeValue * (Math.max(0, inp.closingSellPct) / 100);
    const buyNetWorth = homeValue - sellingCosts - loanBalance + buyerSidePortfolio;
    const rentNetWorth = renterPortfolio;

    if (breakEvenYear === null && buyNetWorth >= rentNetWorth) {
      breakEvenYear = yr;
    }

    schedule.push({
      year: yr,
      buyNetWorth,
      rentNetWorth,
      homeValue,
      loanBalance,
      monthlyRentAtYear: currentMonthlyRent,
    });
  }

  const last = schedule[schedule.length - 1];
  return {
    monthlyMortgagePayment,
    initialCashOutlayBuy,
    breakEvenYear,
    finalBuyNetWorth: last?.buyNetWorth ?? 0,
    finalRentNetWorth: last?.rentNetWorth ?? 0,
    advantageBuy: (last?.buyNetWorth ?? 0) - (last?.rentNetWorth ?? 0),
    schedule,
  };
}

/* ─────────────────────────────────────────────────────────────
   3. DIVIDEND & DRIP INCOME SIMULATOR
   ───────────────────────────────────────────────────────────── */
export interface DividendDripInput {
  initialInvestment: number;
  monthlyContribution: number;
  startingYieldPct: number;
  dividendGrowthPct: number;
  priceGrowthPct: number;
  taxRatePct: number;
  reinvestDividends: boolean;
  years: number;
}

export interface DividendDripYearRow {
  year: number;
  portfolioValue: number;
  totalContributed: number;
  annualNetDividend: number;
  monthlyNetDividend: number;
  yieldOnCostPct: number;
  cumulativeDividends: number;
}

export interface DividendDripResult {
  finalPortfolioValue: number;
  finalAnnualNetDividend: number;
  finalMonthlyNetDividend: number;
  finalYieldOnCostPct: number;
  totalDividendsEarned: number;
  schedule: DividendDripYearRow[];
}

export function simulateDividendDrip(inp: DividendDripInput): DividendDripResult {
  const years = Math.max(1, Math.min(50, Math.round(inp.years)));
  const taxMult = 1 - Math.max(0, Math.min(60, inp.taxRatePct)) / 100;
  const priceGrowth = inp.priceGrowthPct / 100;
  const divGrowth = inp.dividendGrowthPct / 100;

  let sharePrice = 100;
  let shares = Math.max(0, inp.initialInvestment) / sharePrice;
  let annualDivPerShare = sharePrice * (Math.max(0, inp.startingYieldPct) / 100);
  let totalContributed = Math.max(0, inp.initialInvestment);
  let cumulativeDividends = 0;

  const schedule: DividendDripYearRow[] = [];

  for (let yr = 1; yr <= years; yr++) {
    let yearlyNetDiv = 0;

    // Quarterly dividend payouts + monthly contributions
    for (let q = 1; q <= 4; q++) {
      // 3 months of contributions & gradual share price drift
      for (let m = 1; m <= 3; m++) {
        sharePrice *= Math.pow(1 + priceGrowth, 1 / 12);
        if (inp.monthlyContribution > 0) {
          shares += inp.monthlyContribution / sharePrice;
          totalContributed += inp.monthlyContribution;
        }
      }

      const quarterNetDiv = shares * (annualDivPerShare / 4) * taxMult;
      yearlyNetDiv += quarterNetDiv;
      cumulativeDividends += quarterNetDiv;

      if (inp.reinvestDividends && quarterNetDiv > 0) {
        shares += quarterNetDiv / sharePrice;
      }
    }

    const portfolioValue = shares * sharePrice;
    const yieldOnCostPct = totalContributed > 0 ? (yearlyNetDiv / totalContributed) * 100 : 0;

    schedule.push({
      year: yr,
      portfolioValue,
      totalContributed,
      annualNetDividend: yearlyNetDiv,
      monthlyNetDividend: yearlyNetDiv / 12,
      yieldOnCostPct,
      cumulativeDividends,
    });

    annualDivPerShare *= 1 + divGrowth;
  }

  const last = schedule[schedule.length - 1];
  return {
    finalPortfolioValue: last?.portfolioValue ?? 0,
    finalAnnualNetDividend: last?.annualNetDividend ?? 0,
    finalMonthlyNetDividend: last?.monthlyNetDividend ?? 0,
    finalYieldOnCostPct: last?.yieldOnCostPct ?? 0,
    totalDividendsEarned: cumulativeDividends,
    schedule,
  };
}

/* ─────────────────────────────────────────────────────────────
   4. BLACK-SCHOLES OPTIONS, GREEKS & KELLY CRITERION
   ───────────────────────────────────────────────────────────── */
export interface BlackScholesInput {
  spot: number;
  strike: number;
  timeYears: number;
  riskFreeRatePct: number;
  volatilityPct: number;
  dividendYieldPct?: number;
}

export interface OptionGreeks {
  price: number;
  delta: number;
  gamma: number;
  thetaPerDay: number;
  vegaPerPct: number;
  rhoPerPct: number;
  intrinsic: number;
  timeValue: number;
}

export interface BlackScholesResult {
  d1: number;
  d2: number;
  call: OptionGreeks;
  put: OptionGreeks;
}

function stdNormPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function stdNormCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * ax);
  const poly =
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) *
    Math.exp(-ax * ax);
  const erf = sign * (1 - poly);
  return 0.5 * (1 + erf);
}

export function computeBlackScholes(inp: BlackScholesInput): BlackScholesResult {
  const S = Math.max(1e-6, inp.spot);
  const K = Math.max(1e-6, inp.strike);
  const T = Math.max(1e-6, inp.timeYears);
  const r = inp.riskFreeRatePct / 100;
  const q = (inp.dividendYieldPct ?? 0) / 100;
  const sigma = Math.max(1e-6, inp.volatilityPct / 100);

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const discR = Math.exp(-r * T);
  const discQ = Math.exp(-q * T);
  const nd1 = stdNormCdf(d1);
  const nd2 = stdNormCdf(d2);
  const nNegD1 = stdNormCdf(-d1);
  const nNegD2 = stdNormCdf(-d2);
  const pdfD1 = stdNormPdf(d1);

  const callPrice = S * discQ * nd1 - K * discR * nd2;
  const putPrice = K * discR * nNegD2 - S * discQ * nNegD1;

  const gamma = (discQ * pdfD1) / (S * sigma * sqrtT);
  const vegaPerPct = (S * discQ * pdfD1 * sqrtT) / 100;

  const callThetaYear =
    -(S * discQ * pdfD1 * sigma) / (2 * sqrtT) - r * K * discR * nd2 + q * S * discQ * nd1;
  const putThetaYear =
    -(S * discQ * pdfD1 * sigma) / (2 * sqrtT) + r * K * discR * nNegD2 - q * S * discQ * nNegD1;

  const callIntrinsic = Math.max(0, S - K);
  const putIntrinsic = Math.max(0, K - S);

  return {
    d1,
    d2,
    call: {
      price: callPrice,
      delta: discQ * nd1,
      gamma,
      thetaPerDay: callThetaYear / 365,
      vegaPerPct,
      rhoPerPct: (K * T * discR * nd2) / 100,
      intrinsic: callIntrinsic,
      timeValue: Math.max(0, callPrice - callIntrinsic),
    },
    put: {
      price: putPrice,
      delta: discQ * (nd1 - 1),
      gamma,
      thetaPerDay: putThetaYear / 365,
      vegaPerPct,
      rhoPerPct: (-K * T * discR * nNegD2) / 100,
      intrinsic: putIntrinsic,
      timeValue: Math.max(0, putPrice - putIntrinsic),
    },
  };
}

export interface KellyResult {
  fullKellyPct: number;
  halfKellyPct: number;
  expectedValuePerUnit: number;
  breakevenWinRatePct: number;
}

export function computeKellyFraction(winProbPct: number, rewardToRiskRatio: number): KellyResult {
  const p = Math.max(0, Math.min(1, winProbPct / 100));
  const q = 1 - p;
  const b = Math.max(1e-6, rewardToRiskRatio);
  const full = p - q / b;
  const expectedValuePerUnit = p * b - q;
  const breakevenWinRatePct = (1 / (1 + b)) * 100;
  return {
    fullKellyPct: full * 100,
    halfKellyPct: Math.max(0, full * 50),
    expectedValuePerUnit,
    breakevenWinRatePct,
  };
}

/* ─────────────────────────────────────────────────────────────
   5. BOND YIELD, YTM & DURATION CALCULATOR
   ───────────────────────────────────────────────────────────── */
export interface BondInput {
  faceValue: number;
  couponRatePct: number;
  marketPrice: number;
  yearsToMaturity: number;
  paymentsPerYear: number;
}

export interface BondResult {
  annualCoupon: number;
  currentYieldPct: number;
  ytmPct: number;
  macaulayDuration: number;
  modifiedDuration: number;
  convexity: number;
  priceCurve: Array<{ yieldPct: number; price: number }>;
}

export function priceBondFromYield(
  faceValue: number,
  couponRatePct: number,
  annualYieldPct: number,
  yearsToMaturity: number,
  paymentsPerYear: number
): number {
  const freq = Math.max(1, Math.round(paymentsPerYear));
  const n = Math.max(1, Math.round(yearsToMaturity * freq));
  const c = (faceValue * (couponRatePct / 100)) / freq;
  const y = annualYieldPct / 100 / freq;

  let pv = 0;
  for (let t = 1; t <= n; t++) {
    const cf = t === n ? c + faceValue : c;
    pv += cf / Math.pow(1 + y, t);
  }
  return pv;
}

export function computeBondMetrics(inp: BondInput): BondResult {
  const face = Math.max(1, inp.faceValue);
  const price = Math.max(1e-3, inp.marketPrice);
  const freq = Math.max(1, Math.round(inp.paymentsPerYear));
  const years = Math.max(0.5, inp.yearsToMaturity);
  const n = Math.max(1, Math.round(years * freq));
  const annualCoupon = face * (inp.couponRatePct / 100);
  const c = annualCoupon / freq;
  const currentYieldPct = (annualCoupon / price) * 100;

  // Solve YTM via Newton-Raphson + bisection guard
  let ytm = Math.max(0.001, inp.couponRatePct / 100);
  for (let iter = 0; iter < 60; iter++) {
    const y = ytm / freq;
    let pv = 0;
    let dpv = 0;
    for (let t = 1; t <= n; t++) {
      const cf = t === n ? c + face : c;
      const denom = Math.pow(1 + y, t);
      pv += cf / denom;
      dpv -= (t * cf) / (denom * (1 + y) * freq);
    }
    const diff = pv - price;
    if (Math.abs(diff) < 1e-7) break;
    if (Math.abs(dpv) < 1e-12) break;
    ytm = Math.max(-0.9, Math.min(2.0, ytm - diff / dpv));
  }

  // Macaulay duration, Modified duration, Convexity
  const y = ytm / freq;
  let weightedTime = 0;
  let convSum = 0;
  let calcPrice = 0;
  for (let t = 1; t <= n; t++) {
    const cf = t === n ? c + face : c;
    const pvCf = cf / Math.pow(1 + y, t);
    calcPrice += pvCf;
    weightedTime += (t / freq) * pvCf;
    convSum += (t * (t + 1) * pvCf) / (freq * freq * Math.pow(1 + y, 2));
  }

  const macaulayDuration = calcPrice > 0 ? weightedTime / calcPrice : 0;
  const modifiedDuration = macaulayDuration / (1 + y);
  const convexity = calcPrice > 0 ? convSum / calcPrice : 0;

  const priceCurve: Array<{ yieldPct: number; price: number }> = [];
  const ytmPct = ytm * 100;
  const startY = Math.max(0.5, ytmPct - 5);
  const endY = ytmPct + 5;
  for (let i = 0; i <= 20; i++) {
    const yp = startY + ((endY - startY) * i) / 20;
    priceCurve.push({
      yieldPct: yp,
      price: priceBondFromYield(face, inp.couponRatePct, yp, years, freq),
    });
  }

  return {
    annualCoupon,
    currentYieldPct,
    ytmPct,
    macaulayDuration,
    modifiedDuration,
    convexity,
    priceCurve,
  };
}

/* ─────────────────────────────────────────────────────────────
   6. PROGRESSIVE SALARY TAX & NET PAY ESTIMATOR
   ───────────────────────────────────────────────────────────── */
export interface TaxBracket {
  upTo: number | null; // null = infinity
  ratePct: number;
}

export interface SalaryTaxInput {
  grossAnnual: number;
  standardDeduction: number;
  employeeSocialHealthPct: number;
  employerPayrollPct: number;
  taxCreditAnnual: number;
  brackets: readonly TaxBracket[];
}

export interface SalaryTaxResult {
  grossAnnual: number;
  taxableIncome: number;
  incomeTaxAnnual: number;
  socialHealthAnnual: number;
  netAnnual: number;
  netMonthly: number;
  employerTotalCostAnnual: number;
  effectiveTotalRatePct: number;
  marginalTaxRatePct: number;
  bracketBreakdown: Array<{ label: string; taxedAmount: number; ratePct: number; tax: number }>;
}

export function computeProgressiveSalaryTax(inp: SalaryTaxInput): SalaryTaxResult {
  const gross = Math.max(0, inp.grossAnnual);
  const taxableIncome = Math.max(0, gross - Math.max(0, inp.standardDeduction));

  let remaining = taxableIncome;
  let prevCap = 0;
  let rawIncomeTax = 0;
  let marginalTaxRatePct = inp.brackets[0]?.ratePct ?? 0;
  const bracketBreakdown: SalaryTaxResult['bracketBreakdown'] = [];

  for (const b of inp.brackets) {
    const cap = b.upTo === null ? Infinity : Math.max(prevCap, b.upTo);
    const bandWidth = cap - prevCap;
    const inBand = Math.max(0, Math.min(remaining, bandWidth));
    const tax = inBand * (b.ratePct / 100);
    if (inBand > 0) {
      marginalTaxRatePct = b.ratePct;
      bracketBreakdown.push({
        label: b.upTo === null ? `> ${prevCap.toLocaleString()}` : `${prevCap.toLocaleString()} – ${cap.toLocaleString()}`,
        taxedAmount: inBand,
        ratePct: b.ratePct,
        tax,
      });
    }
    rawIncomeTax += tax;
    remaining -= inBand;
    prevCap = cap;
    if (remaining <= 0) break;
  }

  const incomeTaxAnnual = Math.max(0, rawIncomeTax - Math.max(0, inp.taxCreditAnnual));
  const socialHealthAnnual = gross * (Math.max(0, inp.employeeSocialHealthPct) / 100);
  const netAnnual = Math.max(0, gross - incomeTaxAnnual - socialHealthAnnual);
  const employerTotalCostAnnual = gross * (1 + Math.max(0, inp.employerPayrollPct) / 100);
  const effectiveTotalRatePct = gross > 0 ? ((gross - netAnnual) / gross) * 100 : 0;

  return {
    grossAnnual: gross,
    taxableIncome,
    incomeTaxAnnual,
    socialHealthAnnual,
    netAnnual,
    netMonthly: netAnnual / 12,
    employerTotalCostAnnual,
    effectiveTotalRatePct,
    marginalTaxRatePct,
    bracketBreakdown,
  };
}

/* ─────────────────────────────────────────────────────────────
   7. INFLATION & PURCHASING POWER CALCULATOR
   ───────────────────────────────────────────────────────────── */
export interface InflationResult {
  futureEquivalentCost: number;
  futurePurchasingPower: number;
  cumulativeInflationPct: number;
  purchasingPowerLostPct: number;
  requiredNominalReturnPct: number;
  yearlyPoints: Array<{ year: number; equivalentCost: number; purchasingPower: number }>;
}

export function computeInflationImpact(
  amount: number,
  annualInflationPct: number,
  years: number,
  targetRealReturnPct = 4
): InflationResult {
  const amt = Math.max(0, amount);
  const inf = annualInflationPct / 100;
  const yrs = Math.max(1, Math.min(80, Math.round(years)));

  const yearlyPoints: InflationResult['yearlyPoints'] = [];
  for (let y = 0; y <= yrs; y++) {
    const factor = Math.pow(1 + inf, y);
    yearlyPoints.push({
      year: y,
      equivalentCost: amt * factor,
      purchasingPower: factor > 0 ? amt / factor : 0,
    });
  }

  const last = yearlyPoints[yearlyPoints.length - 1];
  const cumulativeFactor = Math.pow(1 + inf, yrs);
  const cumulativeInflationPct = (cumulativeFactor - 1) * 100;
  const purchasingPowerLostPct = amt > 0 ? (1 - last.purchasingPower / amt) * 100 : 0;
  // Fisher equation: (1 + nominal) = (1 + real)(1 + inflation)
  const requiredNominalReturnPct = ((1 + targetRealReturnPct / 100) * (1 + inf) - 1) * 100;

  return {
    futureEquivalentCost: last.equivalentCost,
    futurePurchasingPower: last.purchasingPower,
    cumulativeInflationPct,
    purchasingPowerLostPct,
    requiredNominalReturnPct,
    yearlyPoints,
  };
}
