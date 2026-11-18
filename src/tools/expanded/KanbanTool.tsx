import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { button, secondary, input, panel, ToolHeader } from './shared';

/* ─────────────────────────────────────────────────────────────
   5. TO-DO / KANBAN
   ───────────────────────────────────────────────────────────── */
type BoardTask = {
  id: number;
  text: string;
  column: 'todo' | 'doing' | 'done';
  priority?: 'low' | 'med' | 'high';
};

const KANBAN_STORAGE_KEY = 'omnidesk-kanban-board-v2';

export const KanbanTool: React.FC = () => {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<BoardTask[]>(() => {
    try {
      const saved = localStorage.getItem(KANBAN_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { id: 1, text: t('task_prep_report', 'Připravit čtvrtletní report'), column: 'todo', priority: 'high' },
      { id: 2, text: t('task_check_backups', 'Zkontrolovat zálohy souborů'), column: 'doing', priority: 'med' },
      { id: 3, text: t('task_update_todo', 'Aktualizovat seznam úkolů'), column: 'done', priority: 'low' },
    ];
  });
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<BoardTask['priority']>('med');

  useEffect(() => {
    try {
      localStorage.setItem(KANBAN_STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks]);

  useEffect(() => {
    const handleExternalKanban = () => {
      try {
        const saved = localStorage.getItem(KANBAN_STORAGE_KEY);
        if (saved) setTasks(JSON.parse(saved));
      } catch {
        // ignore
      }
    };
    window.addEventListener('omnidesk-kanban-updated', handleExternalKanban);
    return () => window.removeEventListener('omnidesk-kanban-updated', handleExternalKanban);
  }, []);

  const add = () => {
    if (text.trim()) {
      setTasks([...tasks, { id: Date.now(), text: text.trim(), column: 'todo', priority }]);
      setText('');
    }
  };

  const move = (id: number, column: BoardTask['column']) => {
    setTasks(tasks.map(task => (task.id === id ? { ...task, column } : task)));
  };

  const remove = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const clearCompleted = () => {
    setTasks(tasks.filter(task => task.column !== 'done'));
  };

  return (
    <div className="space-y-5">
      <ToolHeader title="To-do / Kanban" description={t('kanban_desc', 'Simple three-column task board with persistent local storage.')} />
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className={input + ' flex-1 min-w-[200px]'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={t('new_task_placeholder', 'Nový úkol…')}
        />
        <select
          className={input + ' w-auto'}
          value={priority}
          onChange={e => setPriority(e.target.value as BoardTask['priority'])}
        >
          <option value="low">{t('priority_low', 'Nízká priorita')}</option>
          <option value="med">{t('priority_med', 'Střední priorita')}</option>
          <option value="high">{t('priority_high', 'Vysoká priorita')}</option>
        </select>
        <button className={button} onClick={add}>
          <Plus className="inline w-4 h-4 mr-1" /> {t('add_task', 'Přidat úkol')}
        </button>
        {tasks.some(t => t.column === 'done') && (
          <button className={secondary} onClick={clearCompleted}>
            {t('clear_completed', 'Vymazat hotové')}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {(['todo', 'doing', 'done'] as const).map(column => {
          const colTasks = tasks.filter(task => task.column === column);
          return (
            <div key={column} className={panel + ' min-h-64 flex flex-col'}>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <h3 className="font-semibold text-white text-sm">
                  {column === 'todo'
                    ? t('planned', 'Naplánováno')
                    : column === 'doing'
                    ? t('in_progress', 'Probíhá')
                    : t('done', 'Hotovo')}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2 flex-1">
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg bg-slate-800/90 border border-slate-700/60 text-sm flex flex-col gap-2 group shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`break-words ${column === 'done' ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                        {t(task.text, task.text)}
                      </span>
                      <button
                        className="text-slate-500 hover:text-rose-400 p-0.5 opacity-60 group-hover:opacity-100"
                        onClick={() => remove(task.id)}
                        title={t('delete', 'Smazat')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/40">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          task.priority === 'high'
                            ? 'bg-rose-500/20 text-rose-300'
                            : task.priority === 'low'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {task.priority === 'high' ? 'High' : task.priority === 'low' ? 'Low' : 'Med'}
                      </span>
                      <select
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded px-1.5 py-0.5 outline-none"
                        value={task.column}
                        onChange={e => move(task.id, e.target.value as BoardTask['column'])}
                      >
                        <option value="todo">{t('planned', 'Naplánováno')}</option>
                        <option value="doing">{t('in_progress', 'Probíhá')}</option>
                        <option value="done">{t('done', 'Hotovo')}</option>
                      </select>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <p className="text-center text-xs text-slate-600 py-6">
                    {t('no_tasks_in_column', 'Žádné úkoly')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
