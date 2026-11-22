import React, { useState, useMemo } from 'react';
import { LineChart, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency, getCurrencySymbol } from '../../services/currencyService';
import { AppCurrencyBadge } from '../../components/ui/AppCurrencyBadge';
import { computeBlackScholes, computeKellyFraction } from '../../utils/financeSuite.logic';

export const OptionsBlackScholesTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const currSymbol = getCurrencySymbol(currency);

  const [spot, setSpot] = useState('100');
  const [strike, setStrike] = useState('105');
  const [daysToExpiry, setDaysToExpiry] = useState('90');
  const [volatilityPct, setVolatilityPct] = useState('28');
  const [riskFreePct, setRiskFreePct] = useState('4.5');
  const [divYieldPct, setDivYieldPct] = useState('1.2');

  // Kelly Criterion panel state
  const [winProbPct, setWinProbPct] = useState('55');
  const [rewardRisk, setRewardRisk] = useState('1.8');
  const [bankroll, setBankroll] = useState('50000');

  const bs = useMemo(() => {
    return computeBlackScholes({
      spot: Number(spot) || 100,
      strike: Number(strike) || 100,
      timeYears: Math.max(1, Number(daysToExpiry) || 30) / 365,
      riskFreeRatePct: Number(riskFreePct) || 0,
      volatilityPct: Number(volatilityPct) || 20,
      dividendYieldPct: Number(divYieldPct) || 0,
    });
  }, [spot, strike, daysToExpiry, volatilityPct, riskFreePct, divYieldPct]);

  const kelly = useMemo(() => {
    return computeKellyFraction(Number(winProbPct) || 50, Number(rewardRisk) || 1);
  }, [winProbPct, rewardRisk]);

  // Expiration Payoff SVG (Long Call vs Long Put)
  const S = Math.max(1, Number(spot) || 100);
  const K = Math.max(1, Number(strike) || 100);
  const minS = Math.max(0.1, K * 0.6);
  const maxS = K * 1.4;
  const pts = Array.from({ length: 41 }, (_, i) => {
    const px = minS + ((maxS - minS) * i) / 40;
    return {
      px,
      callPnL: Math.max(0, px - K) - bs.call.price,
      putPnL: Math.max(0, K - px) - bs.put.price,
    };
  });

  const allPnl = pts.flatMap(p => [p.callPnL, p.putPnL, 0]);
  const maxPnl = Math.max(1, ...allPnl);
  const minPnl = Math.min(-1, ...allPnl);
  const svgW = 600;
  const svgH = 190;
  const padL = 48;
  const padR = 16;
  const padT = 14;
  const padB = 26;
  const toX = (px: number) => padL + ((px - minS) / (maxS - minS)) * (svgW - padL - padR);
  const toY = (v: number) => svgH - padB - ((v - minPnl) / (maxPnl - minPnl)) * (svgH - padT - padB);

  const callPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.px).toFixed(1)} ${toY(p.callPnL).toFixed(1)}`).join(' ');
  const putPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.px).toFixed(1)} ${toY(p.putPnL).toFixed(1)}`).join(' ');

  const bankrollVal = Math.max(0, Number(bankroll) || 0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <LineChart className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('opt_title', 'Options (Black-Scholes), Greeks & Kelly Sizing')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'opt_subtitle',
                  'Price European Call & Put options with full Greeks (Delta, Gamma, Theta, Vega, Rho), payoff diagram, and Kelly position sizing.'
                )}
              </p>
            </div>
          </div>
          <AppCurrencyBadge currency={currency} />
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('opt_spot', 'Spot (S)')} ({currSymbol})</label>
            <input type="number" step="0.5" value={spot} onChange={e => setSpot(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('opt_strike', 'Strike (K)')} ({currSymbol})</label>
            <input type="number" step="0.5" value={strike} onChange={e => setStrike(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('opt_dte', 'Days to Expiry')}</label>
            <input type="number" min="1" value={daysToExpiry} onChange={e => setDaysToExpiry(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('opt_vol', 'Volatility σ (%)')}</label>
            <input type="number" step="1" value={volatilityPct} onChange={e => setVolatilityPct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('opt_rf', 'Risk-Free r (%)')}</label>
            <input type="number" step="0.25" value={riskFreePct} onChange={e => setRiskFreePct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('opt_div', 'Dividend q (%)')}</label>
            <input type="number" step="0.25" value={divYieldPct} onChange={e => setDivYieldPct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
        </div>

        {/* Call vs Put Cards + Greeks Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-emerald-400">{t('opt_call_price', 'European Call')}</span>
              <span className="text-lg font-bold font-mono text-emerald-400">{formatCurrency(bs.call.price, currency)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
              <div>{t('opt_intrinsic', 'Intrinsic')}: {bs.call.intrinsic.toFixed(2)}</div>
              <div>{t('opt_time_val', 'Time Value')}: {bs.call.timeValue.toFixed(2)}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-rose-400">{t('opt_put_price', 'European Put')}</span>
              <span className="text-lg font-bold font-mono text-rose-400">{formatCurrency(bs.put.price, currency)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
              <div>{t('opt_intrinsic', 'Intrinsic')}: {bs.put.intrinsic.toFixed(2)}</div>
              <div>{t('opt_time_val', 'Time Value')}: {bs.put.timeValue.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4">{t('opt_greek', 'Greek')}</th>
                <th className="py-2 px-4">{t('opt_col_call', 'Call')}</th>
                <th className="py-2 pl-4">{t('opt_col_put', 'Put')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td className="py-2 pr-4 text-slate-300">Delta (Δ)</td>
                <td className="py-2 px-4 text-emerald-400">{bs.call.delta.toFixed(4)}</td>
                <td className="py-2 pl-4 text-rose-400">{bs.put.delta.toFixed(4)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-300">Gamma (Γ)</td>
                <td className="py-2 px-4 text-slate-200">{bs.call.gamma.toFixed(5)}</td>
                <td className="py-2 pl-4 text-slate-200">{bs.put.gamma.toFixed(5)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-300">{t('opt_theta_day', 'Theta (Θ / day)')}</td>
                <td className="py-2 px-4 text-amber-300">{bs.call.thetaPerDay.toFixed(4)}</td>
                <td className="py-2 pl-4 text-amber-300">{bs.put.thetaPerDay.toFixed(4)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-300">{t('opt_vega_pct', 'Vega (ν / 1% vol)')}</td>
                <td className="py-2 px-4 text-indigo-300">{bs.call.vegaPerPct.toFixed(4)}</td>
                <td className="py-2 pl-4 text-indigo-300">{bs.put.vegaPerPct.toFixed(4)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-slate-300">{t('opt_rho_pct', 'Rho (ρ / 1% rate)')}</td>
                <td className="py-2 px-4 text-slate-300">{bs.call.rhoPerPct.toFixed(4)}</td>
                <td className="py-2 pl-4 text-slate-300">{bs.put.rhoPerPct.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expiration Payoff Chart */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">{t('opt_payoff_chart', 'Long Call vs. Long Put Expiration P&L')}</span>
            <span className="font-mono text-slate-400">
              d1 = {bs.d1.toFixed(3)} · d2 = {bs.d2.toFixed(3)}
            </span>
          </div>
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-44">
            <line x1={padL} y1={toY(0)} x2={svgW - padR} y2={toY(0)} stroke="currentColor" className="text-slate-700" strokeDasharray="4 3" />
            <line x1={toX(S)} y1={padT} x2={toX(S)} y2={svgH - padB} stroke="currentColor" className="text-indigo-500/40" strokeDasharray="2 2" />
            <path d={callPath} fill="none" stroke="#34d399" strokeWidth="2.2" />
            <path d={putPath} fill="none" stroke="#fb7185" strokeWidth="2.2" />
            <text x={padL} y={svgH - 6} className="fill-slate-500 text-[10px] font-mono">{minS.toFixed(0)}</text>
            <text x={toX(K)} y={svgH - 6} textAnchor="middle" className="fill-slate-300 text-[10px] font-mono">K={K}</text>
            <text x={svgW - padR} y={svgH - 6} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">{maxS.toFixed(0)}</text>
          </svg>
        </div>
      </div>

      {/* Kelly Criterion Position Sizing */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold text-white">{t('opt_kelly_title', 'Kelly Criterion Position Sizing')}</h3>
            <p className="text-xs text-slate-400">
              {t('opt_kelly_desc', 'Optimal capital allocation fraction f* = p - (1 - p) / b given win probability and reward-to-risk ratio.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('opt_win_prob', 'Win Probability (%)')}</label>
            <input type="number" min="0" max="100" step="1" value={winProbPct} onChange={e => setWinProbPct(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('opt_rr_ratio', 'Reward / Risk Ratio (b)')}</label>
            <input type="number" min="0.1" step="0.1" value={rewardRisk} onChange={e => setRewardRisk(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('opt_bankroll', 'Portfolio Capital')} ({currSymbol})</label>
            <input type="number" min="0" value={bankroll} onChange={e => setBankroll(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('opt_full_kelly', 'Full Kelly')}</div>
            <div className={`text-base font-bold font-mono mt-0.5 ${kelly.fullKellyPct > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {kelly.fullKellyPct.toFixed(2)}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('opt_half_kelly', 'Half-Kelly (Safer)')}</div>
            <div className="text-base font-bold font-mono text-indigo-300 mt-0.5">
              {kelly.halfKellyPct.toFixed(2)}% ({formatCurrency((bankrollVal * kelly.halfKellyPct) / 100, currency)})
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('opt_ev_unit', 'Expected Value / Risk Unit')}</div>
            <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
              {kelly.expectedValuePerUnit >= 0 ? '+' : ''}
              {kelly.expectedValuePerUnit.toFixed(3)}R
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('opt_be_winrate', 'Break-Even Win Rate')}</div>
            <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
              {kelly.breakevenWinRatePct.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
