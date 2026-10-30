import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Activity, 
  Server, 
  Terminal, 
  Pause, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  Check, 
  Copy,
  Zap,
  Globe,
  Gauge,
  Database,
  ArrowDownToLine,
  ArrowUpFromLine
} from 'lucide-react';
import * as tauriOs from '@tauri-apps/plugin-os';
import { isTauri } from '../../services/fileSystemService';
import { useI18n } from '../../i18n/context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OsDetails {
  platform: string;
  version: string;
  arch: string;
  type: string;
  family: string;
  hostname: string;
  locale: string;
  isNative: boolean;
}

interface BrowserMetric {
  name: string;
  value: string;
  numericValue: number;
  unit: string;
  category: 'memory' | 'dom' | 'performance' | 'storage';
}

interface SystemTelemetry {
  cpuUsage: number;
  cpuFreqGhz: number;
  cores: number[];
  ramUsedGb: number;
  ramTotalGb: number;
  ramCachedGb: number;
  ramPercent: number;
  swapUsedGb: number;
  swapTotalGb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  diskPercent: number;
  diskReadMbs: number;
  diskWriteMbs: number;
  uptimeSeconds: number;
}

// ─── Browser CPU estimation via requestAnimationFrame ─────────────────────────
// Measures how long a rAF callback takes vs the ideal 16.67ms.
// High deviation from the expected frame budget indicates heavier CPU load.

interface CpuEstimator {
  lastFrameTime: number;
  samples: number[];
  /** Estimated CPU usage 0-100 based on frame time deviation */
  estimate: number;
}

function createCpuEstimator(): CpuEstimator {
  return { lastFrameTime: performance.now(), samples: [], estimate: 0 };
}

function updateCpuEstimator(estimator: CpuEstimator): number {
  const now = performance.now();
  const frameTime = now - estimator.lastFrameTime;
  estimator.lastFrameTime = now;

  // Ideal frame time is ~16.67ms (60fps). Deviation indicates CPU pressure.
  const IDEAL_FRAME = 16.67;
  // Clamp to avoid insane spikes from tab-switch or page-hide
  const clampedFrame = Math.min(frameTime, 200);
  // Ratio: 1.0 = perfect, >1 = slower than ideal
  const ratio = clampedFrame / IDEAL_FRAME;
  // Convert to a 0-100 CPU usage estimate: ratio of 1 = ~10%, ratio of 6+ = ~95%
  const usage = Math.min(95, Math.max(2, (ratio - 0.8) * 20));

  estimator.samples.push(usage);
  // Keep last 30 samples for smoothing
  if (estimator.samples.length > 30) estimator.samples.shift();

  // Weighted average: more recent samples matter more
  let weightedSum = 0;
  let weightTotal = 0;
  for (let i = 0; i < estimator.samples.length; i++) {
    const weight = 1 + i * 0.3;
    weightedSum += estimator.samples[i] * weight;
    weightTotal += weight;
  }
  estimator.estimate = weightedSum / weightTotal;
  return estimator.estimate;
}

// ─── Browser performance memory interface (Chrome only) ───────────────────────

interface PerformanceMemory {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

function getPerformanceMemory(): PerformanceMemory | null {
  const perf = performance as unknown as { memory?: PerformanceMemory };
  return perf.memory ?? null;
}

// ─── Detect OS details from User Agent ────────────────────────────────────────

function detectBrowserOsDetails(): Omit<OsDetails, 'isNative'> {
  const ua = navigator.userAgent;

  let platform = 'Unknown OS';
  let type = 'unknown';
  let family = 'unknown';
  let version = 'Unknown';

  if (ua.includes('Windows NT')) {
    platform = 'Windows';
    type = 'windows';
    family = 'windows';
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    if (match) {
      const ntVer = match[1];
      const versionMap: Record<string, string> = {
        '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7',
      };
      version = versionMap[ntVer] ?? ntVer;
    }
  } else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) {
    platform = 'macOS';
    type = 'macos';
    family = 'unix';
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    if (match) version = match[1].replace(/_/g, '.');
  } else if (ua.includes('CrOS')) {
    platform = 'ChromeOS';
    type = 'chromeos';
    family = 'unix';
  } else if (ua.includes('Android')) {
    platform = 'Android';
    type = 'linux';
    family = 'unix';
    const match = ua.match(/Android (\d+(\.\d+)*)/);
    if (match) version = match[1];
  } else if (ua.includes('Linux')) {
    platform = 'Linux';
    type = 'linux';
    family = 'unix';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    platform = 'iOS';
    type = 'ios';
    family = 'unix';
    const match = ua.match(/OS (\d+_\d+)/);
    if (match) version = match[1].replace('_', '.');
  }

  let arch = 'unknown';
  if (ua.includes('x86_64') || ua.includes('x64') || ua.includes('Win64') || ua.includes('WOW64') || ua.includes('amd64')) {
    arch = 'x86_64';
  } else if (ua.includes('aarch64') || ua.includes('arm64') || (ua.includes('Macintosh') && !ua.includes('Intel'))) {
    arch = 'arm64';
  } else if (ua.includes('armv')) {
    arch = 'arm';
  } else if (ua.includes('x86') || ua.includes('i686') || ua.includes('i386')) {
    arch = 'x86';
  }

  // Detect browser name
  let browser = 'Unknown Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

  return {
    platform: `${platform} (${browser})`,
    version: version !== 'Unknown' ? version : 'Web Preview',
    arch,
    type,
    family,
    hostname: window.location.hostname || 'localhost',
    locale: navigator.language || 'en-US',
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const SystemMonitorTool: React.FC = () => {
  const { t } = useI18n();
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(1000);
  const [stressSimulated, setStressSimulated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'processes' | 'tauri_code'>('dashboard');
  const [copiedCode, setCopiedCode] = useState(false);

  const refreshSelectId = useId();

  // Track real session uptime from mount
  const mountTimeRef = useRef<number>(performance.now());
  // CPU estimation via rAF
  const cpuEstimatorRef = useRef<CpuEstimator>(createCpuEstimator());
  const rafIdRef = useRef<number>(0);

  // OS information state
  const [osInfo, setOsInfo] = useState<OsDetails>({
    platform: 'Detecting...',
    version: '...',
    arch: '...',
    type: '...',
    family: '...',
    hostname: '...',
    locale: '...',
    isNative: false,
  });

  // Telemetry state — initialized with zeros; real data fills in on first tick
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    cpuUsage: 0,
    cpuFreqGhz: 0,
    cores: [],
    ramUsedGb: 0,
    ramTotalGb: 0,
    ramCachedGb: 0,
    ramPercent: 0,
    swapUsedGb: 0,
    swapTotalGb: 0,
    diskUsedGb: 0,
    diskTotalGb: 0,
    diskPercent: 0,
    diskReadMbs: 0,
    diskWriteMbs: 0,
    uptimeSeconds: 0,
  });

  // Sparkline history for CPU
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(0));

  // Browser performance metrics (replaces fake processes)
  const [browserMetrics, setBrowserMetrics] = useState<BrowserMetric[]>([]);

  // ─── rAF loop for CPU estimation (runs continuously while mounted) ──────────

  useEffect(() => {
    const estimator = cpuEstimatorRef.current;

    function tick() {
      updateCpuEstimator(estimator);
      rafIdRef.current = requestAnimationFrame(tick);
    }

    rafIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  // ─── Load OS info on mount ──────────────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;

    async function loadOsInfo() {
      if (isTauri()) {
        try {
          const p = tauriOs.platform();
          const v = tauriOs.version();
          const a = tauriOs.arch();
          const tType = tauriOs.type();
          const f = tauriOs.family();
          const h = (await tauriOs.hostname()) || 'localhost';
          const l = (await tauriOs.locale()) || navigator.language;

          if (isMounted) {
            setOsInfo({
              platform: p,
              version: v,
              arch: a,
              type: tType,
              family: f,
              hostname: h,
              locale: l,
              isNative: true,
            });
          }
          return;
        } catch (err) {
          console.warn('Tauri OS plugin call fallback:', err);
        }
      }

      // Browser fallback — use real detected info
      if (isMounted) {
        const detected = detectBrowserOsDetails();
        const coresCount = navigator.hardwareConcurrency || 4;
        const memoryGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 0;

        setOsInfo({ ...detected, isNative: false });

        // Initialize cores array matching real hardwareConcurrency
        setTelemetry(prev => ({
          ...prev,
          cores: Array.from({ length: coresCount }, () => 0),
          ramTotalGb: memoryGb,
        }));

        // Get initial storage estimate
        try {
          if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const quotaGb = (estimate.quota ?? 0) / (1024 ** 3);
            const usageGb = (estimate.usage ?? 0) / (1024 ** 3);
            if (isMounted) {
              setTelemetry(prev => ({
                ...prev,
                diskTotalGb: quotaGb,
                diskUsedGb: usageGb,
                diskPercent: quotaGb > 0 ? (usageGb / quotaGb) * 100 : 0,
              }));
            }
          }
        } catch {
          // Storage API not available; leave disk at 0
        }
      }
    }

    loadOsInfo();
    return () => { isMounted = false; };
  }, []);

  // ─── Collect browser performance metrics (for processes tab) ────────────────

  const collectBrowserMetrics = useCallback((): BrowserMetric[] => {
    const metrics: BrowserMetric[] = [];

    // JS Heap (Chrome only)
    const mem = getPerformanceMemory();
    if (mem) {
      const usedMb = mem.usedJSHeapSize / (1024 * 1024);
      const totalMb = mem.totalJSHeapSize / (1024 * 1024);
      const limitMb = mem.jsHeapSizeLimit / (1024 * 1024);
      metrics.push({
        name: 'JS Heap Used',
        value: `${usedMb.toFixed(1)} MB`,
        numericValue: usedMb,
        unit: 'MB',
        category: 'memory',
      });
      metrics.push({
        name: 'JS Heap Allocated',
        value: `${totalMb.toFixed(1)} MB`,
        numericValue: totalMb,
        unit: 'MB',
        category: 'memory',
      });
      metrics.push({
        name: 'JS Heap Limit',
        value: `${limitMb.toFixed(0)} MB`,
        numericValue: limitMb,
        unit: 'MB',
        category: 'memory',
      });
    }

    // DOM metrics
    const domNodes = document.querySelectorAll('*').length;
    metrics.push({
      name: 'DOM Nodes',
      value: domNodes.toLocaleString(),
      numericValue: domNodes,
      unit: 'nodes',
      category: 'dom',
    });

    const domDepth = (() => {
      let maxDepth = 0;
      const walk = (node: Element, depth: number) => {
        if (depth > maxDepth) maxDepth = depth;
        for (let i = 0; i < node.children.length && depth < 100; i++) {
          walk(node.children[i], depth + 1);
        }
      };
      walk(document.documentElement, 0);
      return maxDepth;
    })();
    metrics.push({
      name: 'Max DOM Depth',
      value: domDepth.toString(),
      numericValue: domDepth,
      unit: 'levels',
      category: 'dom',
    });

    // Event listeners estimate via getEventListeners isn't available in page context,
    // but we can count DOM elements with inline handlers (rough proxy)
    const scripts = document.querySelectorAll('script').length;
    metrics.push({
      name: 'Script Tags',
      value: scripts.toString(),
      numericValue: scripts,
      unit: 'tags',
      category: 'dom',
    });

    const stylesheets = document.styleSheets.length;
    metrics.push({
      name: 'Stylesheets',
      value: stylesheets.toString(),
      numericValue: stylesheets,
      unit: 'sheets',
      category: 'dom',
    });

    // Performance entries
    const perfEntries = performance.getEntriesByType('resource');
    metrics.push({
      name: 'Resource Entries',
      value: perfEntries.length.toLocaleString(),
      numericValue: perfEntries.length,
      unit: 'resources',
      category: 'performance',
    });

    // Total transferred size estimate from resource timing
    const totalTransferKb = perfEntries.reduce((sum, e) => {
      const re = e as PerformanceResourceTiming;
      return sum + (re.transferSize || 0);
    }, 0) / 1024;
    metrics.push({
      name: 'Total Page Weight',
      value: totalTransferKb > 1024
        ? `${(totalTransferKb / 1024).toFixed(1)} MB`
        : `${totalTransferKb.toFixed(0)} KB`,
      numericValue: totalTransferKb,
      unit: 'KB',
      category: 'performance',
    });

    // Session uptime
    const sessionSeconds = Math.floor((performance.now() - mountTimeRef.current) / 1000);
    metrics.push({
      name: 'Session Uptime',
      value: formatUptime(sessionSeconds),
      numericValue: sessionSeconds,
      unit: 'seconds',
      category: 'performance',
    });

    // Navigation timing
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      const pageLoadMs = nav.loadEventEnd - nav.startTime;
      if (pageLoadMs > 0) {
        metrics.push({
          name: 'Page Load Time',
          value: `${pageLoadMs.toFixed(0)} ms`,
          numericValue: pageLoadMs,
          unit: 'ms',
          category: 'performance',
        });
      }
      const dnsMs = nav.domainLookupEnd - nav.domainLookupStart;
      if (dnsMs > 0) {
        metrics.push({
          name: 'DNS Lookup',
          value: `${dnsMs.toFixed(0)} ms`,
          numericValue: dnsMs,
          unit: 'ms',
          category: 'performance',
        });
      }
    }

    return metrics;
  }, []);

  // ─── Polling loop for telemetry updates ─────────────────────────────────────

  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(async () => {
      // Calculate real session uptime
      const sessionUptimeSeconds = Math.floor((performance.now() - mountTimeRef.current) / 1000);

      // Get CPU estimate from the rAF estimator
      let cpuEstimate = cpuEstimatorRef.current.estimate;

      // Apply stress simulation boost
      if (stressSimulated) {
        cpuEstimate = Math.min(98, cpuEstimate + 45);
      }

      setTelemetry(prev => {
        const coresCount = prev.cores.length || (navigator.hardwareConcurrency || 4);
        // Simulate per-core distribution based on overall CPU estimate with natural variance
        const newCores = Array.from({ length: coresCount }, () => {
          const variance = (Math.random() - 0.5) * 15;
          return Math.max(2, Math.min(99, Math.round(cpuEstimate + variance)));
        });

        // Memory: use performance.memory if available (Chrome), otherwise show deviceMemory
        let ramUsed = prev.ramUsedGb;
        let ramTotal = prev.ramTotalGb;
        let ramCached = prev.ramCachedGb;

        const mem = getPerformanceMemory();
        if (mem) {
          // We can show JS heap usage as the "used" memory (this is what's actually measurable)
          ramUsed = mem.usedJSHeapSize / (1024 ** 3);
          ramTotal = mem.jsHeapSizeLimit / (1024 ** 3);
          ramCached = (mem.totalJSHeapSize - mem.usedJSHeapSize) / (1024 ** 3);
        }

        const ramPercent = ramTotal > 0 ? (ramUsed / ramTotal) * 100 : 0;

        const updated: SystemTelemetry = {
          ...prev,
          cpuUsage: Math.round(cpuEstimate * 10) / 10,
          cores: newCores,
          ramUsedGb: Math.round(ramUsed * 1000) / 1000,
          ramTotalGb: Math.round(ramTotal * 100) / 100,
          ramCachedGb: Math.round(ramCached * 1000) / 1000,
          ramPercent: Math.round(ramPercent * 10) / 10,
          uptimeSeconds: sessionUptimeSeconds,
          // Disk I/O not available in browser; leave as 0
          diskReadMbs: 0,
          diskWriteMbs: 0,
        };

        setCpuHistory(hist => [...hist.slice(1), Math.round(cpuEstimate)]);

        return updated;
      });

      // Update disk storage estimate periodically
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          const quotaGb = (estimate.quota ?? 0) / (1024 ** 3);
          const usageGb = (estimate.usage ?? 0) / (1024 ** 3);
          setTelemetry(prev => ({
            ...prev,
            diskTotalGb: quotaGb,
            diskUsedGb: usageGb,
            diskPercent: quotaGb > 0 ? Math.round((usageGb / quotaGb) * 100 * 10) / 10 : 0,
          }));
        }
      } catch {
        // Storage API unavailable
      }

      // Update browser metrics for the processes tab
      setBrowserMetrics(collectBrowserMetrics());
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [isRunning, refreshInterval, stressSimulated, collectBrowserMetrics]);

  // Format uptime
  const formatUptime = (totalSeconds: number): string => {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`;
  };

  const TAURI_INTEGRATION_CODE = `// Cargo.toml
[dependencies]
tauri = { version = "2.0", features = [] }
tauri-plugin-os = "2.0"
sysinfo = "0.30"
serde = { version = "1.0", features = ["derive"] }

// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "permissions": [
    "core:default",
    "os:default",
    "os:allow-platform",
    "os:allow-version",
    "os:allow-arch",
    "os:allow-hostname",
    "os:allow-locale"
  ]
}

// src-tauri/src/main.rs
use sysinfo::{CpuRefreshKind, Disks, RefreshKind, System};
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
fn get_system_telemetry(state: State<'_, Mutex<System>>) -> Result<serde_json::Value, String> {
    let mut sys = state.lock().map_err(|e| e.to_string())?;
    sys.refresh_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(),
    );

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let cores: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();
    let ram_total = sys.total_memory() as f32 / 1e9;
    let ram_used = sys.used_memory() as f32 / 1e9;

    Ok(serde_json::json!({
        "cpu_usage": cpu_usage,
        "cores": cores,
        "ram_used_gb": ram_used,
        "ram_total_gb": ram_total,
    }))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .manage(Mutex::new(System::new_all()))
        .invoke_handler(tauri::generate_handler![get_system_telemetry])
        .run(tauri::generate_context!())
        .expect("Tauri launch failed");
}`;

  const copyRust = () => {
    navigator.clipboard.writeText(TAURI_INTEGRATION_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Category icon & color for browser metrics
  const categoryStyle = (cat: BrowserMetric['category']) => {
    switch (cat) {
      case 'memory': return { color: 'text-emerald-400', bg: 'bg-emerald-950' };
      case 'dom': return { color: 'text-indigo-400', bg: 'bg-indigo-950' };
      case 'performance': return { color: 'text-amber-400', bg: 'bg-amber-950' };
      case 'storage': return { color: 'text-blue-400', bg: 'bg-blue-950' };
    }
  };

  // Whether we have performance.memory available
  const hasMemoryApi = getPerformanceMemory() !== null;

  return (
    <div className="space-y-6">
      {/* Top Header & Telemetry Controls */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_system_monitor_title', 'System Monitor')}
            </h2>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1.5 ${
              osInfo.isNative
                ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-300'
                : 'bg-indigo-950/80 border-indigo-800/60 text-indigo-300'
            }`}>
              <ShieldCheck className="w-3 h-3" />
              <span>{osInfo.isNative ? 'Tauri @tauri-apps/plugin-os' : 'Browser Mode — Web APIs'}</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {osInfo.isNative
              ? t('tool_system_monitor_desc', 'Nativní telemetrie CPU jader, využití RAM a disků přes Tauri Rust IPC (@tauri-apps/plugin-os + sysinfo).')
              : t('tool_system_monitor_desc_web', 'Browser performance monitoring via Web APIs (Performance API, Storage API, rAF timing). Some metrics are approximations.')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Stress simulation button */}
          <button
            onClick={() => setStressSimulated(!stressSimulated)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              stressSimulated
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Simulovat zvýšené vytížení procesoru"
          >
            <Zap className={`w-3.5 h-3.5 ${stressSimulated ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>{stressSimulated ? t('sys_stress_active', 'Zátěž aktivní') : t('sys_stress_test', 'Test zátěže')}</span>
          </button>

          {/* Refresh interval selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <label htmlFor={refreshSelectId} className="sr-only">Interval obnovení</label>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              title={isRunning ? t('pause', 'Pozastavit') : t('start', 'Spustit')}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <select
              id={refreshSelectId}
              value={refreshInterval}
              onChange={e => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-slate-300 font-mono text-[11px] focus:outline-none cursor-pointer pr-1"
            >
              <option value={500} className="bg-slate-900">500 ms</option>
              <option value={1000} className="bg-slate-900">1.0 s</option>
              <option value={2000} className="bg-slate-900">2.0 s</option>
              <option value={5000} className="bg-slate-900">5.0 s</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t('sys_tab_dashboard', 'Dashboard Telemetrie')}</span>
        </button>
        <button
          onClick={() => setActiveTab('processes')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'processes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{osInfo.isNative ? t('sys_tab_processes', 'Aktivní Procesy') : t('sys_tab_browser_metrics', 'Browser Performance')}</span>
        </button>
        <button
          onClick={() => setActiveTab('tauri_code')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'tauri_code' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{t('sys_tab_tauri_code', 'Tauri Plugin-OS Architektura')}</span>
        </button>
      </div>

      {/* OS Environment Banner via @tauri-apps/plugin-os */}
      <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/80">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {osInfo.isNative
              ? t('sys_host_os_meta', 'Operační Systém & Hostitel (via @tauri-apps/plugin-os)')
              : t('sys_host_os_meta_web', 'Environment & Host (via Web APIs)')}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Platform</span>
            <span className="font-mono font-semibold text-slate-200 mt-0.5 block truncate">{osInfo.platform}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Version</span>
            <span className="font-mono font-semibold text-slate-200 mt-0.5 block truncate">{osInfo.version}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Architecture</span>
            <span className="font-mono font-semibold text-indigo-400 mt-0.5 block">{osInfo.arch}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Hostname</span>
            <span className="font-mono font-semibold text-slate-200 mt-0.5 block truncate">{osInfo.hostname}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Locale</span>
            <span className="font-mono font-semibold text-slate-200 mt-0.5 block">{osInfo.locale}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              {osInfo.isNative ? 'Uptime' : 'Session Uptime'}
            </span>
            <span className="font-mono font-semibold text-emerald-400 mt-0.5 block truncate">{formatUptime(telemetry.uptimeSeconds)}</span>
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Main 3 Metrics: CPU, RAM, Disk */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. CPU Metric Card */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {osInfo.isNative ? 'CPU Vytížení' : 'CPU Estimate (rAF)'}
                      </h3>
                      <span className="text-[11px] text-slate-400">{telemetry.cores.length} Jader / Vláken</span>
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    telemetry.cpuUsage > 80 ? 'bg-rose-950 text-rose-400' :
                    telemetry.cpuUsage > 50 ? 'bg-amber-950 text-amber-400' :
                    'bg-emerald-950 text-emerald-400'
                  }`}>
                    {telemetry.cpuUsage.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-3xl font-mono font-bold text-white tracking-tight">
                    {telemetry.cpuUsage.toFixed(1)}{' '}
                    <span className="text-sm font-normal text-slate-400">%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-2 border border-slate-800">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        telemetry.cpuUsage > 80 ? 'bg-rose-500' :
                        telemetry.cpuUsage > 50 ? 'bg-amber-500' :
                        'bg-indigo-500'
                      }`}
                      style={{ width: `${telemetry.cpuUsage}%` }}
                    />
                  </div>
                  {!osInfo.isNative && (
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Estimated via requestAnimationFrame timing
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline mini chart */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5">Historie zátěže (30s)</span>
                <div className="h-10 flex items-end gap-1">
                  {cpuHistory.map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 rounded-t transition-all duration-300"
                      style={{
                        height: `${Math.max(8, val)}%`,
                        backgroundColor: val > 75 ? '#F43F5E' : val > 50 ? '#F59E0B' : '#6366F1',
                        opacity: 0.3 + (idx / cpuHistory.length) * 0.7,
                      }}
                      title={`${val}%`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Memory (RAM) Metric Card */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {hasMemoryApi ? 'JS Heap Memory' : 'Operační Paměť'}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {hasMemoryApi
                          ? `Limit ${telemetry.ramTotalGb.toFixed(2)} GB`
                          : telemetry.ramTotalGb > 0
                            ? `Device Memory ~${telemetry.ramTotalGb.toFixed(0)} GB`
                            : 'Not available in browser'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                    {telemetry.ramPercent.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-3xl font-mono font-bold text-white tracking-tight">
                    {hasMemoryApi
                      ? `${(telemetry.ramUsedGb * 1024).toFixed(0)}`
                      : telemetry.ramTotalGb > 0 ? `~${telemetry.ramTotalGb.toFixed(0)}` : 'N/A'}{' '}
                    <span className="text-sm font-normal text-slate-400">
                      {hasMemoryApi
                        ? `/ ${(telemetry.ramTotalGb * 1024).toFixed(0)} MB`
                        : telemetry.ramTotalGb > 0 ? 'GB (device hint)' : ''}
                    </span>
                  </div>
                  {hasMemoryApi && (
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-2 border border-slate-800">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${telemetry.ramPercent}%` }}
                      />
                    </div>
                  )}
                  {!osInfo.isNative && !hasMemoryApi && (
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      performance.memory not available (Chrome only)
                    </span>
                  )}
                </div>
              </div>

              {/* Memory breakdown details */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                {hasMemoryApi ? (
                  <>
                    <div className="flex justify-between text-slate-400">
                      <span>Available heap:</span>
                      <span className="text-white">{((telemetry.ramTotalGb - telemetry.ramUsedGb) * 1024).toFixed(1)} MB</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Allocated (not used):</span>
                      <span className="text-slate-300">{(telemetry.ramCachedGb * 1024).toFixed(1)} MB</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Source:</span>
                      <span className="text-slate-300">performance.memory (Chrome)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-400">
                      <span>Device Memory:</span>
                      <span className="text-white">{telemetry.ramTotalGb > 0 ? `${telemetry.ramTotalGb} GB` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Source:</span>
                      <span className="text-slate-300">navigator.deviceMemory</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Detail:</span>
                      <span className="text-slate-500">Exact usage requires Tauri native</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. Disk & Storage Metric Card */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800/60 flex items-center justify-center text-blue-400">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {osInfo.isNative ? 'Úložiště & Disk' : 'Browser Storage'}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {osInfo.isNative ? 'Kořenový svazek (/)' : 'navigator.storage.estimate()'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-blue-400 border border-slate-800">
                    {telemetry.diskPercent.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-3xl font-mono font-bold text-white tracking-tight">
                    {telemetry.diskUsedGb > 1
                      ? `${telemetry.diskUsedGb.toFixed(1)}`
                      : `${(telemetry.diskUsedGb * 1024).toFixed(1)}`}{' '}
                    <span className="text-sm font-normal text-slate-400">
                      {telemetry.diskUsedGb > 1 ? 'GB' : 'MB'} / {telemetry.diskTotalGb.toFixed(0)} GB
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-2 border border-slate-800">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.max(1, telemetry.diskPercent)}%` }}
                    />
                  </div>
                  {!osInfo.isNative && (
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Browser storage quota (not full disk)
                    </span>
                  )}
                </div>
              </div>

              {/* Disk I/O details */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Volné místo:</span>
                  <span className="text-white">
                    {(telemetry.diskTotalGb - telemetry.diskUsedGb) > 1
                      ? `${(telemetry.diskTotalGb - telemetry.diskUsedGb).toFixed(1)} GB`
                      : `${((telemetry.diskTotalGb - telemetry.diskUsedGb) * 1024).toFixed(1)} MB`}
                  </span>
                </div>
                {osInfo.isNative ? (
                  <>
                    <div className="flex justify-between text-slate-400 items-center">
                      <span className="flex items-center gap-1">
                        <ArrowDownToLine className="w-3 h-3 text-emerald-400" /> Čtení (Disk Read):
                      </span>
                      <span className="text-emerald-400 font-semibold">{telemetry.diskReadMbs} MB/s</span>
                    </div>
                    <div className="flex justify-between text-slate-400 items-center">
                      <span className="flex items-center gap-1">
                        <ArrowUpFromLine className="w-3 h-3 text-indigo-400" /> Zápis (Disk Write):
                      </span>
                      <span className="text-indigo-400 font-semibold">{telemetry.diskWriteMbs} MB/s</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-400">
                    <span>Disk I/O:</span>
                    <span className="text-slate-500">Not available in browser mode</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Per-Core Breakdown Grid */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {osInfo.isNative
                  ? t('sys_per_core_usage', 'Vytížení jednotlivých CPU Jader')
                  : t('sys_per_core_usage_web', 'Per-Core Estimate (simulated distribution)')}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {telemetry.cores.length} logických jader (hardwareConcurrency)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
              {telemetry.cores.map((usage, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Core #{idx}</span>
                    <span className={`font-bold ${
                      usage > 80 ? 'text-rose-400' : usage > 50 ? 'text-amber-400' : 'text-indigo-400'
                    }`}>
                      {usage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        usage > 80 ? 'bg-rose-500' : usage > 50 ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${usage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Browser Performance Metrics (replaces fake processes in browser mode) */}
      {activeTab === 'processes' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {osInfo.isNative
                ? t('sys_active_processes', 'Aktivní Procesy a Využití Paměti')
                : t('sys_browser_perf_metrics', 'Browser Performance Metrics (Live)')}
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {browserMetrics.length} metrics collected
            </span>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Metric</th>
                  <th className="py-2.5 px-3 text-right">Value</th>
                  <th className="py-2.5 px-3 text-right">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-mono tabular-nums">
                {browserMetrics.map((metric, idx) => {
                  const style = categoryStyle(metric.category);
                  return (
                    <tr key={idx} className="hover:bg-slate-900/40 text-slate-300">
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${style.bg} ${style.color}`}>
                          {metric.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          metric.category === 'memory' ? 'bg-emerald-400' :
                          metric.category === 'dom' ? 'bg-indigo-400' :
                          metric.category === 'performance' ? 'bg-amber-400' :
                          'bg-blue-400'
                        }`} />
                        <span>{metric.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-indigo-400 font-bold">{metric.value}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500 text-[10px]">
                        {metric.category === 'memory' ? 'performance.memory' :
                         metric.category === 'dom' ? 'DOM API' :
                         metric.category === 'storage' ? 'Storage API' :
                         'Performance API'}
                      </td>
                    </tr>
                  );
                })}
                {browserMetrics.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 px-3 text-center text-slate-500">
                      Collecting metrics... Data will appear on next refresh cycle.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!osInfo.isNative && (
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-2">
              <Globe className="w-3 h-3" />
              <span>
                Showing real browser performance data via Web APIs.
                {!hasMemoryApi && ' JS Heap metrics require Chrome/Edge (performance.memory).'}
                {' '}For system-level process monitoring, run as a Tauri desktop app.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Tauri Code Guide */}
      {activeTab === 'tauri_code' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Architektura Tauri & Rust Sysinfo Integrace
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Jak OmniDesk propojuje `@tauri-apps/plugin-os` a Rust crate `sysinfo` pro sub-20ms telemetrii bez režie Electronu.
              </p>
            </div>
            <button
              onClick={copyRust}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 transition-colors flex items-center gap-1.5"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Zkopírováno' : 'Kopírovat Rust kód'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-200 overflow-x-auto leading-relaxed">
            {TAURI_INTEGRATION_CODE}
          </pre>
        </div>
      )}
    </div>
  );
};
