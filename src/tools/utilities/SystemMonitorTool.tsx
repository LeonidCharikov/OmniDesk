import React, { useState, useEffect, useCallback, useId, useMemo } from 'react';
import {
  Activity,
  Check,
  Clock,
  Copy,
  Cpu,
  Gauge,
  HardDrive,
  Layers,
  Monitor,
  Pause,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
  Thermometer,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { isTauri } from '../../services/fileSystemService';
import { toastService } from '../../services/toastService';
import {
  DesktopProcessInfo,
  HardwareSpecs,
  NativeSystemTelemetry,
  calculateUsagePercent,
  filterAndSortProcesses,
  formatCpuFrequency,
  formatHardwareSpecsSummary,
  formatUptimeDuration,
  formatVram,
  getDesktopHardwareSpecs,
  getDesktopSystemTelemetry,
  listDesktopProcesses,
} from '../../services/desktopToolsService';
import { DesktopOnlyGuard } from '../desktop/DesktopOnlyGuard';

const HISTORY_LENGTH = 30;

interface SparklineProps {
  data: number[];
  strokeClass: string;
  fillClass: string;
}

const TelemetrySparkline: React.FC<SparklineProps> = ({ data, strokeClass, fillClass }) => {
  const gradId = useId();
  const width = 220;
  const height = 44;

  const points = useMemo(() => {
    const series = data.length >= 2 ? data : [0, ...data, 0];
    const step = width / Math.max(1, series.length - 1);
    return series.map((val, idx) => {
      const clamped = Math.max(0, Math.min(100, val));
      const x = idx * step;
      const y = height - (clamped / 100) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
  }, [data]);

  const polylinePoints = points.join(' ');
  const areaPoints = `0,${height} ${polylinePoints} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full h-11 overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} className={fillClass} />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeClass}
      />
    </svg>
  );
};

function getLoadBarColor(percent: number): string {
  if (percent >= 85) return 'bg-rose-500';
  if (percent >= 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getTempColor(tempC: number): string {
  if (tempC >= 85) return 'text-rose-400';
  if (tempC >= 70) return 'text-amber-400';
  return 'text-emerald-400';
}

function getVendorBadgeClass(vendor: string): string {
  const v = vendor.toUpperCase();
  if (v.includes('NVIDIA')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (v.includes('AMD')) return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (v.includes('INTEL')) return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  if (v.includes('APPLE')) return 'bg-slate-500/20 text-slate-200 border-slate-500/40';
  return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
}

export const SystemMonitorTool: React.FC = () => {
  const { t } = useI18n();
  const runningInTauri = isTauri();

  const [specs, setSpecs] = useState<HardwareSpecs | null>(null);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<NativeSystemTelemetry | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [ramHistory, setRamHistory] = useState<number[]>([]);
  const [processes, setProcesses] = useState<DesktopProcessInfo[]>([]);
  const [procSort, setProcSort] = useState<'cpu_usage' | 'memory_mb'>('cpu_usage');
  const [isPaused, setIsPaused] = useState(false);
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(1500);
  const [error, setError] = useState<string | null>(null);
  const [copiedSpecs, setCopiedSpecs] = useState(false);

  const loadHardwareSpecs = useCallback(async () => {
    if (!runningInTauri) return;
    setSpecsLoading(true);
    try {
      const data = await getDesktopHardwareSpecs();
      setSpecs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSpecsLoading(false);
    }
  }, [runningInTauri]);

  const pollTelemetry = useCallback(async () => {
    if (!runningInTauri) return;
    const [telemetryRes, processesRes] = await Promise.allSettled([
      getDesktopSystemTelemetry(),
      listDesktopProcesses(40),
    ]);

    if (telemetryRes.status === 'fulfilled') {
      const nextTelemetry = telemetryRes.value;
      setTelemetry(nextTelemetry);
      const ramPct = calculateUsagePercent(nextTelemetry.ram_used_gb, nextTelemetry.ram_total_gb);
      setCpuHistory(prev => [...prev.slice(-(HISTORY_LENGTH - 1)), nextTelemetry.cpu_usage]);
      setRamHistory(prev => [...prev.slice(-(HISTORY_LENGTH - 1)), ramPct]);
    }

    if (processesRes.status === 'fulfilled') {
      setProcesses(processesRes.value);
    }

    if (telemetryRes.status === 'rejected') {
      const err = telemetryRes.reason;
      setError(err instanceof Error ? err.message : String(err));
    } else if (processesRes.status === 'rejected') {
      const err = processesRes.reason;
      setError(err instanceof Error ? err.message : String(err));
    } else {
      setError(null);
    }
  }, [runningInTauri]);

  useEffect(() => {
    if (!runningInTauri) return;
    void loadHardwareSpecs();
  }, [runningInTauri, loadHardwareSpecs]);

  useEffect(() => {
    if (!runningInTauri || isPaused) return;
    void pollTelemetry();
    const timer = window.setInterval(() => {
      void pollTelemetry();
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [runningInTauri, isPaused, pollIntervalMs, pollTelemetry]);

  const topProcesses = useMemo(
    () => filterAndSortProcesses(processes, '', procSort, 'desc').slice(0, 10),
    [processes, procSort]
  );

  const handleCopySpecs = () => {
    if (!specs) return;
    const summary = formatHardwareSpecsSummary(specs, telemetry);
    void navigator.clipboard.writeText(summary);
    setCopiedSpecs(true);
    toastService.show({
      type: 'success',
      title: t('sm_copied_specs_toast', 'PC hardware specifications copied to clipboard'),
    });
    window.setTimeout(() => setCopiedSpecs(false), 1800);
  };

  if (!runningInTauri) {
    return (
      <DesktopOnlyGuard
        title={t('tool_system_monitor_title', 'System Hardware Monitor & PC Specs')}
        description={t(
          'tool_system_monitor_desc',
          'Live native CPU, RAM, swap, disk & thermal telemetry plus full PC hardware specs (CPU, GPU/VRAM, RAM modules, motherboard).'
        )}
      />
    );
  }

  const cpuPct = telemetry ? Math.max(0, Math.min(100, telemetry.cpu_usage)) : 0;
  const ramPct = telemetry
    ? calculateUsagePercent(telemetry.ram_used_gb, telemetry.ram_total_gb)
    : 0;
  const swapPct = telemetry
    ? calculateUsagePercent(telemetry.swap_used_gb, telemetry.swap_total_gb)
    : 0;
  const diskPct = telemetry
    ? calculateUsagePercent(telemetry.disk_used_gb, telemetry.disk_total_gb)
    : 0;

  const activeDisks = telemetry?.disks.length ? telemetry.disks : (specs?.disks ?? []);
  const primaryDisk =
    activeDisks.find(d => d.mount_point === '/' || d.mount_point.toUpperCase() === 'C:\\') ??
    activeDisks[0] ??
    null;

  const hasLoadAvg =
    telemetry !== null &&
    (telemetry.load_avg_1m > 0 || telemetry.load_avg_5m > 0 || telemetry.load_avg_15m > 0);

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_system_monitor_title', 'System Hardware Monitor & PC Specs')}
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              {t('desktop_only_badge', 'Desktop Only')}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {specs
              ? `${specs.hostname} • ${specs.os_name} (${specs.cpu_arch})`
              : t(
                  'sm_subtitle',
                  'Real-time native OS telemetry and complete PC hardware inventory (CPU, GPU, RAM, storage & thermals).'
                )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={t('sm_poll_interval', 'Telemetry update interval')}
            value={pollIntervalMs}
            onChange={e => setPollIntervalMs(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value={1000}>{t('sm_rate_1s', '1s live')}</option>
            <option value={1500}>{t('sm_rate_1500ms', '1.5s live')}</option>
            <option value={3000}>{t('sm_rate_3s', '3s eco')}</option>
            <option value={5000}>{t('sm_rate_5s', '5s calm')}</option>
          </select>

          <button
            type="button"
            onClick={() => setIsPaused(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
              isPaused
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? t('sm_resume', 'Resume') : t('sm_pause', 'Pause')}</span>
          </button>

          <button
            type="button"
            onClick={() => void loadHardwareSpecs()}
            disabled={specsLoading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-60 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${specsLoading ? 'animate-spin' : ''}`} />
            <span>{t('sm_refresh_specs', 'Rescan Specs')}</span>
          </button>

          <button
            type="button"
            onClick={handleCopySpecs}
            disabled={!specs}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copiedSpecs ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>
              {copiedSpecs
                ? t('sm_copied_btn', 'Copied')
                : t('sm_copy_specs', 'Copy PC Specs')}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PC Hardware Specifications Showcase */}
      <section className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              {t('sm_pc_specs_title', 'PC Hardware Specifications')}
            </h3>
          </div>
          {telemetry && (
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                {t('sm_uptime', 'Uptime')}:{' '}
                <strong className="text-slate-200">
                  {formatUptimeDuration(telemetry.uptime_seconds)}
                </strong>
              </span>
              {hasLoadAvg && (
                <span>
                  {t('sm_load_avg', 'Load')}:{' '}
                  <strong className="text-slate-200">
                    {telemetry.load_avg_1m.toFixed(2)} / {telemetry.load_avg_5m.toFixed(2)} /{' '}
                    {telemetry.load_avg_15m.toFixed(2)}
                  </strong>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* CPU Spec Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                {t('sm_spec_cpu', 'Processor (CPU)')}
              </span>
              {specs && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {specs.cpu_arch}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-white leading-snug">
              {specs ? specs.cpu_brand : t('sm_detecting', 'Detecting hardware...')}
            </p>
            {specs && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono">
                <span>
                  {t('sm_cores_label', 'Cores')}:{' '}
                  <strong className="text-slate-200">
                    {specs.physical_cores}P / {specs.logical_cores}T
                  </strong>
                </span>
                <span>
                  {t('sm_clock_label', 'Clock')}:{' '}
                  <strong className="text-slate-200">
                    {formatCpuFrequency(telemetry?.cpu_freq_mhz || specs.base_freq_mhz)}
                  </strong>
                </span>
                <span>
                  {t('sm_vendor_label', 'Vendor')}:{' '}
                  <strong className="text-slate-200">{specs.cpu_vendor}</strong>
                </span>
              </div>
            )}
          </div>

          {/* GPU Spec Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5" />
                {t('sm_spec_gpu', 'Graphics (GPU)')}
              </span>
              {specs?.display_resolution && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {specs.display_resolution}
                </span>
              )}
            </div>
            {!specs ? (
              <p className="text-sm text-slate-400">{t('sm_detecting', 'Detecting hardware...')}</p>
            ) : specs.gpus.length > 0 ? (
              <div className="space-y-2">
                {specs.gpus.map((gpu, idx) => (
                  <div
                    key={`${gpu.name}-${idx}`}
                    className={idx > 0 ? 'pt-2 border-t border-slate-800/80' : ''}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white leading-snug">{gpu.name}</p>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${getVendorBadgeClass(
                          gpu.vendor
                        )}`}
                      >
                        {gpu.vendor}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-400 font-mono mt-0.5">
                      <span>
                        {t('sm_vram_label', 'VRAM')}:{' '}
                        <strong className="text-slate-200">{formatVram(gpu.vram_mb)}</strong>
                      </span>
                      {gpu.driver_version && (
                        <span>
                          {t('sm_driver_label', 'Driver')}:{' '}
                          <strong className="text-slate-200">{gpu.driver_version}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                {t('sm_gpu_unavailable', 'Integrated / Not reported by OS')}
              </p>
            )}
          </div>

          {/* Memory & Board Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {t('sm_spec_ram_board', 'Memory & Motherboard')}
            </span>
            <p className="text-sm font-semibold text-white">
              {specs
                ? `${specs.ram_total_gb.toFixed(1)} GB ${t('sm_ram_installed', 'Installed RAM')}${
                    specs.ram_summary ? ` (${specs.ram_summary})` : ''
                  }`
                : t('sm_detecting', 'Detecting hardware...')}
            </p>
            {specs && (
              <div className="space-y-0.5 text-[11px] text-slate-400 font-mono">
                {specs.motherboard && (
                  <p className="truncate" title={specs.motherboard}>
                    {t('sm_motherboard', 'Motherboard')}:{' '}
                    <strong className="text-slate-200">{specs.motherboard}</strong>
                  </p>
                )}
                {specs.system_model && (
                  <p className="truncate" title={specs.system_model}>
                    {t('sm_system_model', 'System Model')}:{' '}
                    <strong className="text-slate-200">{specs.system_model}</strong>
                  </p>
                )}
                <p>
                  {t('sm_swap_total', 'Swap / Pagefile')}:{' '}
                  <strong className="text-slate-200">{specs.swap_total_gb.toFixed(1)} GB</strong>
                </p>
              </div>
            )}
          </div>

          {/* OS & Kernel Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              {t('sm_spec_os', 'Operating System')}
            </span>
            <p className="text-sm font-semibold text-white">
              {specs ? specs.os_name : t('sm_detecting', 'Detecting hardware...')}
            </p>
            {specs && (
              <div className="space-y-0.5 text-[11px] text-slate-400 font-mono">
                <p>
                  {t('sm_os_version', 'OS Build')}:{' '}
                  <strong className="text-slate-200">{specs.os_version}</strong>
                </p>
                <p>
                  {t('sm_kernel', 'Kernel')}:{' '}
                  <strong className="text-slate-200">{specs.kernel_version}</strong>
                </p>
                <p>
                  {t('sm_hostname', 'Hostname')}:{' '}
                  <strong className="text-slate-200">{specs.hostname}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Live Telemetry Row: CPU / RAM / Primary Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live CPU Card */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                {t('sm_live_cpu', 'CPU Utilization')}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-mono font-bold text-white">
                  {cpuPct.toFixed(1)}%
                </span>
                <span className="text-xs font-mono text-cyan-300">
                  {formatCpuFrequency(telemetry?.cpu_freq_mhz ?? 0)}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
              {telemetry ? `${telemetry.cores.length} ${t('sm_threads_short', 'threads')}` : '—'}
            </span>
          </div>

          <TelemetrySparkline
            data={cpuHistory}
            strokeClass="text-cyan-400"
            fillClass="text-cyan-400"
          />

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getLoadBarColor(cpuPct)}`}
              style={{ width: `${cpuPct}%` }}
            />
          </div>
        </div>

        {/* Live RAM Card (Fixed: displays real ram_used_gb & ram_total_gb!) */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                {t('sm_live_ram', 'Memory (RAM)')}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-mono font-bold text-white">
                  {telemetry ? telemetry.ram_used_gb.toFixed(2) : '0.00'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  / {telemetry ? telemetry.ram_total_gb.toFixed(1) : '0.0'} GB
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300">
              {ramPct.toFixed(1)}%
            </span>
          </div>

          <TelemetrySparkline
            data={ramHistory}
            strokeClass="text-purple-400"
            fillClass="text-purple-400"
          />

          <div className="space-y-1.5">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${ramPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>
                {t('sm_ram_available', 'Available')}:{' '}
                <strong className="text-slate-200">
                  {telemetry ? telemetry.ram_available_gb.toFixed(2) : '0.00'} GB
                </strong>
              </span>
              {telemetry && telemetry.swap_total_gb > 0 && (
                <span>
                  {t('sm_swap_short', 'Swap')}:{' '}
                  <strong className="text-slate-200">
                    {telemetry.swap_used_gb.toFixed(1)}/{telemetry.swap_total_gb.toFixed(1)} GB (
                    {swapPct.toFixed(0)}%)
                  </strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Storage Card */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                {t('sm_primary_storage', 'Primary Storage')}
                {primaryDisk && (
                  <span className="font-mono text-slate-500">({primaryDisk.mount_point})</span>
                )}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-mono font-bold text-white">
                  {telemetry ? telemetry.disk_used_gb.toFixed(1) : '0.0'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  / {telemetry ? telemetry.disk_total_gb.toFixed(1) : '0.0'} GB
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
              {diskPct.toFixed(1)}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 grid grid-cols-3 gap-2 text-center font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block">{t('sm_disk_type', 'Type')}</span>
              <span className="text-xs text-slate-200 font-semibold">
                {primaryDisk?.kind ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{t('sm_disk_fs', 'FS')}</span>
              <span className="text-xs text-slate-200 font-semibold">
                {primaryDisk?.file_system || '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{t('sm_disk_free', 'Free')}</span>
              <span className="text-xs text-emerald-300 font-semibold">
                {primaryDisk ? `${primaryDisk.available_gb.toFixed(1)} GB` : '—'}
              </span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getLoadBarColor(diskPct)}`}
              style={{ width: `${diskPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Per-Core CPU Utilization Grid */}
      {telemetry && telemetry.cores.length > 0 && (
        <section className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              {t('sm_per_core_title', 'Per-Thread CPU Load')}
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {telemetry.cores.length} {t('sm_logical_processors', 'logical processors')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {telemetry.cores.map((usage, idx) => {
              const clamped = Math.max(0, Math.min(100, usage));
              return (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">C{idx}</span>
                    <span className="text-slate-200 font-semibold">{clamped.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getLoadBarColor(clamped)}`}
                      style={{ width: `${clamped}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Storage Drives & Thermal Sensors */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Mounted Storage Drives */}
        <section className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" />
              {t('sm_storage_drives', 'Mounted Storage Drives')}
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {activeDisks.length} {t('sm_drives_count', 'volumes')}
            </span>
          </div>

          {activeDisks.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              {t('sm_no_drives', 'No mounted storage volumes detected.')}
            </p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {activeDisks.map(disk => {
                const pct = calculateUsagePercent(disk.used_gb, disk.total_gb);
                return (
                  <div
                    key={disk.mount_point}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono font-semibold text-white truncate">
                          {disk.mount_point}
                        </span>
                        {disk.name !== disk.mount_point && (
                          <span className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {disk.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {disk.kind}
                        </span>
                        {disk.file_system && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {disk.file_system}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getLoadBarColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>
                        {disk.used_gb.toFixed(1)} / {disk.total_gb.toFixed(1)} GB ({pct.toFixed(1)}%)
                      </span>
                      <span className="text-emerald-300">
                        {disk.available_gb.toFixed(1)} GB {t('sm_free_suffix', 'free')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Thermal Sensors */}
        <section className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-rose-400" />
              {t('sm_thermals_title', 'Hardware Thermal Sensors')}
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {telemetry?.temperatures.length ?? 0} {t('sm_sensors_count', 'sensors')}
            </span>
          </div>

          {!telemetry || telemetry.temperatures.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
              {t(
                'sm_thermals_unavailable',
                'No hardware temperature sensors were exposed by the OS kernel. On Windows, some motherboard thermal sensors require elevated privileges or OEM drivers.'
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {telemetry.temperatures.map((sensor, idx) => {
                const tempBar = Math.max(0, Math.min(100, sensor.temp_c));
                return (
                  <div
                    key={`${sensor.label}-${idx}`}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[11px] text-slate-300 truncate"
                        title={sensor.label}
                      >
                        {sensor.label}
                      </span>
                      <span className={`text-xs font-mono font-bold ${getTempColor(sensor.temp_c)}`}>
                        {sensor.temp_c.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          sensor.temp_c >= 85
                            ? 'bg-rose-500'
                            : sensor.temp_c >= 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${tempBar}%` }}
                      />
                    </div>
                    {(sensor.max_c !== null || sensor.critical_c !== null) && (
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        {sensor.max_c !== null && <span>Max {sensor.max_c.toFixed(0)}°C</span>}
                        {sensor.critical_c !== null && (
                          <span>Crit {sensor.critical_c.toFixed(0)}°C</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Top Active OS Processes */}
      <section className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            {t('sm_top_processes', 'Top Active OS Processes')}
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setProcSort('cpu_usage')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                procSort === 'cpu_usage'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('sm_sort_cpu', 'Sort by CPU')}
            </button>
            <button
              type="button"
              onClick={() => setProcSort('memory_mb')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                procSort === 'memory_mb'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('sm_sort_ram', 'Sort by RAM')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-500">
                <th className="py-2 pr-3">{t('sm_col_pid', 'PID')}</th>
                <th className="py-2 pr-3">{t('sm_col_process', 'Process')}</th>
                <th className="py-2 pr-3 text-right">{t('sm_col_cpu', 'CPU %')}</th>
                <th className="py-2 pr-3 text-right">{t('sm_col_ram', 'RAM')}</th>
                <th className="py-2 text-right">{t('sm_col_status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {topProcesses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    {t('sm_loading_processes', 'Sampling native OS processes...')}
                  </td>
                </tr>
              ) : (
                topProcesses.map(proc => (
                  <tr key={proc.pid} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 pr-3 font-mono text-slate-400">{proc.pid}</td>
                    <td className="py-2 pr-3 font-medium text-slate-200 max-w-[260px] truncate" title={proc.cmd || proc.name}>
                      {proc.name}
                    </td>
                    <td className="py-2 pr-3 font-mono text-right text-cyan-300">
                      {proc.cpu_usage.toFixed(1)}%
                    </td>
                    <td className="py-2 pr-3 font-mono text-right text-purple-300">
                      {proc.memory_mb >= 1024
                        ? `${(proc.memory_mb / 1024).toFixed(2)} GB`
                        : `${proc.memory_mb.toFixed(1)} MB`}
                    </td>
                    <td className="py-2 font-mono text-right text-slate-400">{proc.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
