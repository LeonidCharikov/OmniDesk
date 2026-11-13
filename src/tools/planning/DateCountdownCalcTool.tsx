import React, { useState, useEffect, useMemo } from 'react';
import { CalendarDays, Cake, Plus, Trash2, Clock, ArrowRightLeft } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface CountdownItem {
  id: string;
  title: string;
  targetDate: string;
}

const STORAGE_KEY = 'omnidesk_countdowns_v1';

function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(str: string): Date | null {
  if (!str) return null;
  const parts = str.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function diffYMD(from: Date, to: Date): { years: number; months: number; days: number; totalDays: number; negative: boolean } {
  const negative = to.getTime() < from.getTime();
  const start = negative ? new Date(to) : new Date(from);
  const end = negative ? new Date(from) : new Date(to);

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return { years, months, days, totalDays, negative };
}

function countWeekdays(from: Date, to: Date): number {
  const start = new Date(Math.min(from.getTime(), to.getTime()));
  const end = new Date(Math.max(from.getTime(), to.getTime()));
  let count = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export const DateCountdownCalcTool: React.FC = () => {
  const { t, language } = useI18n();
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [tab, setTab] = useState<'diff' | 'age' | 'offset' | 'countdown'>('diff');

  // Diff state
  const [startDate, setStartDate] = useState(() => toInputDate(today));
  const [endDate, setEndDate] = useState(() => {
    const next = new Date(today);
    next.setDate(next.getDate() + 30);
    return toInputDate(next);
  });

  // Age state
  const [birthDate, setBirthDate] = useState('1995-06-15');

  // Offset state
  const [baseDate, setBaseDate] = useState(() => toInputDate(today));
  const [offsetDir, setOffsetDir] = useState<'add' | 'sub'>('add');
  const [offsetYears, setOffsetYears] = useState('0');
  const [offsetMonths, setOffsetMonths] = useState('0');
  const [offsetWeeks, setOffsetWeeks] = useState('0');
  const [offsetDays, setOffsetDays] = useState('14');

  // Countdowns state
  const [countdowns, setCountdowns] = useState<CountdownItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const nextYear = new Date(today.getFullYear() + 1, 0, 1);
    return [
      {
        id: 'default-ny',
        title: 'New Year',
        targetDate: toInputDate(nextYear),
      },
    ];
  });
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 10);
    return toInputDate(d);
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(countdowns));
    } catch {
      // ignore
    }
  }, [countdowns]);

  const diffResult = useMemo(() => {
    const d1 = parseLocalDate(startDate);
    const d2 = parseLocalDate(endDate);
    if (!d1 || !d2) return null;
    const ymd = diffYMD(d1, d2);
    const weekdays = countWeekdays(d1, d2);
    const weeks = Math.floor(ymd.totalDays / 7);
    const remDays = ymd.totalDays % 7;
    return { ...ymd, weekdays, weeks, remDays };
  }, [startDate, endDate]);

  const ageResult = useMemo(() => {
    const b = parseLocalDate(birthDate);
    if (!b || b.getTime() > today.getTime()) return null;
    const ymd = diffYMD(b, today);
    let nextBday = new Date(today.getFullYear(), b.getMonth(), b.getDate());
    if (nextBday.getTime() < today.getTime()) {
      nextBday = new Date(today.getFullYear() + 1, b.getMonth(), b.getDate());
    }
    const daysToBday = Math.round((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const dayOfWeek = b.toLocaleDateString(language, { weekday: 'long' });
    return { ...ymd, daysToBday, dayOfWeek };
  }, [birthDate, today, language]);

  const offsetResult = useMemo(() => {
    const base = parseLocalDate(baseDate);
    if (!base) return null;
    const sign = offsetDir === 'add' ? 1 : -1;
    const res = new Date(base);
    res.setFullYear(res.getFullYear() + sign * (Number(offsetYears) || 0));
    res.setMonth(res.getMonth() + sign * (Number(offsetMonths) || 0));
    res.setDate(res.getDate() + sign * ((Number(offsetWeeks) || 0) * 7 + (Number(offsetDays) || 0)));
    return {
      iso: toInputDate(res),
      formatted: res.toLocaleDateString(language, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
  }, [baseDate, offsetDir, offsetYears, offsetMonths, offsetWeeks, offsetDays, language]);

  const addCountdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newTarget) return;
    setCountdowns(prev => [
      { id: Date.now().toString(), title: newTitle.trim(), targetDate: newTarget },
      ...prev,
    ]);
    setNewTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('dc_title', 'Date Difference, Age & Countdown Calculator')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('dc_subtitle', 'Calculate exact age, days between dates, future/past dates, and personal countdowns.')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            {([
              { id: 'diff', label: t('dc_tab_diff', 'Date Difference') },
              { id: 'age', label: t('dc_tab_age', 'Age Calculator') },
              { id: 'offset', label: t('dc_tab_offset', 'Add / Subtract') },
              { id: 'countdown', label: t('dc_tab_countdown', 'Countdowns') },
            ] as const).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tab === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'diff' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('dc_start_date', 'Start Date')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                />
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const tmp = startDate;
                    setStartDate(endDate);
                    setEndDate(tmp);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-indigo-500/40 flex items-center gap-2 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('dc_swap_dates', 'Swap Dates')}</span>
                </button>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('dc_end_date', 'End Date')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                />
              </div>
            </div>

            {diffResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">{t('dc_total_days', 'Total Days')}</div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-indigo-300 mt-1">
                    {diffResult.totalDays.toLocaleString(language)}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">{t('dc_ymd_breakdown', 'Years / Months / Days')}</div>
                  <div className="text-base font-bold font-mono tabular-nums text-white mt-1">
                    {diffResult.years}y {diffResult.months}m {diffResult.days}d
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">{t('dc_weeks_days', 'Weeks & Days')}</div>
                  <div className="text-base font-bold font-mono tabular-nums text-slate-200 mt-1">
                    {diffResult.weeks}w {diffResult.remDays}d
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">{t('dc_weekdays', 'Weekdays (Mon–Fri)')}</div>
                  <div className="text-base font-bold font-mono tabular-nums text-emerald-400 mt-1">
                    {diffResult.weekdays.toLocaleString(language)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'age' && (
          <div className="space-y-5">
            <div className="max-w-xs">
              <label className="block text-xs text-slate-400 mb-1">{t('dc_birth_date', 'Date of Birth')}</label>
              <input
                type="date"
                value={birthDate}
                max={toInputDate(today)}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>

            {ageResult ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 sm:col-span-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Cake className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('dc_exact_age', 'Exact Age')}</span>
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-white mt-1">
                    {ageResult.years} {t('dc_years', 'years')} · {ageResult.months} {t('dc_months', 'months')} · {ageResult.days} {t('dc_days', 'days')}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">{t('dc_next_birthday', 'Next Birthday In')}</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
                    {ageResult.daysToBday} {t('dc_days', 'days')}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400">{t('dc_born_on', 'Born On')}</div>
                  <div className="text-base font-semibold text-indigo-300 mt-1 capitalize">
                    {ageResult.dayOfWeek}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {ageResult.totalDays.toLocaleString(language)} {t('dc_days_lived', 'days lived')}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-400">{t('dc_invalid_birth', 'Please choose a birth date today or earlier.')}</p>
            )}
          </div>
        )}

        {tab === 'offset' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">{t('dc_base_date', 'Base Date')}</label>
                <input
                  type="date"
                  value={baseDate}
                  onChange={e => setBaseDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('dc_operation', 'Operation')}</label>
                <select
                  value={offsetDir}
                  onChange={e => setOffsetDir(e.target.value as 'add' | 'sub')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200"
                >
                  <option value="add">{t('dc_add', '+ Add')}</option>
                  <option value="sub">{t('dc_subtract', '- Subtract')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('dc_years_label', 'Years')}</label>
                <input
                  type="number"
                  min="0"
                  value={offsetYears}
                  onChange={e => setOffsetYears(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('dc_months_label', 'Months')}</label>
                <input
                  type="number"
                  min="0"
                  value={offsetMonths}
                  onChange={e => setOffsetMonths(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('dc_weeks_label', 'Weeks')}</label>
                  <input
                    type="number"
                    min="0"
                    value={offsetWeeks}
                    onChange={e => setOffsetWeeks(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('dc_days_label', 'Days')}</label>
                  <input
                    type="number"
                    min="0"
                    value={offsetDays}
                    onChange={e => setOffsetDays(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                  />
                </div>
              </div>
            </div>

            {offsetResult && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400">{t('dc_resulting_date', 'Resulting Date')}</div>
                  <div className="text-xl font-bold text-white capitalize mt-0.5">{offsetResult.formatted}</div>
                </div>
                <span className="text-sm font-mono tabular-nums text-indigo-300">{offsetResult.iso}</span>
              </div>
            )}
          </div>
        )}

        {tab === 'countdown' && (
          <div className="space-y-5">
            <form onSubmit={addCountdown} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6">
                <label className="block text-xs text-slate-400 mb-1">{t('dc_event_name', 'Event Name')}</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={t('dc_event_placeholder', 'e.g., Summer Holiday, Exam, Birthday...')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="block text-xs text-slate-400 mb-1">{t('dc_target_date', 'Target Date')}</label>
                <input
                  type="date"
                  required
                  value={newTarget}
                  onChange={e => setNewTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('dc_add_countdown', 'Add')}</span>
                </button>
              </div>
            </form>

            {countdowns.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500">
                {t('dc_no_countdowns', 'No saved countdowns yet. Add your first event above.')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {countdowns.map(item => {
                  const target = parseLocalDate(item.targetDate);
                  const diffDays = target
                    ? Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{item.title}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">{item.targetDate}</div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span
                            className={`text-sm font-bold font-mono tabular-nums ${
                              diffDays === 0
                                ? 'text-emerald-400'
                                : diffDays > 0
                                  ? 'text-indigo-300'
                                  : 'text-slate-400'
                            }`}
                          >
                            {diffDays === 0
                              ? t('dc_today', 'Today!')
                              : diffDays > 0
                                ? `${diffDays} ${t('dc_days_left', 'days left')}`
                                : `${Math.abs(diffDays)} ${t('dc_days_ago', 'days ago')}`}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCountdowns(prev => prev.filter(c => c.id !== item.id))}
                        aria-label={t('delete_item', 'Delete item')}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
