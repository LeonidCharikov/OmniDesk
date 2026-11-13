import React, { useState, useMemo } from 'react';
import { Fuel, Zap } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { useAppCurrency, formatCurrency } from '../../services/currencyService';

export const FuelTripCalcTool: React.FC = () => {
  const { t } = useI18n();
  const [currency] = useAppCurrency();
  const [mode, setMode] = useState<'fuel' | 'ev' | 'convert'>('fuel');

  // Fuel Trip
  const [distanceKm, setDistanceKm] = useState('320');
  const [consumption, setConsumption] = useState('6.8');
  const [fuelPrice, setFuelPrice] = useState('38.5');
  const [passengers, setPassengers] = useState('2');
  const [roundTrip, setRoundTrip] = useState(false);

  // EV Charging
  const [batteryKwh, setBatteryKwh] = useState('64');
  const [startPct, setStartPct] = useState('20');
  const [targetPct, setTargetPct] = useState('80');
  const [kwhPrice, setKwhPrice] = useState('6.5');
  const [chargerKw, setChargerKw] = useState('11');

  // Efficiency Converter
  const [effInput, setEffInput] = useState('7.0');
  const [effUnit, setEffUnit] = useState<'l100' | 'mpg_us' | 'mpg_uk' | 'kml'>('l100');

  const fuelRes = useMemo(() => {
    const dist = (Number(distanceKm) || 0) * (roundTrip ? 2 : 1);
    const cons = Number(consumption) || 0;
    const price = Number(fuelPrice) || 0;
    const pax = Math.max(1, Number(passengers) || 1);
    const liters = (dist / 100) * cons;
    const totalCost = liters * price;
    const perPerson = totalCost / pax;
    const costPer100 = cons * price;
    return { dist, liters, totalCost, perPerson, costPer100 };
  }, [distanceKm, consumption, fuelPrice, passengers, roundTrip]);

  const evRes = useMemo(() => {
    const cap = Number(batteryKwh) || 0;
    const s = Math.max(0, Math.min(100, Number(startPct) || 0));
    const tg = Math.max(s, Math.min(100, Number(targetPct) || 0));
    const price = Number(kwhPrice) || 0;
    const kw = Math.max(0.5, Number(chargerKw) || 1);
    const addedKwh = cap * ((tg - s) / 100);
    const cost = addedKwh * price;
    const hours = addedKwh / kw;
    return { addedKwh, cost, hours };
  }, [batteryKwh, startPct, targetPct, kwhPrice, chargerKw]);

  const effRes = useMemo(() => {
    const v = Number(effInput) || 0;
    if (v <= 0) return null;
    let l100 = 0;
    if (effUnit === 'l100') l100 = v;
    else if (effUnit === 'kml') l100 = 100 / v;
    else if (effUnit === 'mpg_us') l100 = 235.214583 / v;
    else l100 = 282.480936 / v;

    return {
      l100,
      kml: 100 / l100,
      mpgUs: 235.214583 / l100,
      mpgUk: 282.480936 / l100,
    };
  }, [effInput, effUnit]);

  const formatHours = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              {mode === 'ev' ? <Zap className="w-5 h-5 text-emerald-400" /> : <Fuel className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('ft_title', 'Fuel Cost, EV Charging & Trip Calculator')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('ft_subtitle', 'Estimate road trip fuel costs, split expenses, convert L/100km ↔ MPG, or calculate EV charging.')}
              </p>
            </div>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            {([
              { id: 'fuel', label: t('ft_tab_fuel', 'Fuel Trip') },
              { id: 'ev', label: t('ft_tab_ev', 'EV Charging') },
              { id: 'convert', label: t('ft_tab_convert', 'L/100km ↔ MPG') },
            ] as const).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  mode === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'fuel' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('ft_distance_km', 'Distance (km)')}</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={distanceKm}
                  onChange={e => setDistanceKm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('ft_consumption', 'Consumption (L/100km)')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={consumption}
                  onChange={e => setConsumption(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {t('ft_fuel_price', 'Fuel Price (/L)')} ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={fuelPrice}
                  onChange={e => setFuelPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('ft_passengers', 'Passengers')}</label>
                <input
                  type="number"
                  min="1"
                  value={passengers}
                  onChange={e => setPassengers(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={roundTrip}
                onChange={e => setRoundTrip(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600"
              />
              <span>{t('ft_round_trip', 'Round trip (2× distance)')}</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">{t('ft_total_cost', 'Total Trip Cost')}</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
                  {formatCurrency(fuelRes.totalCost, currency)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">{t('ft_per_person', 'Cost Per Person')}</div>
                <div className="text-xl font-bold font-mono tabular-nums text-indigo-300 mt-1">
                  {formatCurrency(fuelRes.perPerson, currency)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">{t('ft_fuel_needed', 'Fuel Needed')}</div>
                <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
                  {fuelRes.liters.toFixed(1)} L
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">{t('ft_cost_100km', 'Cost / 100 km')}</div>
                <div className="text-xl font-bold font-mono tabular-nums text-slate-300 mt-1">
                  {formatCurrency(fuelRes.costPer100, currency)}
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'ev' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('ft_battery_kwh', 'Battery (kWh)')}</label>
                <input
                  type="number"
                  value={batteryKwh}
                  onChange={e => setBatteryKwh(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('ft_start_soc', 'Start (%)')}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={startPct}
                  onChange={e => setStartPct(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('ft_target_soc', 'Target (%)')}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={targetPct}
                  onChange={e => setTargetPct(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  {t('ft_kwh_price', 'Price (/kWh)')} ({currency})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={kwhPrice}
                  onChange={e => setKwhPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('ft_charger_kw', 'Charger (kW)')}</label>
                <input
                  type="number"
                  step="0.5"
                  value={chargerKw}
                  onChange={e => setChargerKw(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">{t('ft_energy_added', 'Energy Added')}</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-indigo-300 mt-1">
                  {evRes.addedKwh.toFixed(1)} kWh
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">{t('ft_charge_cost', 'Estimated Cost')}</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
                  {formatCurrency(evRes.cost, currency)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs text-slate-400">{t('ft_charge_time', 'Estimated Time')}</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
                  {formatHours(evRes.hours)}
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'convert' && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-40">
                <label className="block text-xs text-slate-400 mb-1">{t('ft_eff_value', 'Value')}</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={effInput}
                  onChange={e => setEffInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white"
                />
              </div>
              <div className="w-48">
                <label className="block text-xs text-slate-400 mb-1">{t('ft_eff_unit', 'Unit')}</label>
                <select
                  value={effUnit}
                  onChange={e => setEffUnit(e.target.value as typeof effUnit)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                >
                  <option value="l100">L / 100 km</option>
                  <option value="mpg_us">MPG (US)</option>
                  <option value="mpg_uk">MPG (UK)</option>
                  <option value="kml">km / L</option>
                </select>
              </div>
            </div>

            {effRes && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">L / 100 km</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-indigo-300 mt-1">{effRes.l100.toFixed(2)}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">MPG (US)</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">{effRes.mpgUs.toFixed(1)}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">MPG (UK)</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">{effRes.mpgUk.toFixed(1)}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">km / L</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">{effRes.kml.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
