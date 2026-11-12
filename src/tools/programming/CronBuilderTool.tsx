import React, { useState, useMemo, useId } from 'react';
import { CalendarClock, Copy, Check, AlertCircle, Play } from 'lucide-react';
import { useI18n } from '../../i18n/context';

const MONTH_ALIASES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DOW_ALIASES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

function parseCronField(
  expr: string,
  min: number,
  max: number,
  aliases?: Record<string, number>,
  wrapSevenToZero = false
): Set<number> | null {
  const result = new Set<number>();
  const parts = expr.trim().toLowerCase().split(',');
  if (parts.length === 0 || parts.some(p => !p)) return null;

  const resolveToken = (tok: string): number | null => {
    if (aliases && tok in aliases) return aliases[tok];
    if (!/^\d+$/.test(tok)) return null;
    const n = Number(tok);
    if (wrapSevenToZero && n === 7) return 0;
    if (n < min || n > max) return null;
    return n;
  };

  for (const part of parts) {
    const slashSplit = part.split('/');
    if (slashSplit.length > 2) return null;
    const [rangePart, stepStr] = slashSplit;
    const step = stepStr !== undefined ? Number(stepStr) : 1;
    if (!Number.isInteger(step) || step <= 0) return null;

    if (rangePart === '*') {
      for (let v = min; v <= max; v += step) result.add(wrapSevenToZero && v === 7 ? 0 : v);
    } else if (rangePart.includes('-')) {
      const dashSplit = rangePart.split('-');
      if (dashSplit.length !== 2) return null;
      const start = resolveToken(dashSplit[0]);
      const end = resolveToken(dashSplit[1]);
      if (start === null || end === null || start > end) return null;
      for (let v = start; v <= end; v += step) result.add(v);
    } else {
      const single = resolveToken(rangePart);
      if (single === null) return null;
      if (stepStr !== undefined) {
        for (let v = single; v <= max; v += step) result.add(v);
      } else {
        result.add(single);
      }
    }
  }

  return result.size > 0 ? result : null;
}

interface ParsedCron {
  minutes: Set<number>;
  hours: Set<number>;
  doms: Set<number>;
  months: Set<number>;
  dows: Set<number>;
  domWildcard: boolean;
  dowWildcard: boolean;
}

function parseCronExpression(raw: string): ParsedCron | null {
  const fields = raw.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const minutes = parseCronField(fields[0], 0, 59);
  const hours = parseCronField(fields[1], 0, 23);
  const doms = parseCronField(fields[2], 1, 31);
  const months = parseCronField(fields[3], 1, 12, MONTH_ALIASES);
  const dows = parseCronField(fields[4], 0, 7, DOW_ALIASES, true);
  if (!minutes || !hours || !doms || !months || !dows) return null;
  return {
    minutes,
    hours,
    doms,
    months,
    dows,
    domWildcard: fields[2].trim() === '*',
    dowWildcard: fields[4].trim() === '*',
  };
}

function getNextRuns(parsed: ParsedCron, count: number, useUtc: boolean): Date[] {
  const runs: Date[] = [];
  const cursor = new Date();
  cursor.setUTCSeconds(0, 0);
  if (useUtc) cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  else cursor.setMinutes(cursor.getMinutes() + 1);

  const maxIter = 525600 * 4; // up to 4 years for leap-day schedules
  for (let i = 0; i < maxIter && runs.length < count; i++) {
    const m = useUtc ? cursor.getUTCMonth() + 1 : cursor.getMonth() + 1;
    if (!parsed.months.has(m)) {
      if (useUtc) {
        cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
        cursor.setUTCHours(0, 0, 0, 0);
      } else {
        cursor.setMonth(cursor.getMonth() + 1, 1);
        cursor.setHours(0, 0, 0, 0);
      }
      continue;
    }

    const dom = useUtc ? cursor.getUTCDate() : cursor.getDate();
    const dow = useUtc ? cursor.getUTCDay() : cursor.getDay();
    const domMatch = parsed.doms.has(dom);
    const dowMatch = parsed.dows.has(dow);
    const dayMatches =
      parsed.domWildcard && parsed.dowWildcard
        ? true
        : parsed.domWildcard
          ? dowMatch
          : parsed.dowWildcard
            ? domMatch
            : domMatch || dowMatch;

    if (!dayMatches) {
      if (useUtc) {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        cursor.setUTCHours(0, 0, 0, 0);
      } else {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
      }
      continue;
    }

    const h = useUtc ? cursor.getUTCHours() : cursor.getHours();
    if (!parsed.hours.has(h)) {
      if (useUtc) {
        cursor.setUTCHours(cursor.getUTCHours() + 1, 0, 0, 0);
      } else {
        cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
      }
      continue;
    }

    const min = useUtc ? cursor.getUTCMinutes() : cursor.getMinutes();
    if (parsed.minutes.has(min)) {
      runs.push(new Date(cursor.getTime()));
    }
    cursor.setTime(cursor.getTime() + 60000);
  }
  return runs;
}

export const CronBuilderTool: React.FC = () => {
  const { t, language } = useI18n();
  const [expression, setExpression] = useState('*/15 9-17 * * 1-5');
  const [useUtc, setUseUtc] = useState(false);
  const [runCount, setRunCount] = useState(10);
  const [copied, setCopied] = useState(false);

  const exprId = useId();
  const fields = expression.trim().split(/\s+/);
  const parsed = useMemo(() => parseCronExpression(expression), [expression]);

  const nextRuns = useMemo(() => {
    if (!parsed) return [];
    return getNextRuns(parsed, Math.min(25, Math.max(1, runCount)), useUtc);
  }, [parsed, runCount, useUtc]);

  const updateField = (idx: number, val: string) => {
    const parts = expression.trim().split(/\s+/);
    while (parts.length < 5) parts.push('*');
    parts[idx] = val || '*';
    setExpression(parts.slice(0, 5).join(' '));
  };

  const presets = [
    { label: t('cron_preset_every_min', 'Every minute'), expr: '* * * * *' },
    { label: t('cron_preset_5m', 'Every 5 minutes'), expr: '*/5 * * * *' },
    { label: t('cron_preset_hourly', 'Hourly'), expr: '0 * * * *' },
    { label: t('cron_preset_daily', 'Daily at midnight'), expr: '0 0 * * *' },
    { label: t('cron_preset_weekdays', 'Weekdays at 9:00'), expr: '0 9 * * 1-5' },
    { label: t('cron_preset_biz_15m', 'Work hours (15m)'), expr: '*/15 9-17 * * 1-5' },
    { label: t('cron_preset_monthly', 'Monthly (1st)'), expr: '0 0 1 * *' },
  ];

  const fieldDefs = [
    { idx: 0, label: t('cron_field_minute', 'Minute (0–59)'), placeholder: '0-59' },
    { idx: 1, label: t('cron_field_hour', 'Hour (0–23)'), placeholder: '0-23' },
    { idx: 2, label: t('cron_field_dom', 'Day / Month (1–31)'), placeholder: '1-31' },
    { idx: 3, label: t('cron_field_month', 'Month (1–12)'), placeholder: '1-12' },
    { idx: 4, label: t('cron_field_dow', 'Day / Week (0–6)'), placeholder: '0-6' },
  ];

  const copyExpr = () => {
    navigator.clipboard.writeText(expression.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-400" />
            {t('tool_cron_builder_title', 'Cron Expression Builder & Simulator')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_cron_builder_desc', 'Build and validate 5-field Cron expressions and simulate upcoming execution timestamps.')}
          </p>
        </div>

        <button
          onClick={copyExpr}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? t('copied', 'Copied') : t('copy', 'Copy')}
        </button>
      </div>

      {/* Expression Input & Presets */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="space-y-2">
          <label htmlFor={exprId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {t('cron_expression_label', 'Cron Expression (5 fields)')}
          </label>
          <input
            id={exprId}
            type="text"
            value={expression}
            onChange={e => setExpression(e.target.value)}
            spellCheck={false}
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-lg font-mono text-indigo-300 tracking-wider focus:outline-none"
          />
        </div>

        {/* 5 Individual Field Editors */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {fieldDefs.map(fd => (
            <div key={fd.idx} className="space-y-1">
              <span className="text-[11px] text-slate-400 block">{fd.label}</span>
              <input
                type="text"
                value={fields[fd.idx] || ''}
                onChange={e => updateField(fd.idx, e.target.value)}
                placeholder={fd.placeholder}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-500">{t('cron_presets', 'Presets')}:</span>
          {presets.map(p => (
            <button
              key={p.expr}
              onClick={() => setExpression(p.expr)}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                expression.trim() === p.expr
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-indigo-500/50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {!parsed && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{t('cron_invalid_expr', 'Invalid 5-field Cron expression. Expected: minute hour day-of-month month day-of-week.')}</span>
          </div>
        )}
      </div>

      {/* Next Runs Simulator */}
      {parsed && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              {t('cron_next_runs', 'Next Scheduled Executions')}
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 text-slate-300">
                <span className="text-slate-400">{t('uuid_count', 'Quantity')}:</span>
                <select
                  value={runCount}
                  onChange={e => setRunCount(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                >
                  {[5, 10, 15, 20].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                <button
                  onClick={() => setUseUtc(false)}
                  className={`px-2 py-1 rounded text-[11px] font-mono ${!useUtc ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  {t('ts_local_short', 'Local')}
                </button>
                <button
                  onClick={() => setUseUtc(true)}
                  className={`px-2 py-1 rounded text-[11px] font-mono ${useUtc ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  UTC
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {nextRuns.map((d, idx) => (
              <div key={d.toISOString()} className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono">
                <span className="text-slate-500">#{idx + 1}</span>
                <span className="text-emerald-300">
                  {useUtc ? d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : d.toLocaleString(language)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
