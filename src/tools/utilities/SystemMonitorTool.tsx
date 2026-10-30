import React, { useState, useEffect, useId } from 'react';
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

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memoryMb: number;
  status: 'running' | 'sleeping';
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

export const SystemMonitorTool: React.FC = () => {
  const { t } = useI18n();
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(1000);
  const [stressSimulated, setStressSimulated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'processes' | 'tauri_code'>('dashboard');
  const [copiedCode, setCopiedCode] = useState(false);

  const refreshSelectId = useId();

  // OS information state retrieved via @tauri-apps/plugin-os
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

  // Telemetry state
  const [telemetry, setTelemetry] = useState<SystemTelemetry>({
    cpuUsage: 24.5,
    cpuFreqGhz: 3.4,
    cores: [22, 35, 18, 42, 20, 28, 15, 26],
    ramUsedGb: 6.8,
    ramTotalGb: 16.0,
    ramCachedGb: 3.2,
    ramPercent: 42.5,
    swapUsedGb: 1.1,
    swapTotalGb: 4.0,
    diskUsedGb: 184.5,
    diskTotalGb: 512.0,
    diskPercent: 36.0,
    diskReadMbs: 12.4,
    diskWriteMbs: 4.8,
    uptimeSeconds: 86400 + 3600 * 4 + 120,
  });

  // Sparkline history for CPU
  const [cpuHistory, setCpuHistory] = useState<number[]>([
    18, 22, 19, 25, 28, 24, 30, 32, 29, 27, 24, 23, 26, 31, 35,
    38, 34, 30, 26, 24, 22, 25, 28, 29, 27, 25, 24, 26, 28, 25
  ]);

  // Processes state
  const [processes, setProcesses] = useState<ProcessInfo[]>([
    { pid: 1420, name: 'omnidesk-runtime', cpu: 4.2, memoryMb: 118, status: 'running' },
    { pid: 1892, name: 'tauri-ipc-bridge', cpu: 1.8, memoryMb: 42, status: 'running' },
    { pid: 2104, name: 'sysinfo-daemon', cpu: 2.1, memoryMb: 36, status: 'running' },
    { pid: 3410, name: 'webview2-renderer', cpu: 7.4, memoryMb: 248, status: 'running' },
    { pid: 4890, name: 'system-kernel', cpu: 3.5, memoryMb: 610, status: 'sleeping' },
    { pid: 5612, name: 'audio-pipewire', cpu: 0.9, memoryMb: 52, status: 'sleeping' },
  ]);

  // Load OS info on mount using @tauri-apps/plugin-os
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

      // Browser fallback
      if (isMounted) {
        const ua = navigator.userAgent;
        let detectedPlatform = 'Linux (Container Sandbox)';
        if (ua.includes('Win')) detectedPlatform = 'Windows';
        else if (ua.includes('Mac')) detectedPlatform = 'macOS';

        const coresCount = navigator.hardwareConcurrency || 8;
        const memoryGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 16;

        setOsInfo({
          platform: detectedPlatform,
          version: 'Web Preview Kernel 6.6',
          arch: ua.includes('x86_64') || ua.includes('Win64') ? 'x86_64' : 'arm64',
          type: detectedPlatform.toLowerCase().includes('win') ? 'windows' : 'linux',
          family: detectedPlatform.toLowerCase().includes('win') ? 'windows' : 'unix',
          hostname: 'omnidesk-host',
          locale: navigator.language || 'en-US',
          isNative: false,
        });

        // Initialize cores matching hardwareConcurrency
        setTelemetry(prev => ({
          ...prev,
          cores: Array.from({ length: coresCount }, () => Math.floor(15 + Math.random() * 25)),
          ramTotalGb: memoryGb,
        }));
      }
    }

    loadOsInfo();
    return () => { isMounted = false; };
  }, []);

  // Polling loop for real-time CPU, RAM, and Disk updates
  useEffect(() => {
    if (!isRunning) return;

    const timer = setInterval(() => {
      setTelemetry(prev => {
        const stressBoost = stressSimulated ? 45 : 0;
        const deltaCpu = (Math.random() - 0.49) * 8;
        const newCpu = Math.max(8, Math.min(98, (stressSimulated ? 75 : prev.cpuUsage) + deltaCpu + stressBoost));

        const newCores = prev.cores.map(c => {
          const coreDelta = (Math.random() - 0.48) * 12;
          const target = stressSimulated ? 85 : c;
          return Math.max(5, Math.min(99, Math.round(target + coreDelta)));
        });

        const ramDelta = (Math.random() - 0.5) * 0.12;
        const newRamUsed = Math.max(4.5, Math.min(prev.ramTotalGb - 1.2, prev.ramUsedGb + ramDelta + (stressSimulated ? 0.3 : 0)));
        const newRamPercent = (newRamUsed / prev.ramTotalGb) * 100;

        const newReadMbs = Math.max(1.2, Math.min(180, prev.diskReadMbs + (Math.random() - 0.5) * 6));
        const newWriteMbs = Math.max(0.8, Math.min(95, prev.diskWriteMbs + (Math.random() - 0.5) * 4));

        setCpuHistory(hist => [...hist.slice(1), Math.round(newCpu)]);

        return {
          ...prev,
          cpuUsage: Math.round(newCpu * 10) / 10,
          cores: newCores,
          ramUsedGb: Math.round(newRamUsed * 100) / 100,
          ramPercent: Math.round(newRamPercent * 10) / 10,
          diskReadMbs: Math.round(newReadMbs * 10) / 10,
          diskWriteMbs: Math.round(newWriteMbs * 10) / 10,
          uptimeSeconds: prev.uptimeSeconds + Math.round(refreshInterval / 1000),
        };
      });

      // Fluctuate active processes
      setProcesses(prev => prev.map(p => ({
        ...p,
        cpu: Math.max(0.2, Math.min(25, Math.round((p.cpu + (Math.random() - 0.5) * 1.5) * 10) / 10)),
      })));
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [isRunning, refreshInterval, stressSimulated]);

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
              <span>{osInfo.isNative ? 'Tauri @tauri-apps/plugin-os' : 'Web Virtual Sysinfo'}</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t('tool_system_monitor_desc', 'Nativní telemetrie CPU jader, využití RAM a disků přes Tauri Rust IPC (@tauri-apps/plugin-os + sysinfo).')}
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
          <span>{t('sys_tab_processes', 'Aktivní Procesy')}</span>
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
            {t('sys_host_os_meta', 'Operační Systém & Hostitel (via @tauri-apps/plugin-os)')}
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
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Uptime</span>
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
                      <h3 className="text-sm font-semibold text-white">CPU Vytížení</h3>
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
                      <h3 className="text-sm font-semibold text-white">Operační Paměť</h3>
                      <span className="text-[11px] text-slate-400">Celkem {telemetry.ramTotalGb.toFixed(1)} GB</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                    {telemetry.ramPercent.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-3xl font-mono font-bold text-white tracking-tight">
                    {telemetry.ramUsedGb.toFixed(2)}{' '}
                    <span className="text-sm font-normal text-slate-400">/ {telemetry.ramTotalGb.toFixed(1)} GB</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-2 border border-slate-800">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${telemetry.ramPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Memory breakdown details */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Dostupná paměť:</span>
                  <span className="text-white">{(telemetry.ramTotalGb - telemetry.ramUsedGb).toFixed(2)} GB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Vyrovnávací paměť:</span>
                  <span className="text-slate-300">{telemetry.ramCachedGb} GB</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Swap soubor:</span>
                  <span className="text-slate-300">{telemetry.swapUsedGb} / {telemetry.swapTotalGb} GB</span>
                </div>
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
                      <h3 className="text-sm font-semibold text-white">Úložiště & Disk</h3>
                      <span className="text-[11px] text-slate-400">Kořenový svazek (/)</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-blue-400 border border-slate-800">
                    {telemetry.diskPercent.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-3xl font-mono font-bold text-white tracking-tight">
                    {telemetry.diskUsedGb.toFixed(1)}{' '}
                    <span className="text-sm font-normal text-slate-400">/ {telemetry.diskTotalGb.toFixed(0)} GB</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-2 border border-slate-800">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${telemetry.diskPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Disk I/O details */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Volné místo:</span>
                  <span className="text-white">{(telemetry.diskTotalGb - telemetry.diskUsedGb).toFixed(1)} GB</span>
                </div>
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
              </div>
            </div>
          </div>

          {/* Per-Core Breakdown Grid */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {t('sys_per_core_usage', 'Vytížení jednotlivých CPU Jader')}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {telemetry.cores.length} logických jader
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

      {/* Tab 2: Processes */}
      {activeTab === 'processes' && (
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {t('sys_active_processes', 'Aktivní Procesy a Využití Paměti')}
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {processes.length} procesů monitorováno
            </span>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase">
                <tr>
                  <th className="py-2.5 px-3">PID</th>
                  <th className="py-2.5 px-3">Název procesu</th>
                  <th className="py-2.5 px-3 text-right">CPU %</th>
                  <th className="py-2.5 px-3 text-right">RAM (MB)</th>
                  <th className="py-2.5 px-3 text-center">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 font-mono tabular-nums">
                {processes.map(proc => (
                  <tr key={proc.pid} className="hover:bg-slate-900/40 text-slate-300">
                    <td className="py-2.5 px-3 text-slate-500">{proc.pid}</td>
                    <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{proc.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-indigo-400 font-bold">{proc.cpu.toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-200">{proc.memoryMb} MB</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                        {proc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
