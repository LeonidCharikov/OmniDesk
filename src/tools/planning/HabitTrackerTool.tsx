import React, { useState, useEffect, useMemo } from 'react';
import { Check, Flame, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface Habit {
  id: string;
  name: string;
  history: Record<string, boolean>;
}

const STORAGE_KEY = 'omnidesk_habit_tracker_v1';

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getLastNDays(n: number): Date[] {
  const today = new Date();
  const list: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    list.push(d);
  }
  return list;
}

function calcStreak(history: Record<string, boolean>): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = toDateKey(d);
    if (history[key]) {
      streak++;
    } else if (i === 0) {
      // Allow today not yet checked if yesterday was checked
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export const HabitTrackerTool: React.FC = () => {
  const { t, language } = useI18n();
  const days = useMemo(() => getLastNDays(7), []);
  const todayKey = toDateKey(days[days.length - 1]);

  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    const yesterday = toDateKey(new Date(Date.now() - 86400000));
    return [
      { id: 'h-water', name: t('ht_sample_water', 'Drink 2L Water'), history: { [yesterday]: true } },
      { id: 'h-read', name: t('ht_sample_read', 'Read 20 Minutes'), history: {} },
      { id: 'h-walk', name: t('ht_sample_walk', 'Walk 8,000 Steps'), history: {} },
    ];
  });

  const [newHabitName, setNewHabitName] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch {
      // ignore
    }
  }, [habits]);

  const toggleDay = (habitId: string, dateKey: string) => {
    setHabits(prev =>
      prev.map(h =>
        h.id === habitId
          ? { ...h, history: { ...h.history, [dateKey]: !h.history[dateKey] } }
          : h
      )
    );
  };

  const addHabit = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setHabits(prev => [...prev, { id: Date.now().toString(), name: trimmed, history: {} }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addHabit(newHabitName);
    setNewHabitName('');
  };

  const todayDoneCount = habits.filter(h => h.history[todayKey]).length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('ht_title', 'Habit Tracker & Streak Grid')}</h2>
              <p className="text-xs text-slate-400">
                {t('ht_subtitle', 'Track daily routines across the week and build consistent streaks locally.')}
              </p>
            </div>
          </div>

          <div className="text-xs font-mono tabular-nums text-slate-300">
            {t('ht_today_progress', 'Today')}: <span className="text-emerald-400 font-bold">{todayDoneCount} / {habits.length}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
          <input
            type="text"
            value={newHabitName}
            onChange={e => setNewHabitName(e.target.value)}
            placeholder={t('ht_new_placeholder', 'New daily habit (e.g., Stretch, Meditate, No sugar)...')}
            className="flex-1 min-w-[220px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('ht_add_btn', 'Add Habit')}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {t('ht_quick_add', 'Quick add:')}
          </span>
          {[
            t('ht_preset_vitamins', 'Take Vitamins'),
            t('ht_preset_workout', '30m Exercise'),
            t('ht_preset_journal', 'Evening Journal'),
            t('ht_preset_noscreen', 'Screen-Free Before Bed'),
          ].map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => addHabit(preset)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/40 transition-colors"
            >
              + {preset}
            </button>
          ))}
        </div>

        {habits.length === 0 ? (
          <div className="p-10 text-center rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500">
            {t('ht_empty', 'No habits yet. Add your first habit above to start tracking your streaks.')}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                  <th className="py-3 px-4 font-medium">{t('ht_col_habit', 'Habit')}</th>
                  {days.map(d => {
                    const key = toDateKey(d);
                    const isToday = key === todayKey;
                    return (
                      <th key={key} className="py-3 px-2 text-center font-medium min-w-[54px]">
                        <div className={isToday ? 'text-indigo-400 font-bold' : ''}>
                          {d.toLocaleDateString(language, { weekday: 'short' })}
                        </div>
                        <div className="text-[10px] font-mono tabular-nums text-slate-500">{d.getDate()}</div>
                      </th>
                    );
                  })}
                  <th className="py-3 px-4 text-right font-medium">{t('ht_col_streak', 'Streak')}</th>
                  <th className="py-3 px-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {habits.map(habit => {
                  const streak = calcStreak(habit.history);
                  return (
                    <tr key={habit.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-slate-200">{habit.name}</td>
                      {days.map(d => {
                        const key = toDateKey(d);
                        const checked = Boolean(habit.history[key]);
                        return (
                          <td key={key} className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleDay(habit.id, key)}
                              aria-label={`${habit.name} ${key}`}
                              className={`w-8 h-8 rounded-lg inline-flex items-center justify-center border transition-colors ${
                                checked
                                  ? 'bg-emerald-600 border-emerald-500 text-white'
                                  : 'bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-600'
                              }`}
                            >
                              {checked && <Check className="w-4 h-4" />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                        <span className={streak > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          {streak} {t('ht_days_unit', 'd')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setHabits(prev => prev.filter(h => h.id !== habit.id))}
                          aria-label={t('delete_item', 'Delete item')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
