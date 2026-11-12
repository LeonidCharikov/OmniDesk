import React, { useState, useMemo } from 'react';
import { Scale } from 'lucide-react';
import { useI18n } from '../../i18n/context';

export const BmiCalculatorTool: React.FC = () => {
  const { t } = useI18n();

  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [sex, setSex] = useState<'male' | 'female'>('male');

  // Metric inputs
  const [heightCm, setHeightCm] = useState('178');
  const [weightKg, setWeightKg] = useState('76');
  const [waistCm, setWaistCm] = useState('84');
  const [neckCm, setNeckCm] = useState('38');
  const [hipCm, setHipCm] = useState('96');

  // Imperial inputs
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('10');
  const [weightLb, setWeightLb] = useState('168');
  const [waistIn, setWaistIn] = useState('33');
  const [neckIn, setNeckIn] = useState('15');
  const [hipIn, setHipIn] = useState('38');

  const results = useMemo(() => {
    const hCm =
      unitSystem === 'metric'
        ? Math.max(50, Math.min(260, Number(heightCm) || 0))
        : ((Number(heightFt) || 0) * 12 + (Number(heightIn) || 0)) * 2.54;

    const wKg =
      unitSystem === 'metric'
        ? Math.max(15, Math.min(400, Number(weightKg) || 0))
        : (Number(weightLb) || 0) * 0.45359237;

    const waist =
      unitSystem === 'metric' ? Number(waistCm) || 0 : (Number(waistIn) || 0) * 2.54;
    const neck =
      unitSystem === 'metric' ? Number(neckCm) || 0 : (Number(neckIn) || 0) * 2.54;
    const hip =
      unitSystem === 'metric' ? Number(hipCm) || 0 : (Number(hipIn) || 0) * 2.54;

    if (hCm <= 0 || wKg <= 0) return null;

    const hM = hCm / 100;
    const bmi = wKg / (hM * hM);
    const bmiPrime = bmi / 25;
    const ponderalIndex = wKg / Math.pow(hM, 3);

    const healthyMinKg = 18.5 * hM * hM;
    const healthyMaxKg = 24.9 * hM * hM;

    let categoryKey = 'bmi_cat_normal';
    let categoryColor = 'text-emerald-400';
    if (bmi < 16) {
      categoryKey = 'bmi_cat_sev_under';
      categoryColor = 'text-sky-400';
    } else if (bmi < 18.5) {
      categoryKey = 'bmi_cat_under';
      categoryColor = 'text-sky-300';
    } else if (bmi < 25) {
      categoryKey = 'bmi_cat_normal';
      categoryColor = 'text-emerald-400';
    } else if (bmi < 30) {
      categoryKey = 'bmi_cat_over';
      categoryColor = 'text-amber-400';
    } else if (bmi < 35) {
      categoryKey = 'bmi_cat_obese1';
      categoryColor = 'text-orange-400';
    } else {
      categoryKey = 'bmi_cat_obese2';
      categoryColor = 'text-rose-400';
    }

    // US Navy Body Fat % formula
    let bodyFatPct: number | null = null;
    if (hCm > 0 && waist > neck) {
      if (sex === 'male') {
        const val = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(hCm)) - 450;
        if (isFinite(val) && val > 1 && val < 70) bodyFatPct = val;
      } else if (waist + hip > neck) {
        const val =
          495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(hCm)) - 450;
        if (isFinite(val) && val > 1 && val < 75) bodyFatPct = val;
      }
    }

    const whtr = waist > 0 ? waist / hCm : null;
    const gaugePct = Math.max(0, Math.min(100, ((bmi - 12) / (42 - 12)) * 100));

    return {
      hCm,
      wKg,
      bmi,
      bmiPrime,
      ponderalIndex,
      healthyMinKg,
      healthyMaxKg,
      categoryKey,
      categoryColor,
      bodyFatPct,
      whtr,
      gaugePct,
    };
  }, [
    unitSystem,
    sex,
    heightCm,
    weightKg,
    waistCm,
    neckCm,
    hipCm,
    heightFt,
    heightIn,
    weightLb,
    waistIn,
    neckIn,
    hipIn,
  ]);

  const formatWeight = (kg: number) =>
    unitSystem === 'metric' ? `${kg.toFixed(1)} kg` : `${(kg / 0.45359237).toFixed(1)} lb`;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Scale className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('bmi_title', 'BMI & Body Composition Calculator')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'bmi_subtitle',
                  'WHO Body Mass Index, healthy weight range, Ponderal Index, Waist-to-Height ratio, and US Navy body fat %.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['metric', 'imperial'] as const).map(sys => (
                <button
                  key={sys}
                  type="button"
                  onClick={() => setUnitSystem(sys)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    unitSystem === sys ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sys === 'metric' ? t('bmi_metric', 'Metric (cm / kg)') : t('bmi_imperial', 'Imperial (ft / lb)')}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['male', 'female'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sex === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s === 'male' ? t('bmi_male', 'Male') : t('bmi_female', 'Female')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inputs */}
        {unitSystem === 'metric' ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('bmi_height_cm', 'Height (cm)')}</label>
              <input
                type="number"
                value={heightCm}
                onChange={e => setHeightCm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('bmi_weight_kg', 'Weight (kg)')}</label>
              <input
                type="number"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('bmi_waist_cm', 'Waist (cm)')}</label>
              <input
                type="number"
                value={waistCm}
                onChange={e => setWaistCm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('bmi_neck_cm', 'Neck (cm)')}</label>
              <input
                type="number"
                value={neckCm}
                onChange={e => setNeckCm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            {sex === 'female' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('bmi_hip_cm', 'Hip (cm)')}</label>
                <input
                  type="number"
                  value={hipCm}
                  onChange={e => setHipCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('bmi_height_ft', 'Height (ft)')}</label>
              <input
                type="number"
                value={heightFt}
                onChange={e => setHeightFt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('bmi_height_in', 'Height (in)')}</label>
              <input
                type="number"
                value={heightIn}
                onChange={e => setHeightIn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('bmi_weight_lb', 'Weight (lb)')}</label>
              <input
                type="number"
                value={weightLb}
                onChange={e => setWeightLb(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('bmi_waist_in', 'Waist (in)')}</label>
              <input
                type="number"
                value={waistIn}
                onChange={e => setWaistIn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('bmi_neck_in', 'Neck (in)')}</label>
              <input
                type="number"
                value={neckIn}
                onChange={e => setNeckIn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            {sex === 'female' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('bmi_hip_in', 'Hip (in)')}</label>
                <input
                  type="number"
                  value={hipIn}
                  onChange={e => setHipIn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                />
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="space-y-4 pt-2">
            {/* Visual BMI Spectrum Bar */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold font-mono text-white">{results.bmi.toFixed(1)}</span>
                  <span className={`text-sm font-semibold ${results.categoryColor}`}>
                    {t(results.categoryKey, results.categoryKey)}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {t('bmi_healthy_range', 'Healthy Weight Range')}: {formatWeight(results.healthyMinKg)} –{' '}
                  {formatWeight(results.healthyMaxKg)}
                </span>
              </div>

              <div className="relative h-3 rounded-full overflow-hidden flex">
                <div className="h-full bg-sky-500/80" style={{ width: '21.6%' }} />
                <div className="h-full bg-emerald-500/80" style={{ width: '21.7%' }} />
                <div className="h-full bg-amber-500/80" style={{ width: '16.7%' }} />
                <div className="h-full bg-rose-500/80 flex-1" />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow"
                  style={{ left: `${results.gaugePct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>12</span>
                <span>18.5</span>
                <span>25</span>
                <span>30</span>
                <span>42</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('bmi_prime', 'BMI Prime')}</div>
                <div className="text-base font-bold font-mono text-indigo-300 mt-0.5">
                  {results.bmiPrime.toFixed(2)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('bmi_ponderal', 'Ponderal Index')}</div>
                <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                  {results.ponderalIndex.toFixed(1)} kg/m³
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('bmi_navy_fat', 'US Navy Body Fat')}</div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                  {results.bodyFatPct !== null ? `${results.bodyFatPct.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{t('bmi_whtr', 'Waist-to-Height Ratio')}</div>
                <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                  {results.whtr !== null ? results.whtr.toFixed(2) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
