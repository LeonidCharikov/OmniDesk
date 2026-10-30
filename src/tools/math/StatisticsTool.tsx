import React, { useState, useId } from 'react';
import { BarChart3, Sparkles, Copy, Check, Info } from 'lucide-react';
import { useI18n } from '../../i18n/context';

export const StatisticsTool: React.FC = () => {
  const { t } = useI18n();
  const [rawInput, setRawInput] = useState<string>('12, 15, 14, 18, 19, 12, 22, 25, 28, 17, 19, 21, 24, 16');
  const [copied, setCopied] = useState(false);
  const dataInputId = useId();

  // Parse numbers
  const numbers = rawInput
    .split(/[\s,;\n\t]+/)
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v))
    .sort((a, b) => a - b);

  const n = numbers.length;

  let mean = 0;
  let median = 0;
  let mode: number[] = [];
  let varianceSample = 0;
  let variancePop = 0;
  let stdDevSample = 0;
  let stdDevPop = 0;
  let min = 0;
  let max = 0;
  let range = 0;
  let sum = 0;
  let q1 = 0;
  let q3 = 0;
  let iqr = 0;

  if (n > 0) {
    sum = numbers.reduce((acc, v) => acc + v, 0);
    mean = sum / n;
    min = numbers[0];
    max = numbers[n - 1];
    range = max - min;

    // Median
    if (n % 2 === 1) {
      median = numbers[Math.floor(n / 2)];
    } else {
      median = (numbers[n / 2 - 1] + numbers[n / 2]) / 2;
    }

    // Quartiles
    const lowerHalf = numbers.slice(0, Math.floor(n / 2));
    const upperHalf = n % 2 === 1 ? numbers.slice(Math.floor(n / 2) + 1) : numbers.slice(n / 2);

    const getMedian = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 === 1 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
    };

    q1 = getMedian(lowerHalf);
    q3 = getMedian(upperHalf);
    iqr = q3 - q1;

    // Mode
    const freq: Record<number, number> = {};
    let maxFreq = 0;
    numbers.forEach(v => {
      freq[v] = (freq[v] || 0) + 1;
      if (freq[v] > maxFreq) maxFreq = freq[v];
    });

    if (maxFreq > 1) {
      mode = Object.keys(freq)
        .map(Number)
        .filter(k => freq[k] === maxFreq);
    }

    // Variance
    const sumSqDiff = numbers.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    variancePop = sumSqDiff / n;
    varianceSample = n > 1 ? sumSqDiff / (n - 1) : 0;
    stdDevPop = Math.sqrt(variancePop);
    stdDevSample = Math.sqrt(varianceSample);
  }

  // Distribution bins for mini visual histogram
  const binCount = 6;
  const binWidth = range > 0 ? range / binCount : 1;
  const bins = Array.from({ length: binCount }, (_, i) => {
    const low = min + i * binWidth;
    const high = low + binWidth;
    const count = numbers.filter(v => (i === binCount - 1 ? v >= low && v <= high : v >= low && v < high)).length;
    return { label: `${low.toFixed(1)}–${high.toFixed(1)}`, count, pct: n > 0 ? (count / n) * 100 : 0 };
  });

  const loadPreset = (type: 'grades' | 'latency' | 'finance') => {
    if (type === 'grades') {
      setRawInput('1, 1, 2, 2, 2, 3, 3, 4, 1, 2, 5, 3, 2, 1, 2, 3');
    } else if (type === 'latency') {
      setRawInput('24, 28, 25, 31, 29, 27, 45, 26, 28, 25, 84, 26, 27, 30');
    } else {
      setRawInput('14200, 15800, 14900, 18500, 21000, 16400, 17200, 19800');
    }
  };

  const copyStatsSummary = () => {
    const text = `${t('stats_summary', 'Statistický souhrn')} (N = ${n}):
${t('mean', 'Průměr')}: ${mean.toFixed(4)}
${t('median', 'Medián')}: ${median}
${t('std_dev_sample', 'Směrodatná odchylka (výběrová)')}: ${stdDevSample.toFixed(4)}
${t('variance_sample', 'Rozptyl (výběrový)')}: ${varianceSample.toFixed(4)}
Min / Max: ${min} / ${max}
${t('quartiles', 'Kvartily')}: Q1 = ${q1}, Q3 = ${q3}, IQR = ${iqr}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {t('tool_statistics_tool_title', 'Statistická & Pravděpodobnostní Analýza')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('statistics_tool_desc', 'Výpočet aritmetického průměru, mediánu, rozptylu, směrodatných odchylek a kvartilů IQR.')}
          </p>
        </div>

        <button
          onClick={copyStatsSummary}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t('copied', 'Zkopírováno') : t('copy_summary', 'Kopírovat souhrn')}
        </button>
      </div>

      {/* Input & Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor={dataInputId} className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('data_sample_label', 'Datový vzorek (oddělený čárkami, mezerami nebo novými řádky)')}
          </label>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>{t('presets', 'Předvolby')}:</span>
            <button onClick={() => loadPreset('grades')} className="text-indigo-400 hover:underline">
              {t('preset_grades', 'Známky')}
            </button>
            <span aria-hidden="true">·</span>
            <button onClick={() => loadPreset('latency')} className="text-indigo-400 hover:underline">
              {t('preset_latency', 'Latence (ms)')}
            </button>
            <span aria-hidden="true">·</span>
            <button onClick={() => loadPreset('finance')} className="text-indigo-400 hover:underline">
              {t('preset_income', 'Příjmy')}
            </button>
          </div>
        </div>

        <textarea
          id={dataInputId}
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
          placeholder={t('data_input_placeholder', 'Zadejte čísla, např.: 10, 15, 20, 25...')}
        />
        <div className="text-[11px] font-mono text-slate-500">
          {t('detected_values_count', 'Detekováno {count} platných číselných hodnot', { count: n })}
        </div>
      </div>

      {/* KPI Cards */}
      {n > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                {t('mean', 'Aritmetický průměr')}
              </span>
              <span className="text-xl font-bold font-mono text-white tabular-nums mt-1 block">
                {mean.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{t('sum', 'Suma')} = {sum.toLocaleString()}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                {t('median', 'Medián (střed)')}
              </span>
              <span className="text-xl font-bold font-mono text-indigo-300 tabular-nums mt-1 block">
                {median}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {t('mode', 'Modus')}: {mode.length > 0 ? mode.join(', ') : t('none', 'Žádný')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                {t('std_dev_sample', 'Směrodatná odchylka (s)')}
              </span>
              <span className="text-xl font-bold font-mono text-amber-300 tabular-nums mt-1 block">
                {stdDevSample.toFixed(3)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{t('population_std', 'Populační σ')} = {stdDevPop.toFixed(3)}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                {t('variance_sample', 'Rozptyl (s²)')}
              </span>
              <span className="text-xl font-bold font-mono text-slate-200 tabular-nums mt-1 block">
                {varianceSample.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{t('range', 'Rozsah')} = {range}</span>
            </div>
          </div>

          {/* Quartiles & Box-plot summary */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              {t('quantiles_title', 'Kvantily a rozptýlení dat (Box-Plot data)')}
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">{t('minimum', 'Minimum')}</span>
                <span className="text-sm font-mono font-semibold text-slate-200">{min}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Q1 (25 %)</span>
                <span className="text-sm font-mono font-semibold text-indigo-300">{q1}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">{t('median', 'Medián')} Q2</span>
                <span className="text-sm font-mono font-semibold text-indigo-400">{median}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Q3 (75 %)</span>
                <span className="text-sm font-mono font-semibold text-indigo-300">{q3}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">{t('maximum', 'Maximum')}</span>
                <span className="text-sm font-mono font-semibold text-slate-200">{max}</span>
              </div>
            </div>

            {/* Visual Frequency Bins */}
            <div className="space-y-2 pt-2">
              <span className="text-[11px] text-slate-400 uppercase font-mono block">
                {t('frequency_histogram', 'Frekvenční rozdělení četností (Histogram)')}
              </span>
              <div className="space-y-1.5">
                {bins.map((bin, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <span className="w-24 font-mono text-[11px] text-slate-400 shrink-0">{bin.label}</span>
                    <div className="flex-1 h-4 bg-slate-950 rounded overflow-hidden">
                      <div
                        style={{ width: `${bin.pct}%` }}
                        className="h-full bg-indigo-500 transition-all duration-300 rounded"
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-[11px] text-slate-300">
                      {bin.count}× ({bin.pct.toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-500 rounded-xl bg-slate-900/20 border border-slate-800">
          {t('enter_at_least_one_number', 'Zadejte alespoň jedno číslo pro výpočet statistiky.')}
        </div>
      )}
    </div>
  );
};
