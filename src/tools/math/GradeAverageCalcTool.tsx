import React, { useState, useMemo } from 'react';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface GradeRow {
  id: string;
  label: string;
  score: string;
  weight: string;
}

export const GradeAverageCalcTool: React.FC = () => {
  const { t } = useI18n();

  const [rows, setRows] = useState<GradeRow[]>([
    { id: '1', label: t('ga_sample_hw', 'Homework & Quizzes'), score: '92', weight: '25' },
    { id: '2', label: t('ga_sample_midterm', 'Midterm Exam'), score: '84', weight: '35' },
    { id: '3', label: t('ga_sample_project', 'Semester Project'), score: '88', weight: '40' },
  ]);

  const [currentGrade, setCurrentGrade] = useState('84');
  const [targetGrade, setTargetGrade] = useState('90');
  const [finalWeight, setFinalWeight] = useState('30');

  const stats = useMemo(() => {
    let weightedSum = 0;
    let totalWeight = 0;
    let simpleSum = 0;
    let validCount = 0;

    for (const r of rows) {
      const s = parseFloat(r.score);
      const w = parseFloat(r.weight);
      if (!isNaN(s)) {
        simpleSum += s;
        validCount++;
        if (!isNaN(w) && w > 0) {
          weightedSum += s * w;
          totalWeight += w;
        }
      }
    }

    const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : null;
    const simpleAvg = validCount > 0 ? simpleSum / validCount : null;
    const gpa4 = weightedAvg !== null ? Math.max(0, Math.min(4, (weightedAvg / 100) * 4)) : null;

    let letter = '—';
    if (weightedAvg !== null) {
      if (weightedAvg >= 93) letter = 'A';
      else if (weightedAvg >= 90) letter = 'A-';
      else if (weightedAvg >= 87) letter = 'B+';
      else if (weightedAvg >= 83) letter = 'B';
      else if (weightedAvg >= 80) letter = 'B-';
      else if (weightedAvg >= 75) letter = 'C+';
      else if (weightedAvg >= 70) letter = 'C';
      else if (weightedAvg >= 60) letter = 'D';
      else letter = 'F';
    }

    return { weightedAvg, simpleAvg, totalWeight, gpa4, letter };
  }, [rows]);

  const neededOnFinal = useMemo(() => {
    const cur = parseFloat(currentGrade);
    const tgt = parseFloat(targetGrade);
    const fw = parseFloat(finalWeight);
    if (isNaN(cur) || isNaN(tgt) || isNaN(fw) || fw <= 0 || fw > 100) return null;
    const w = fw / 100;
    return (tgt - cur * (1 - w)) / w;
  }, [currentGrade, targetGrade, finalWeight]);

  const addRow = () => {
    setRows(prev => [
      ...prev,
      { id: Date.now().toString(), label: `${t('ga_item_prefix', 'Item')} ${prev.length + 1}`, score: '85', weight: '20' },
    ]);
  };

  const updateRow = (id: string, field: keyof GradeRow, value: string) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('ga_title', 'Grade & Weighted Average Calculator')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('ga_subtitle', 'Compute weighted course averages, GPA equivalents, and required final exam scores.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={addRow}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('ga_add_row', 'Add Assessment')}</span>
          </button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-2 text-[11px] font-medium text-slate-400">
            <div className="col-span-6">{t('ga_col_name', 'Assignment / Course')}</div>
            <div className="col-span-3">{t('ga_col_score', 'Score (%)')}</div>
            <div className="col-span-2">{t('ga_col_weight', 'Weight (%)')}</div>
            <div className="col-span-1"></div>
          </div>
          {rows.map(row => (
            <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                type="text"
                value={row.label}
                onChange={e => updateRow(row.id, 'label', e.target.value)}
                className="col-span-6 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200"
              />
              <input
                type="number"
                step="any"
                value={row.score}
                onChange={e => updateRow(row.id, 'score', e.target.value)}
                className="col-span-3 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
              <input
                type="number"
                step="any"
                min="0"
                value={row.weight}
                onChange={e => updateRow(row.id, 'weight', e.target.value)}
                className="col-span-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setRows(prev => prev.filter(r => r.id !== row.id))}
                  aria-label={t('delete_item', 'Delete item')}
                  className="p-1.5 text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">{t('ga_weighted_avg', 'Weighted Average')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-indigo-300 mt-1">
              {stats.weightedAvg !== null ? `${stats.weightedAvg.toFixed(2)}%` : '—'}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">{t('ga_letter_gpa', 'Letter / 4.0 Scale')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
              {stats.letter} · {stats.gpa4 !== null ? stats.gpa4.toFixed(2) : '—'}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">{t('ga_simple_avg', 'Unweighted Mean')}</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-200 mt-1">
              {stats.simpleAvg !== null ? `${stats.simpleAvg.toFixed(2)}%` : '—'}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">{t('ga_total_weight', 'Total Weight')}</div>
            <div
              className={`text-xl font-bold font-mono tabular-nums mt-1 ${
                Math.abs(stats.totalWeight - 100) < 0.01 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {stats.totalWeight.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Final Exam Target Solver */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
          <div className="text-xs font-semibold text-slate-300">
            {t('ga_final_planner', 'Final Exam Score Needed')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('ga_current_grade', 'Current Grade (%)')}</label>
              <input
                type="number"
                value={currentGrade}
                onChange={e => setCurrentGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('ga_target_grade', 'Target Grade (%)')}</label>
              <input
                type="number"
                value={targetGrade}
                onChange={e => setTargetGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('ga_final_weight', 'Final Exam Weight (%)')}</label>
              <input
                type="number"
                value={finalWeight}
                onChange={e => setFinalWeight(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm font-mono text-white"
              />
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('ga_needed_score', 'Score Required')}</div>
              <div
                className={`text-lg font-bold font-mono tabular-nums ${
                  neededOnFinal === null
                    ? 'text-slate-400'
                    : neededOnFinal > 100
                      ? 'text-rose-400'
                      : neededOnFinal <= 0
                        ? 'text-emerald-400'
                        : 'text-indigo-300'
                }`}
              >
                {neededOnFinal !== null ? `${neededOnFinal.toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
