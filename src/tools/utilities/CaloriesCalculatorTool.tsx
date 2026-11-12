import React, { useState, useMemo } from 'react';
import { HeartPulse } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface ActivityOption {
  id: string;
  mult: number;
  labelKey: string;
  fallback: string;
}

const ACTIVITY_LEVELS: ActivityOption[] = [
  { id: 'sedentary', mult: 1.2, labelKey: 'cal_act_sedentary', fallback: 'Sedentary (desk job, little exercise)' },
  { id: 'light', mult: 1.375, labelKey: 'cal_act_light', fallback: 'Lightly Active (1-3 days/week)' },
  { id: 'moderate', mult: 1.55, labelKey: 'cal_act_moderate', fallback: 'Moderately Active (3-5 days/week)' },
  { id: 'very', mult: 1.725, labelKey: 'cal_act_very', fallback: 'Very Active (6-7 days/week)' },
  { id: 'athlete', mult: 1.9, labelKey: 'cal_act_athlete', fallback: 'Athlete / Physical Labor (2x/day)' },
];

interface GoalOption {
  id: string;
  deltaKcal: number;
  labelKey: string;
  fallback: string;
}

const GOALS: GoalOption[] = [
  { id: 'cut_fast', deltaKcal: -500, labelKey: 'cal_goal_cut_fast', fallback: 'Weight Loss (-500 kcal)' },
  { id: 'cut_mild', deltaKcal: -250, labelKey: 'cal_goal_cut_mild', fallback: 'Mild Loss (-250 kcal)' },
  { id: 'maintain', deltaKcal: 0, labelKey: 'cal_goal_maintain', fallback: 'Maintain Weight (0 kcal)' },
  { id: 'bulk_lean', deltaKcal: 250, labelKey: 'cal_goal_bulk_lean', fallback: 'Lean Gain (+250 kcal)' },
  { id: 'bulk_fast', deltaKcal: 500, labelKey: 'cal_goal_bulk_fast', fallback: 'Muscle Gain (+500 kcal)' },
];

export const CaloriesCalculatorTool: React.FC = () => {
  const { t } = useI18n();

  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('30');

  const [heightCm, setHeightCm] = useState('178');
  const [weightKg, setWeightKg] = useState('76');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('10');
  const [weightLb, setWeightLb] = useState('168');

  const [bodyFatPct, setBodyFatPct] = useState('');
  const [activityId, setActivityId] = useState('moderate');
  const [goalId, setGoalId] = useState('maintain');

  // Macro percentages
  const [proteinPct, setProteinPct] = useState('30');
  const [carbsPct, setCarbsPct] = useState('40');
  const [fatPct, setFatPct] = useState('30');

  const calc = useMemo(() => {
    const a = Math.max(10, Math.min(110, Number(age) || 30));
    const hCm =
      unitSystem === 'metric'
        ? Math.max(50, Number(heightCm) || 0)
        : ((Number(heightFt) || 0) * 12 + (Number(heightIn) || 0)) * 2.54;
    const wKg =
      unitSystem === 'metric'
        ? Math.max(20, Number(weightKg) || 0)
        : (Number(weightLb) || 0) * 0.45359237;

    if (hCm <= 0 || wKg <= 0) return null;

    // Mifflin-St Jeor
    const mifflinBmr = 10 * wKg + 6.25 * hCm - 5 * a + (sex === 'male' ? 5 : -161);

    // Katch-McArdle (if body fat % provided)
    const bf = Number(bodyFatPct);
    const hasBf = bodyFatPct.trim() !== '' && bf > 2 && bf < 70;
    const katchBmr = hasBf ? 370 + 21.6 * (wKg * (1 - bf / 100)) : null;

    const baseBmr = katchBmr ?? mifflinBmr;
    const act = ACTIVITY_LEVELS.find(item => item.id === activityId) || ACTIVITY_LEVELS[2];
    const tdee = baseBmr * act.mult;

    const goal = GOALS.find(g => g.id === goalId) || GOALS[2];
    const targetCalories = Math.max(1000, tdee + goal.deltaKcal);

    const pRatio = Math.max(0, Number(proteinPct) || 0);
    const cRatio = Math.max(0, Number(carbsPct) || 0);
    const fRatio = Math.max(0, Number(fatPct) || 0);
    const macroSum = Math.max(1, pRatio + cRatio + fRatio);

    const pKcal = targetCalories * (pRatio / macroSum);
    const cKcal = targetCalories * (cRatio / macroSum);
    const fKcal = targetCalories * (fRatio / macroSum);

    const pGrams = pKcal / 4;
    const cGrams = cKcal / 4;
    const fGrams = fKcal / 9;

    // 7700 kcal ~ 1 kg body weight change per week
    const weeklyKgChange = (goal.deltaKcal * 7) / 7700;

    return {
      mifflinBmr,
      katchBmr,
      baseBmr,
      tdee,
      targetCalories,
      macroSum,
      pGrams,
      cGrams,
      fGrams,
      pKcal,
      cKcal,
      fKcal,
      weeklyKgChange,
      waterLiters: wKg * 0.035,
    };
  }, [
    unitSystem,
    sex,
    age,
    heightCm,
    weightKg,
    heightFt,
    heightIn,
    weightLb,
    bodyFatPct,
    activityId,
    goalId,
    proteinPct,
    carbsPct,
    fatPct,
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('cal_title', 'Calories, BMR & Macro Calculator')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'cal_subtitle',
                  'Daily energy expenditure (Mifflin-St Jeor & Katch-McArdle), TDEE activity targets, and macro gram splits.'
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

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('cal_age', 'Age (years)')}</label>
            <input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>

          {unitSystem === 'metric' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('bmi_height_ft', 'Height (ft)')}</label>
                  <input
                    type="number"
                    value={heightFt}
                    onChange={e => setHeightFt(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('bmi_height_in', 'Height (in)')}</label>
                  <input
                    type="number"
                    value={heightIn}
                    onChange={e => setHeightIn(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                  />
                </div>
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
            </>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('cal_body_fat', 'Body Fat % (Optional)')}
            </label>
            <input
              type="number"
              placeholder={t('cal_bf_placeholder', 'e.g. 18')}
              value={bodyFatPct}
              onChange={e => setBodyFatPct(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('cal_activity_label', 'Activity Level')}</label>
            <select
              value={activityId}
              onChange={e => setActivityId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
            >
              {ACTIVITY_LEVELS.map(act => (
                <option key={act.id} value={act.id}>
                  {t(act.labelKey, act.fallback)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Goal Presets */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-400">{t('cal_goal_label', 'Daily Calorie Goal')}</div>
          <div className="flex flex-wrap gap-2">
            {GOALS.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoalId(g.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  goalId === g.id
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {t(g.labelKey, g.fallback)}
              </button>
            ))}
          </div>
        </div>

        {calc && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40">
              <div className="text-[11px] text-slate-400">{t('cal_target_daily', 'Target Calories / Day')}</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                {Math.round(calc.targetCalories).toLocaleString()} kcal
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('cal_tdee', 'Maintenance (TDEE)')}</div>
              <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">
                {Math.round(calc.tdee).toLocaleString()} kcal
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('cal_bmr', 'Basal Metabolic Rate (BMR)')}</div>
              <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
                {Math.round(calc.baseBmr).toLocaleString()} kcal
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('cal_weekly_pace', 'Est. Weekly Change / Water')}</div>
              <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                {calc.weeklyKgChange >= 0 ? '+' : ''}
                {calc.weeklyKgChange.toFixed(2)} kg · {calc.waterLiters.toFixed(1)} L
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Macro Breakdown */}
      {calc && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">
              {t('cal_macros_title', 'Macronutrient Split (% of Calories)')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: t('cal_preset_balanced', 'Balanced 30/40/30'), p: '30', c: '40', f: '30' },
                { label: t('cal_preset_high_prot', 'High Protein 40/35/25'), p: '40', c: '35', f: '25' },
                { label: t('cal_preset_low_carb', 'Low Carb 35/20/45'), p: '35', c: '20', f: '45' },
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setProteinPct(preset.p);
                    setCarbsPct(preset.c);
                    setFatPct(preset.f);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: t('cal_protein', 'Protein (4 kcal/g)'),
                pct: proteinPct,
                setPct: setProteinPct,
                grams: calc.pGrams,
                kcal: calc.pKcal,
                color: 'text-emerald-400',
              },
              {
                label: t('cal_carbs', 'Carbohydrates (4 kcal/g)'),
                pct: carbsPct,
                setPct: setCarbsPct,
                grams: calc.cGrams,
                kcal: calc.cKcal,
                color: 'text-sky-400',
              },
              {
                label: t('cal_fat', 'Fats (9 kcal/g)'),
                pct: fatPct,
                setPct: setFatPct,
                grams: calc.fGrams,
                kcal: calc.fKcal,
                color: 'text-amber-400',
              },
            ].map(macro => (
              <div key={macro.label} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">{macro.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={macro.pct}
                    onChange={e => macro.setPct(e.target.value)}
                    className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-right text-slate-200"
                  />
                </div>
                <div className={`text-xl font-bold font-mono ${macro.color}`}>
                  {Math.round(macro.grams)} g / {t('cal_day_short', 'day')}
                </div>
                <div className="text-[11px] font-mono text-slate-500">{Math.round(macro.kcal)} kcal</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
