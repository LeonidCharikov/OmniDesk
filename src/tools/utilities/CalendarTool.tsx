import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Trash2,
  Edit3,
  Check,
  Save,
  AlertCircle,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

/* ── Types ─────────────────────────────────────────────────── */
interface CalendarEvent {
  id: string;
  date: string;        // YYYY-MM-DD
  hour: number;        // 0..23
  minute: number;      // 0 or 30 (half-hour slots)
  title: string;
  description: string;
  color: string;       // tailwind-friendly color key
  durationMinutes: number; // 30, 60, 90, 120
  recurrence?: 'none' | 'weekly' | 'daily';
}

type ViewMode = 'month' | 'week' | 'day';

const EVENT_COLORS = [
  { key: 'indigo', bg: 'bg-indigo-500/20', border: 'border-indigo-500/50', text: 'text-indigo-300', dot: 'bg-indigo-500' },
  { key: 'emerald', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', dot: 'bg-emerald-500' },
  { key: 'amber', bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-300', dot: 'bg-amber-500' },
  { key: 'rose', bg: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-300', dot: 'bg-rose-500' },
  { key: 'blue', bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-300', dot: 'bg-blue-500' },
  { key: 'purple', bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-300', dot: 'bg-purple-500' },
  { key: 'cyan', bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', text: 'text-cyan-300', dot: 'bg-cyan-500' },
  { key: 'orange', bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-300', dot: 'bg-orange-500' },
];

const STORAGE_KEY = 'omnidesk_calendar_events';
const HOURS = Array.from({ length: 24 }, (_, i) => i);
function getLocale(language: string): string {
  return language === 'cs' ? 'cs-CZ' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : language === 'ru' ? 'ru-RU' : 'en-US';
}

function getDayNames(locale: string): string[] {
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  });
}

function getMonthNames(locale: string): string[] {
  return Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2024, index, 1))
  );
}

/* ── Helpers ───────────────────────────────────────────────── */
function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveEvents(events: CalendarEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const firstDayOfWeek = first.getDay() === 0 ? 6 : first.getDay() - 1; // Monday-based
  const startDate = new Date(first);
  startDate.setDate(1 - firstDayOfWeek);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getColorObj(key: string) {
  return EVENT_COLORS.find(c => c.key === key) || EVENT_COLORS[0];
}

/* ── Main Component ────────────────────────────────────────── */
export const CalendarTool: React.FC = () => {
  const { t, language } = useI18n();
  const locale = getLocale(language);
  const dayNames = getDayNames(locale);
  const monthNames = getMonthNames(locale);
  const [events, setEvents] = useState<CalendarEvent[]>(loadEvents);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; hour: number; minute: number } | null>(null);
  const [workdayStart, setWorkdayStart] = useState(dateToStr(new Date()));
  const [workdayCount, setWorkdayCount] = useState(20);
  const [workdayResult, setWorkdayResult] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist events
  useEffect(() => { saveEvents(events); }, [events]);

  // Scroll to current hour on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const offset = now.getHours() * 64 - 100;
      scrollRef.current.scrollTop = Math.max(0, offset);
    }
  }, [viewMode]);

  /* ── Navigation ──────────────────────────────────────────── */
  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  /* ── Event CRUD ──────────────────────────────────────────── */
  const addEvent = (ev: Omit<CalendarEvent, 'id'>) => {
    const count = ev.recurrence === 'daily' ? 30 : ev.recurrence === 'weekly' ? 12 : 1;
    const generated = Array.from({ length: count }, (_, index) => {
      const eventDate = new Date(`${ev.date}T12:00:00`);
      if (ev.recurrence === 'daily') eventDate.setDate(eventDate.getDate() + index);
      if (ev.recurrence === 'weekly') eventDate.setDate(eventDate.getDate() + index * 7);
      return { ...ev, date: dateToStr(eventDate), recurrence: 'none' as const, id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}` };
    });
    setEvents(prev => [...prev, ...generated]);
  };

  const updateEvent = (ev: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === ev.id ? ev : e));
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const getEventsForDate = (dateStr: string) =>
    events.filter(e => e.date === dateStr).sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

  const getEventsForSlot = (dateStr: string, hour: number) =>
    events.filter(e => {
      if (e.date !== dateStr) return false;
      const evStart = e.hour * 60 + e.minute;
      const evEnd = evStart + e.durationMinutes;
      const slotStart = hour * 60;
      const slotEnd = slotStart + 60;
      return evStart < slotEnd && evEnd > slotStart;
    });

  /* ── Open modal ──────────────────────────────────────────── */
  const openNewEvent = (date: string, hour: number, minute: number = 0) => {
    setSelectedSlot({ date, hour, minute });
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setSelectedSlot({ date: ev.date, hour: ev.hour, minute: ev.minute });
    setShowEventModal(true);
  };

  /* ── Header title ────────────────────────────────────────── */
  const getTitle = (): string => {
    if (viewMode === 'month') {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === 'week') {
      const week = getWeekDays(currentDate);
      const first = week[0];
      const last = week[6];
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()}–${last.getDate()} ${monthNames[first.getMonth()]} ${first.getFullYear()}`;
      }
      return `${first.getDate()} ${monthNames[first.getMonth()].slice(0, 3)} – ${last.getDate()} ${monthNames[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;
    } else {
      const dayIdx = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
      return `${dayNames[dayIdx]} ${currentDate.getDate()}. ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  const today = new Date();
  const todayStr = dateToStr(today);
  const calculateWorkday = () => {
    const date = new Date(`${workdayStart}T12:00:00`);
    let remaining = Math.max(0, workdayCount);
    while (remaining > 0) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) remaining -= 1;
    }
    setWorkdayResult(dateToStr(date));
  };

  return (
    <div className="space-y-4">
      {/* ── Top Bar ──────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_calendar_title', 'Kalendář & Plánovač')}
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            {t('tool_calendar_desc', 'Týdenní a měsíční kalendář s poznámkami pro každou hodinu. Data se ukládají lokálně.')}
          </p>
        </div>

        {/* View mode switch */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode === 'month' ? t('cal_month', 'Měsíc') : mode === 'week' ? t('cal_week', 'Týden') : t('cal_day', 'Den')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Navigation Bar ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors">
            {t('cal_today', 'Dnes')}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
          <h3 className="text-sm font-semibold text-white mb-2">{t('working_days_planning', 'Plánování pracovních dnů a dovolené')}</h3>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-slate-400">{t('start_date', 'Počáteční datum')}<input className="block mt-1 px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-white" type="date" value={workdayStart} onChange={event => setWorkdayStart(event.target.value)} /></label>
            <label className="text-xs text-slate-400">{t('working_days', 'Pracovní dny')}<input className="block mt-1 w-24 px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-white" type="number" min="0" value={workdayCount} onChange={event => setWorkdayCount(Number(event.target.value))} /></label>
            <button onClick={calculateWorkday} className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs">{t('calculate_date', 'Vypočítat datum')}</button>
            {workdayResult && <span className="text-xs text-emerald-400">{t('result', 'Výsledek')}: {workdayResult}</span>}
          </div>
        </div>
        <h3 className="text-sm font-bold text-white tracking-tight">{getTitle()}</h3>
        <button
          onClick={() => openNewEvent(dateToStr(selectedDate), new Date().getHours())}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('cal_new_event', 'Nová událost')}</span>
        </button>
      </div>

      {/* ── Calendar Views ───────────────────────────────────── */}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          todayStr={todayStr}
          selectedDate={selectedDate}
          events={events}
          onSelectDate={(d) => { setSelectedDate(d); setCurrentDate(d); setViewMode('day'); }}
          getEventsForDate={getEventsForDate}
          dayNames={dayNames}
        />
      )}

      {viewMode === 'week' && (
        <WeekView
          currentDate={currentDate}
          todayStr={todayStr}
          events={events}
          getEventsForSlot={getEventsForSlot}
          onSlotClick={openNewEvent}
          onEventClick={openEditEvent}
          scrollRef={scrollRef}
          dayNames={dayNames}
        />
      )}

      {viewMode === 'day' && (
        <DayView
          currentDate={currentDate}
          todayStr={todayStr}
          events={events}
          getEventsForSlot={getEventsForSlot}
          onSlotClick={openNewEvent}
          onEventClick={openEditEvent}
          scrollRef={scrollRef}
        />
      )}

      {/* ── Event Modal ──────────────────────────────────────── */}
      {showEventModal && (
        <EventModal
          slot={selectedSlot}
          event={editingEvent}
          onSave={(ev) => {
            if (editingEvent) updateEvent({ ...ev, id: editingEvent.id });
            else addEvent(ev);
            setShowEventModal(false);
          }}
          onDelete={(id) => { deleteEvent(id); setShowEventModal(false); }}
          onClose={() => setShowEventModal(false)}
        />
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MONTH VIEW
   ══════════════════════════════════════════════════════════════ */
const MonthView: React.FC<{
  currentDate: Date;
  todayStr: string;
  selectedDate: Date;
  events: CalendarEvent[];
  onSelectDate: (d: Date) => void;
  getEventsForDate: (ds: string) => CalendarEvent[];
  dayNames: string[];
}> = ({ currentDate, todayStr, selectedDate, events, onSelectDate, getEventsForDate, dayNames }) => {
  const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());

  return (
    <div className="rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-slate-900/80 border-b border-slate-800">
        {dayNames.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {d.slice(0, 2)}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const ds = dateToStr(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = ds === todayStr;
          const isSelected = isSameDay(day, selectedDate);
          const dayEvents = getEventsForDate(ds);

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(day)}
              className={`min-h-[80px] p-1.5 border-b border-r border-slate-800/60 text-left transition-colors hover:bg-slate-800/40 ${
                !isCurrentMonth ? 'opacity-40' : ''
              } ${isSelected ? 'bg-indigo-950/30' : ''}`}
            >
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                isToday
                  ? 'bg-indigo-600 text-white'
                  : isCurrentMonth
                    ? 'text-slate-200'
                    : 'text-slate-600'
              }`}>
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => {
                  const color = getColorObj(ev.color);
                  return (
                    <div
                      key={ev.id}
                      className={`text-[9px] px-1 py-0.5 rounded truncate ${color.bg} ${color.text}`}
                    >
                      {formatTime(ev.hour, ev.minute)} {ev.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-slate-500">+{dayEvents.length - 3} další</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   WEEK VIEW
   ══════════════════════════════════════════════════════════════ */
const WeekView: React.FC<{
  currentDate: Date;
  todayStr: string;
  events: CalendarEvent[];
  getEventsForSlot: (ds: string, h: number) => CalendarEvent[];
  onSlotClick: (ds: string, h: number, m?: number) => void;
  onEventClick: (ev: CalendarEvent) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  dayNames: string[];
}> = ({ currentDate, todayStr, events, getEventsForSlot, onSlotClick, onEventClick, scrollRef, dayNames }) => {
  const weekDays = getWeekDays(currentDate);

  return (
    <div className="rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden">
      {/* Header row with day names */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
        <div className="py-2 px-2 text-[10px] text-slate-500 font-mono border-r border-slate-800/60" />
        {weekDays.map((day, i) => {
          const ds = dateToStr(day);
          const isToday = ds === todayStr;
          return (
            <div key={i} className={`py-2 px-1 text-center border-r border-slate-800/60 ${isToday ? 'bg-indigo-950/30' : ''}`}>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">{dayNames[i].slice(0, 2)}</div>
              <div className={`text-sm font-bold mt-0.5 ${isToday ? 'text-indigo-400' : 'text-slate-200'}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="overflow-y-auto max-h-[600px]">
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-800/40">
            <div className="py-2 px-2 text-[10px] text-slate-500 font-mono border-r border-slate-800/60 flex items-start justify-end pr-2">
              {formatTime(hour, 0)}
            </div>
            {weekDays.map((day, di) => {
              const ds = dateToStr(day);
              const slotEvents = getEventsForSlot(ds, hour);
              const isToday = ds === todayStr;
              const isCurrentHour = isToday && new Date().getHours() === hour;

              return (
                <div
                  key={di}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-event]')) return;
                    onSlotClick(ds, hour);
                  }}
                  className={`min-h-[60px] border-r border-slate-800/40 p-0.5 cursor-pointer hover:bg-slate-800/30 transition-colors relative ${
                    isToday ? 'bg-indigo-950/10' : ''
                  } ${isCurrentHour ? 'bg-indigo-950/20' : ''}`}
                >
                  {/* Current time indicator */}
                  {isCurrentHour && (
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-indigo-500 z-10 pointer-events-none"
                      style={{ top: `${(new Date().getMinutes() / 60) * 100}%` }}
                    />
                  )}

                  {/* Events in this slot */}
                  {slotEvents.map(ev => {
                    const color = getColorObj(ev.color);
                    const evStartMin = ev.hour * 60 + ev.minute;
                    const slotStartMin = hour * 60;
                    const offsetFromTop = Math.max(0, evStartMin - slotStartMin);
                    const visibleDuration = Math.min(60 - offsetFromTop, ev.durationMinutes - (slotStartMin - evStartMin + offsetFromTop));
                    
                    return (
                      <div
                        key={ev.id}
                        data-event
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                        className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer truncate ${color.bg} ${color.border} ${color.text} hover:brightness-125 transition-all`}
                        title={`${formatTime(ev.hour, ev.minute)} – ${ev.title}`}
                      >
                        <span className="font-semibold">{formatTime(ev.hour, ev.minute)}</span>{' '}
                        <span>{ev.title}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   DAY VIEW
   ══════════════════════════════════════════════════════════════ */
const DayView: React.FC<{
  currentDate: Date;
  todayStr: string;
  events: CalendarEvent[];
  getEventsForSlot: (ds: string, h: number) => CalendarEvent[];
  onSlotClick: (ds: string, h: number, m?: number) => void;
  onEventClick: (ev: CalendarEvent) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}> = ({ currentDate, todayStr, events, getEventsForSlot, onSlotClick, onEventClick, scrollRef }) => {
  const ds = dateToStr(currentDate);
  const isToday = ds === todayStr;

  return (
    <div className="rounded-xl bg-slate-900/40 border border-slate-800 overflow-hidden">
      <div ref={scrollRef} className="overflow-y-auto max-h-[600px]">
        {HOURS.map(hour => {
          const slotEvents = getEventsForSlot(ds, hour);
          const isCurrentHour = isToday && new Date().getHours() === hour;

          return (
            <div
              key={hour}
              className={`grid grid-cols-[80px_1fr] border-b border-slate-800/40 ${isCurrentHour ? 'bg-indigo-950/20' : ''}`}
            >
              <div className="py-3 px-3 text-xs text-slate-500 font-mono border-r border-slate-800/60 flex items-start justify-end">
                {formatTime(hour, 0)}
              </div>
              <div
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('[data-event]')) return;
                  onSlotClick(ds, hour);
                }}
                className="min-h-[64px] p-1 cursor-pointer hover:bg-slate-800/30 transition-colors relative"
              >
                {/* Current time indicator */}
                {isCurrentHour && (
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-indigo-500 z-10 pointer-events-none"
                    style={{ top: `${(new Date().getMinutes() / 60) * 100}%` }}
                  />
                )}

                {slotEvents.map(ev => {
                  const color = getColorObj(ev.color);
                  return (
                    <div
                      key={ev.id}
                      data-event
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer mb-1 ${color.bg} ${color.border} ${color.text} hover:brightness-125 transition-all`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="font-semibold">{formatTime(ev.hour, ev.minute)} – {formatTime(
                          Math.floor((ev.hour * 60 + ev.minute + ev.durationMinutes) / 60),
                          (ev.hour * 60 + ev.minute + ev.durationMinutes) % 60
                        )}</span>
                      </div>
                      <div className="font-medium mt-0.5">{ev.title}</div>
                      {ev.description && (
                        <div className="text-[10px] opacity-70 mt-0.5 line-clamp-2">{ev.description}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   EVENT MODAL (Add / Edit)
   ══════════════════════════════════════════════════════════════ */
const EventModal: React.FC<{
  slot: { date: string; hour: number; minute: number } | null;
  event: CalendarEvent | null;
  onSave: (ev: Omit<CalendarEvent, 'id'> & { id?: string }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}> = ({ slot, event, onSave, onDelete, onClose }) => {
  const { t } = useI18n();
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [date, setDate] = useState(event?.date || slot?.date || dateToStr(new Date()));
  const [hour, setHour] = useState(event?.hour ?? slot?.hour ?? 9);
  const [minute, setMinute] = useState(event?.minute ?? slot?.minute ?? 0);
  const [duration, setDuration] = useState(event?.durationMinutes ?? 60);
  const [color, setColor] = useState(event?.color || 'indigo');
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'daily'>(event?.recurrence || 'none');

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: event?.id,
      date,
      hour,
      minute,
      title: title.trim(),
      description: description.trim(),
      color,
      durationMinutes: duration,
      recurrence,
    });
  };

  const endHour = Math.floor((hour * 60 + minute + duration) / 60);
  const endMinute = (hour * 60 + minute + duration) % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-400" />
            {event ? t('edit_event', 'Upravit událost') : t('new_event', 'Nová událost')}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">{t('event_name', 'Název události')}</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('event_title_placeholder', 'Např. Schůzka, Oběd, Deadline...')}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Date & Time row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">{t('date', 'Datum')}</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-2 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>

            {!event && (
              <div>
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">{t('repeat', 'Opakování')}</label>
                <select value={recurrence} onChange={e => setRecurrence(e.target.value as 'none' | 'weekly' | 'daily')} className="w-full px-2 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white">
                  <option value="none">{t('does_not_repeat', 'Neopakovat')}</option>
                  <option value="daily">{t('daily_occurrences', 'Denně (30 výskytů)')}</option>
                  <option value="weekly">{t('weekly_occurrences', 'Týdně (12 výskytů)')}</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">{t('from_time', 'Od')}</label>
              <div className="flex gap-1">
                <select
                  value={hour}
                  onChange={e => setHour(Number(e.target.value))}
                  className="flex-1 px-1 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                >
                  {HOURS.map(h => (
                    <option key={h} value={h} className="bg-slate-900">{String(h).padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  value={minute}
                  onChange={e => setMinute(Number(e.target.value))}
                  className="w-14 px-1 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
                >
                  {[0, 15, 30, 45].map(m => (
                    <option key={m} value={m} className="bg-slate-900">{String(m).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">{t('duration', 'Délka')}</label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-2 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none"
              >
                <option value={15} className="bg-slate-900">{t('duration_minutes', '{value} min', { value: 15 })}</option>
                <option value={30} className="bg-slate-900">{t('duration_minutes', '{value} min', { value: 30 })}</option>
                <option value={45} className="bg-slate-900">{t('duration_minutes', '{value} min', { value: 45 })}</option>
                <option value={60} className="bg-slate-900">{t('duration_hours', '{value} hod', { value: 1 })}</option>
                <option value={90} className="bg-slate-900">{t('duration_hours_decimal', '{value} hod', { value: 1.5 })}</option>
                <option value={120} className="bg-slate-900">{t('duration_hours', '{value} hod', { value: 2 })}</option>
                <option value={180} className="bg-slate-900">{t('duration_hours', '{value} hod', { value: 3 })}</option>
                <option value={240} className="bg-slate-900">{t('duration_hours', '{value} hod', { value: 4 })}</option>
              </select>
            </div>
          </div>

          {/* Time preview */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{formatTime(hour, minute)} – {formatTime(endHour, endMinute)}</span>
            <span className="text-slate-600">({duration} min)</span>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">{t('optional_note', 'Poznámka (volitelné)')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('event_details_placeholder', 'Detaily, místo, odkaz...')}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none resize-none transition-colors"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">{t('color', 'Barva')}</label>
            <div className="flex gap-2">
              {EVENT_COLORS.map(c => (
                <button
                  key={c.key}
                  onClick={() => setColor(c.key)}
                  className={`w-7 h-7 rounded-full ${c.dot} transition-all ${
                    color === c.key ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950/60">
          <div>
            {event && (
              <button
                onClick={() => onDelete(event.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-rose-400 hover:bg-rose-950/40 border border-rose-800/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('delete', 'Smazat')}</span>
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              {t('cancel', 'Zrušit')}
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{event ? t('save_changes', 'Uložit změny') : t('create', 'Vytvořit')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
