import React, { useState, useEffect, useMemo, useId } from 'react';
import { Clock, Play, Pause, Copy, Check, RefreshCw, Calendar, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';

type EpochUnit = 'auto' | 's' | 'ms' | 'us' | 'ns';

function detectUnit(num: number): 's' | 'ms' | 'us' | 'ns' {
  const abs = Math.abs(num);
  if (abs >= 1e17) return 'ns';
  if (abs >= 1e14) return 'us';
  if (abs >= 1e11) return 'ms';
  return 's';
}

function toMs(num: number, unit: EpochUnit): number {
  const resolved = unit === 'auto' ? detectUnit(num) : unit;
  if (resolved === 's') return num * 1000;
  if (resolved === 'ms') return num;
  if (resolved === 'us') return num / 1000;
  return num / 1_000_000;
}

function getIsoWeek(date: Date): number {
  const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getDayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86400000);
}

export const TimestampConverterTool: React.FC = () => {
  const { t, language } = useI18n();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isLive, setIsLive] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Epoch -> Date
  const [epochInput, setEpochInput] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [epochUnit, setEpochUnit] = useState<EpochUnit>('auto');

  // Date -> Epoch
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().slice(0, 19));
  const [dateMode, setDateMode] = useState<'local' | 'utc'>('utc');
  const [addDays, setAddDays] = useState(0);
  const [addHours, setAddHours] = useState(0);
  const [addMinutes, setAddMinutes] = useState(0);

  // Batch conversion
  const [batchInput, setBatchInput] = useState('0\n1700000000\n1762983960000');

  const epochId = useId();
  const dateId = useId();
  const batchId = useId();

  useEffect(() => {
    if (!isLive) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(timer);
  }, [isLive]);

  const copyText = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 1800);
  };

  const epochResult = useMemo(() => {
    const trimmed = epochInput.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    if (!Number.isFinite(num)) return { valid: false as const };
    const resolvedUnit = epochUnit === 'auto' ? detectUnit(num) : epochUnit;
    const ms = toMs(num, epochUnit);
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return { valid: false as const };

    const diffSec = Math.round((date.getTime() - nowMs) / 1000);
    const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
    let relative: string;
    const absSec = Math.abs(diffSec);
    if (absSec < 60) relative = rtf.format(diffSec, 'second');
    else if (absSec < 3600) relative = rtf.format(Math.round(diffSec / 60), 'minute');
    else if (absSec < 86400) relative = rtf.format(Math.round(diffSec / 3600), 'hour');
    else if (absSec < 2592000) relative = rtf.format(Math.round(diffSec / 86400), 'day');
    else if (absSec < 31536000) relative = rtf.format(Math.round(diffSec / 2592000), 'month');
    else relative = rtf.format(Math.round(diffSec / 31536000), 'year');

    const yr = date.getUTCFullYear();
    const isLeap = (yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0;

    return {
      valid: true as const,
      resolvedUnit,
      iso: date.toISOString(),
      utc: date.toUTCString(),
      local: date.toLocaleString(language),
      relative,
      dayOfYear: getDayOfYear(date),
      isoWeek: getIsoWeek(date),
      isLeap,
      seconds: Math.floor(ms / 1000),
      milliseconds: Math.round(ms),
    };
  }, [epochInput, epochUnit, nowMs, language]);

  const dateToEpochResult = useMemo(() => {
    const raw = dateInput.trim();
    if (!raw) return null;
    const parsed = dateMode === 'utc' && !raw.endsWith('Z') ? new Date(`${raw}Z`) : new Date(raw);
    if (Number.isNaN(parsed.getTime())) return { valid: false as const };

    const offsetMs = ((addDays * 24 + addHours) * 60 + addMinutes) * 60 * 1000;
    const shifted = new Date(parsed.getTime() + offsetMs);
    const ms = shifted.getTime();
    return {
      valid: true as const,
      seconds: Math.floor(ms / 1000),
      milliseconds: ms,
      microseconds: ms * 1000,
      iso: shifted.toISOString(),
      local: shifted.toLocaleString(language),
    };
  }, [dateInput, dateMode, addDays, addHours, addMinutes, language]);

  const batchResults = useMemo(() => {
    return batchInput
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const num = Number(line);
        if (!Number.isFinite(num)) return { raw: line, iso: t('ts_invalid', 'Invalid timestamp') };
        const d = new Date(toMs(num, 'auto'));
        if (Number.isNaN(d.getTime())) return { raw: line, iso: t('ts_invalid', 'Invalid timestamp') };
        return { raw: line, iso: d.toISOString() };
      });
  }, [batchInput, t]);

  const liveSec = Math.floor(nowMs / 1000);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            {t('tool_timestamp_converter_title', 'Unix Timestamp & Epoch Converter')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_timestamp_converter_desc', 'Convert Unix epochs (s, ms, µs, ns) to ISO 8601, UTC and local dates with date arithmetic and batch mode.')}
          </p>
        </div>

        <button
          onClick={() => setIsLive(v => !v)}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
        >
          {isLive ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          {isLive ? t('pause', 'Pause') : t('ts_resume', 'Resume')}
        </button>
      </div>

      {/* Live Current Epoch Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">{t('ts_current_seconds', 'Current Epoch (Seconds)')}</span>
            <span className="text-xl font-bold font-mono text-indigo-300 tabular-nums">{liveSec}</span>
          </div>
          <button
            onClick={() => copyText('live-s', String(liveSec))}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            title={t('copy', 'Copy')}
          >
            {copiedKey === 'live-s' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">{t('ts_current_ms', 'Current Epoch (Milliseconds)')}</span>
            <span className="text-xl font-bold font-mono text-emerald-300 tabular-nums">{nowMs}</span>
          </div>
          <button
            onClick={() => copyText('live-ms', String(nowMs))}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            title={t('copy', 'Copy')}
          >
            {copiedKey === 'live-ms' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">ISO 8601 (UTC)</span>
            <span className="text-sm font-mono text-slate-200 truncate block">{new Date(nowMs).toISOString()}</span>
          </div>
          <button
            onClick={() => copyText('live-iso', new Date(nowMs).toISOString())}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white shrink-0"
            title={t('copy', 'Copy')}
          >
            {copiedKey === 'live-iso' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Section 1: Epoch -> Human Date */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor={epochId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('ts_epoch_to_date', 'Timestamp to Human Date')}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setEpochInput(String(Math.floor(Date.now() / 1000)))}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {t('ts_now', 'Now')}
            </button>
            <select
              value={epochUnit}
              onChange={e => setEpochUnit(e.target.value as EpochUnit)}
              className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
            >
              <option value="auto">{t('ts_unit_auto', 'Auto-detect')}</option>
              <option value="s">{t('ts_unit_s', 'Seconds (s)')}</option>
              <option value="ms">{t('ts_unit_ms', 'Milliseconds (ms)')}</option>
              <option value="us">{t('ts_unit_us', 'Microseconds (µs)')}</option>
              <option value="ns">{t('ts_unit_ns', 'Nanoseconds (ns)')}</option>
            </select>
          </div>
        </div>

        <input
          id={epochId}
          type="text"
          value={epochInput}
          onChange={e => setEpochInput(e.target.value)}
          placeholder="1700000000"
          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm font-mono text-indigo-300 focus:outline-none"
        />

        {epochResult && (
          epochResult.valid ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { k: 'iso', label: 'ISO 8601 (UTC)', v: epochResult.iso },
                { k: 'utc', label: 'RFC 2822 / UTC', v: epochResult.utc },
                { k: 'local', label: t('ts_local_time', 'Local Time'), v: epochResult.local },
                { k: 'rel', label: t('ts_relative', 'Relative'), v: epochResult.relative },
                { k: 'unit', label: t('ts_detected_unit', 'Interpreted Unit'), v: `${epochResult.resolvedUnit} · ${t('ts_week', 'Week')} ${epochResult.isoWeek} · ${t('ts_day', 'Day')} ${epochResult.dayOfYear}` },
                { k: 'leap', label: t('ts_leap_year', 'Leap Year (UTC)'), v: epochResult.isLeap ? t('yes', 'Yes') : t('no', 'No') },
              ].map(row => (
                <div key={row.k} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block">{row.label}</span>
                    <span className="text-xs font-mono text-slate-200 break-all">{row.v}</span>
                  </div>
                  <button
                    onClick={() => copyText(row.k, row.v)}
                    className="p-1 text-slate-500 hover:text-white shrink-0"
                    title={t('copy', 'Copy')}
                  >
                    {copiedKey === row.k ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t('ts_invalid', 'Invalid timestamp')}</span>
            </div>
          )
        )}
      </div>

      {/* Section 2: Date & Arithmetic -> Epoch */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor={dateId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            {t('ts_date_to_epoch', 'Human Date & Offset to Timestamp')}
          </label>
          <div className="flex items-center gap-1.5">
            {(['utc', 'local'] as const).map(m => (
              <button
                key={m}
                onClick={() => setDateMode(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono uppercase ${
                  dateMode === m ? 'bg-indigo-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400'
                }`}
              >
                {m === 'utc' ? 'UTC' : t('ts_local_short', 'Local')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('ts_datetime_input', 'Date & Time (YYYY-MM-DDTHH:mm:ss)')}</span>
            <input
              id={dateId}
              type="text"
              value={dateInput}
              onChange={e => setDateInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            />
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('ts_offset_days', 'Offset Days (±)')}</span>
            <input
              type="number"
              value={addDays}
              onChange={e => setAddDays(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            />
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('ts_offset_hours', 'Offset Hours (±)')}</span>
            <input
              type="number"
              value={addHours}
              onChange={e => setAddHours(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            />
          </div>
          <div>
            <span className="text-xs text-slate-400 block mb-1">{t('ts_offset_minutes', 'Offset Minutes (±)')}</span>
            <input
              type="number"
              value={addMinutes}
              onChange={e => setAddMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200"
            />
          </div>
        </div>

        {dateToEpochResult && (
          dateToEpochResult.valid ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                { k: 'd-s', label: t('ts_seconds', 'Seconds'), v: String(dateToEpochResult.seconds) },
                { k: 'd-ms', label: t('ts_milliseconds', 'Milliseconds'), v: String(dateToEpochResult.milliseconds) },
                { k: 'd-iso', label: 'ISO 8601', v: dateToEpochResult.iso },
                { k: 'd-loc', label: t('ts_local_time', 'Local Time'), v: dateToEpochResult.local },
              ].map(r => (
                <div key={r.k} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block">{r.label}</span>
                    <span className="text-xs font-mono text-indigo-300 break-all">{r.v}</span>
                  </div>
                  <button
                    onClick={() => copyText(r.k, r.v)}
                    className="p-1 text-slate-500 hover:text-white shrink-0"
                    title={t('copy', 'Copy')}
                  >
                    {copiedKey === r.k ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-rose-400">{t('ts_invalid_date', 'Invalid date format. Try YYYY-MM-DDTHH:mm:ss.')}</p>
          )
        )}
      </div>

      {/* Section 3: Batch Converter */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <label htmlFor={batchId} className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          {t('ts_batch_title', 'Batch Timestamp Converter (one per line)')}
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <textarea
            id={batchId}
            value={batchInput}
            onChange={e => setBatchInput(e.target.value)}
            rows={4}
            spellCheck={false}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 max-h-36 overflow-y-auto">
            {batchResults.map((row, idx) => (
              <div key={`${row.raw}-${idx}`} className="flex items-center justify-between gap-2 text-xs font-mono">
                <span className="text-slate-400 truncate">{row.raw}</span>
                <span className="text-emerald-300 shrink-0">{row.iso}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
