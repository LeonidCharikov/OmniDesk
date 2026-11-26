import { invokeRustCommand, isTauri } from './fileSystemService';

// ─── Shared Interfaces ───────────────────────────────────────────────────────

export interface DesktopProcessInfo {
  pid: number;
  name: string;
  cpu_usage: number;
  memory_mb: number;
  status: string;
  cmd: string;
}

export interface DesktopListeningPort {
  protocol: string;
  local_address: string;
  port: number;
  state: string;
  pid: number;
  process_name: string;
}

export interface PingResult {
  host: string;
  sent: number;
  received: number;
  loss_percent: number;
  rtts_ms: number[];
  min_ms: number | null;
  avg_ms: number | null;
  max_ms: number | null;
  raw_output: string;
  success: boolean;
}

export interface TcpCheckResult {
  host: string;
  port: number;
  resolved_ip: string | null;
  open: boolean;
  latency_ms: number;
  error: string | null;
}

export interface DnsLookupResult {
  host: string;
  record_type: string;
  ipv4: string[];
  ipv6: string[];
  raw_records: string;
  elapsed_ms: number;
}

export interface NetworkInterfaceInfo {
  name: string;
  mac_address: string;
  received_mb: number;
  transmitted_mb: number;
}

export interface HostNetworkSummary {
  primary_local_ip: string | null;
  interfaces: NetworkInterfaceInfo[];
}

export type AutoClickerMode = 'mouse' | 'key';
export type AutoClickerButton = 'left' | 'right' | 'middle';
export type AutoClickerClickType = 'single' | 'double';
export type AutoClickerStopMode = 'infinite' | 'count' | 'duration';
export type AutoClickerHotkey = 'F6' | 'F7' | 'F8' | 'F9' | 'F10';

export interface AutoClickerConfig {
  mode: AutoClickerMode;
  button: AutoClickerButton;
  click_type: AutoClickerClickType;
  key: string;
  interval_ms: number;
  jitter_ms: number;
  use_fixed_pos: boolean;
  x: number;
  y: number;
  start_delay_sec: number;
  stop_mode: AutoClickerStopMode;
  max_count: number;
  max_duration_sec: number;
  hotkey: AutoClickerHotkey;
}

export interface AutoClickerStatus {
  running: boolean;
  countdown_remaining_sec: number;
  total_actions: number;
  elapsed_sec: number;
  cursor_x: number;
  cursor_y: number;
  global_hotkey_supported: boolean;
  active_hotkey: string;
  last_error: string | null;
}

export interface KeepAwakeConfig {
  keep_display: boolean;
  jiggle_mouse: boolean;
  jiggle_interval_sec: number;
  duration_minutes: number;
}

export interface KeepAwakeStatus {
  active: boolean;
  keep_display: boolean;
  jiggle_mouse: boolean;
  jiggle_interval_sec: number;
  duration_minutes: number;
  elapsed_sec: number;
  remaining_sec: number | null;
  jiggle_count: number;
  last_error: string | null;
}

export interface WolDevicePreset {
  id: string;
  name: string;
  mac: string;
  broadcastIp: string;
  port: number;
}

export interface DiskDriveInfo {
  name: string;
  mount_point: string;
  file_system: string;
  kind: string;
  used_gb: number;
  total_gb: number;
  available_gb: number;
  is_removable: boolean;
}

export interface GpuInfo {
  name: string;
  vendor: string;
  vram_mb: number | null;
  driver_version: string | null;
}

export interface HardwareSpecs {
  cpu_brand: string;
  cpu_vendor: string;
  cpu_arch: string;
  physical_cores: number;
  logical_cores: number;
  base_freq_mhz: number;
  ram_total_gb: number;
  ram_summary: string | null;
  swap_total_gb: number;
  gpus: GpuInfo[];
  display_resolution: string | null;
  motherboard: string | null;
  system_model: string | null;
  os_name: string;
  os_version: string;
  kernel_version: string;
  hostname: string;
  disks: DiskDriveInfo[];
}

export interface ThermalSensorInfo {
  label: string;
  temp_c: number;
  max_c: number | null;
  critical_c: number | null;
}

export interface BasicSystemTelemetry {
  cpu_usage: number;
  ram_used_gb: number;
  ram_total_gb: number;
}

export interface NativeSystemTelemetry {
  cpu_usage: number;
  cpu_freq_mhz: number;
  cores: number[];
  ram_used_gb: number;
  ram_total_gb: number;
  ram_available_gb: number;
  swap_used_gb: number;
  swap_total_gb: number;
  disk_used_gb: number;
  disk_total_gb: number;
  disks: DiskDriveInfo[];
  uptime_seconds: number;
  load_avg_1m: number;
  load_avg_5m: number;
  load_avg_15m: number;
  temperatures: ThermalSensorInfo[];
}

// ─── Pure Validation, Formatting & Filtering Logic (Unit-Testable) ───────────

export function isValidNetworkHost(host: string): boolean {
  const trimmed = host.trim();
  if (!trimmed || trimmed.length > 253 || trimmed.startsWith('-')) return false;
  return /^[a-zA-Z0-9.:-]+$/.test(trimmed);
}

export function isValidIpv4Address(ip: string): boolean {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    if (!/^\d{1,3}$/.test(part)) return false;
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}

export function isValidMacAddress(mac: string): boolean {
  const cleaned = mac.trim().replace(/[:-]/g, '');
  return /^[0-9a-fA-F]{12}$/.test(cleaned);
}

export function normalizeMacAddress(mac: string): string | null {
  if (!isValidMacAddress(mac)) return null;
  const hex = mac.trim().replace(/[:-]/g, '').toUpperCase();
  const pairs: string[] = [];
  for (let i = 0; i < 12; i += 2) {
    pairs.push(hex.slice(i, i + 2));
  }
  return pairs.join(':');
}

export function buildWolMagicPacket(mac: string): Uint8Array | null {
  const normalized = normalizeMacAddress(mac);
  if (!normalized) return null;
  const macBytes = normalized.split(':').map(hex => parseInt(hex, 16));
  const packet = new Uint8Array(102);
  packet.fill(0xff, 0, 6);
  for (let i = 0; i < 16; i++) {
    packet.set(macBytes, 6 + i * 6);
  }
  return packet;
}

export function parsePortList(input: string, maxPorts = 24): number[] {
  const tokens = input
    .split(/[\s,;]+/)
    .map(token => token.trim())
    .filter(Boolean);

  const unique = new Set<number>();
  for (const token of tokens) {
    if (unique.size >= maxPorts) break;
    const rangeMatch = token.match(/^(\d{1,5})-(\d{1,5})$/);
    if (rangeMatch) {
      const start = Math.max(1, Math.min(65535, Number(rangeMatch[1])));
      const end = Math.max(1, Math.min(65535, Number(rangeMatch[2])));
      const lo = Math.min(start, end);
      const hi = Math.min(Math.max(start, end), lo + (maxPorts - unique.size) - 1);
      for (let p = lo; p <= hi; p++) {
        unique.add(p);
      }
      continue;
    }
    if (/^\d{1,5}$/.test(token)) {
      const p = Number(token);
      if (p >= 1 && p <= 65535) unique.add(p);
    }
  }
  return Array.from(unique).sort((a, b) => a - b);
}

export function clampAutoClickerInterval(intervalMs: number): number {
  if (!Number.isFinite(intervalMs)) return 100;
  return Math.max(10, Math.min(3_600_000, Math.round(intervalMs)));
}

export function estimateActionsPerSecond(intervalMs: number): number {
  const clamped = clampAutoClickerInterval(intervalMs);
  return Math.round((1000 / clamped) * 100) / 100;
}

export function formatDurationSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

export type ProcessSortField = 'memory_mb' | 'cpu_usage' | 'pid' | 'name';

export function filterAndSortProcesses(
  processes: DesktopProcessInfo[],
  query: string,
  sortBy: ProcessSortField,
  sortDir: 'asc' | 'desc' = 'desc'
): DesktopProcessInfo[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? processes.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          String(p.pid).includes(q) ||
          p.cmd.toLowerCase().includes(q)
      )
    : [...processes];

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else {
      cmp = a[sortBy] - b[sortBy];
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return filtered;
}

export function filterListeningPorts(
  ports: DesktopListeningPort[],
  query: string,
  protocol: 'ALL' | 'TCP' | 'UDP' = 'ALL'
): DesktopListeningPort[] {
  const q = query.trim().toLowerCase();
  return ports.filter(entry => {
    if (protocol !== 'ALL' && entry.protocol.toUpperCase() !== protocol) {
      return false;
    }
    if (!q) return true;
    return (
      String(entry.port).includes(q) ||
      String(entry.pid).includes(q) ||
      entry.process_name.toLowerCase().includes(q) ||
      entry.local_address.toLowerCase().includes(q)
    );
  });
}

export function calculateUsagePercent(used: number, total: number): number {
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((used / total) * 1000) / 10));
}

export function formatVram(vramMb: number | null | undefined): string {
  if (vramMb === null || vramMb === undefined || !Number.isFinite(vramMb) || vramMb <= 0) {
    return 'N/A';
  }
  if (vramMb >= 1024) {
    const gb = vramMb / 1024;
    return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
  }
  return `${Math.round(vramMb)} MB`;
}

export function formatCpuFrequency(mhz: number): string {
  if (!Number.isFinite(mhz) || mhz <= 0) return '—';
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(2)} GHz`;
  }
  return `${Math.round(mhz)} MHz`;
}

export function formatUptimeDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

export function formatHardwareSpecsSummary(
  specs: HardwareSpecs,
  telemetry?: NativeSystemTelemetry | null
): string {
  const lines: string[] = [
    '=== PC Hardware Specifications ===',
    `Hostname: ${specs.hostname}`,
    `OS: ${specs.os_name} (${specs.cpu_arch})`,
    `Kernel: ${specs.kernel_version}`,
  ];
  if (specs.system_model) {
    lines.push(`System: ${specs.system_model}`);
  }
  if (specs.motherboard) {
    lines.push(`Motherboard: ${specs.motherboard}`);
  }
  lines.push(
    `CPU: ${specs.cpu_brand} (${specs.physical_cores}C / ${specs.logical_cores}T${
      specs.base_freq_mhz > 0 ? `, ${formatCpuFrequency(specs.base_freq_mhz)}` : ''
    })`
  );
  if (specs.gpus.length > 0) {
    specs.gpus.forEach((gpu, idx) => {
      const prefix = specs.gpus.length > 1 ? `GPU #${idx + 1}` : 'GPU';
      const vram = gpu.vram_mb ? ` (${formatVram(gpu.vram_mb)} VRAM)` : '';
      const driver = gpu.driver_version ? ` [Driver: ${gpu.driver_version}]` : '';
      lines.push(`${prefix}: ${gpu.name}${vram}${driver}`);
    });
  } else {
    lines.push('GPU: Not detected');
  }
  if (specs.display_resolution) {
    lines.push(`Display: ${specs.display_resolution}`);
  }
  const ramExtra = specs.ram_summary ? ` (${specs.ram_summary})` : '';
  lines.push(`RAM: ${specs.ram_total_gb.toFixed(1)} GB${ramExtra}`);
  if (specs.swap_total_gb > 0) {
    lines.push(`Swap: ${specs.swap_total_gb.toFixed(1)} GB`);
  }
  if (specs.disks.length > 0) {
    lines.push('Storage:');
    specs.disks.forEach(disk => {
      const pct = calculateUsagePercent(disk.used_gb, disk.total_gb);
      lines.push(
        `  - ${disk.mount_point} (${disk.kind}, ${disk.file_system || 'FS'}): ${disk.used_gb.toFixed(1)} / ${disk.total_gb.toFixed(1)} GB (${pct}% used)`
      );
    });
  }
  if (telemetry) {
    const ramPct = calculateUsagePercent(telemetry.ram_used_gb, telemetry.ram_total_gb);
    lines.push(
      `Live Snapshot: CPU ${telemetry.cpu_usage.toFixed(1)}% | RAM ${telemetry.ram_used_gb.toFixed(1)}/${telemetry.ram_total_gb.toFixed(1)} GB (${ramPct}%) | Uptime ${formatUptimeDuration(telemetry.uptime_seconds)}`
    );
  }
  return lines.join('\n');
}

// ─── Native Tauri IPC Wrappers ───────────────────────────────────────────────

function ensureDesktopRuntime(): void {
  if (!isTauri()) {
    throw new Error('This tool requires the OmniDesk Desktop application (Tauri).');
  }
}

export async function listDesktopProcesses(limit = 150): Promise<DesktopProcessInfo[]> {
  ensureDesktopRuntime();
  return invokeRustCommand<DesktopProcessInfo[]>('desktop_list_processes', { limit });
}

export async function listDesktopPorts(): Promise<DesktopListeningPort[]> {
  ensureDesktopRuntime();
  return invokeRustCommand<DesktopListeningPort[]>('desktop_list_ports');
}

export async function killDesktopProcess(pid: number): Promise<boolean> {
  ensureDesktopRuntime();
  return invokeRustCommand<boolean>('desktop_kill_process', { pid });
}

export async function runDesktopPing(host: string, count = 4): Promise<PingResult> {
  ensureDesktopRuntime();
  return invokeRustCommand<PingResult>('desktop_net_ping', { host, count });
}

export async function runDesktopTcpCheck(
  host: string,
  port: number,
  timeoutMs = 2000
): Promise<TcpCheckResult> {
  ensureDesktopRuntime();
  return invokeRustCommand<TcpCheckResult>('desktop_net_tcp_check', {
    host,
    port,
    timeoutMs,
  });
}

export async function runDesktopDnsLookup(
  host: string,
  recordType: 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME' = 'A'
): Promise<DnsLookupResult> {
  ensureDesktopRuntime();
  return invokeRustCommand<DnsLookupResult>('desktop_net_dns_lookup', {
    host,
    recordType,
  });
}

export async function getDesktopNetworkInterfaces(): Promise<HostNetworkSummary> {
  ensureDesktopRuntime();
  return invokeRustCommand<HostNetworkSummary>('desktop_net_interfaces');
}

export async function sendDesktopWolPacket(
  mac: string,
  broadcastIp = '255.255.255.255',
  port = 9
): Promise<string> {
  ensureDesktopRuntime();
  return invokeRustCommand<string>('desktop_net_wol', {
    mac,
    broadcastIp,
    port,
  });
}

export async function startDesktopAutoClicker(
  config: AutoClickerConfig
): Promise<AutoClickerStatus> {
  ensureDesktopRuntime();
  return invokeRustCommand<AutoClickerStatus>('desktop_autoclicker_start', { config });
}

export async function stopDesktopAutoClicker(): Promise<AutoClickerStatus> {
  ensureDesktopRuntime();
  return invokeRustCommand<AutoClickerStatus>('desktop_autoclicker_stop');
}

export async function getDesktopAutoClickerStatus(): Promise<AutoClickerStatus> {
  ensureDesktopRuntime();
  return invokeRustCommand<AutoClickerStatus>('desktop_autoclicker_status');
}

export async function setDesktopAutoClickerHotkey(hotkey: AutoClickerHotkey): Promise<string> {
  ensureDesktopRuntime();
  return invokeRustCommand<string>('desktop_autoclicker_set_hotkey', { hotkey });
}

export async function getDesktopCursorPosition(): Promise<[number, number]> {
  ensureDesktopRuntime();
  return invokeRustCommand<[number, number]>('desktop_cursor_position');
}

export async function startDesktopKeepAwake(config: KeepAwakeConfig): Promise<KeepAwakeStatus> {
  ensureDesktopRuntime();
  return invokeRustCommand<KeepAwakeStatus>('desktop_keepawake_start', { config });
}

export async function stopDesktopKeepAwake(): Promise<KeepAwakeStatus> {
  ensureDesktopRuntime();
  return invokeRustCommand<KeepAwakeStatus>('desktop_keepawake_stop');
}

export async function getDesktopKeepAwakeStatus(): Promise<KeepAwakeStatus> {
  ensureDesktopRuntime();
  return invokeRustCommand<KeepAwakeStatus>('desktop_keepawake_status');
}

export async function getDesktopBasicTelemetry(): Promise<BasicSystemTelemetry> {
  ensureDesktopRuntime();
  return invokeRustCommand<BasicSystemTelemetry>('get_basic_system_telemetry');
}

export async function getDesktopSystemTelemetry(): Promise<NativeSystemTelemetry> {
  ensureDesktopRuntime();
  return invokeRustCommand<NativeSystemTelemetry>('get_system_telemetry');
}

export async function releaseDesktopProcessCache(): Promise<void> {
  if (!isTauri()) return;
  await invokeRustCommand<void>('desktop_release_process_cache');
}

export async function trimDesktopMemory(clearTelemetry = false): Promise<void> {
  if (!isTauri()) return;
  try {
    await invokeRustCommand<void>('desktop_trim_memory', { clearTelemetry });
  } catch {
    // Ignore transient IPC errors during shutdown or transition
  }
}

export async function getDesktopHardwareSpecs(): Promise<HardwareSpecs> {
  ensureDesktopRuntime();
  return invokeRustCommand<HardwareSpecs>('desktop_get_hardware_specs');
}

export async function listDesktopCrosshairMonitors(): Promise<
  Array<{
    index: number;
    name: string;
    width: number;
    height: number;
    x: number;
    y: number;
    scale_factor: number;
    is_primary: boolean;
  }>
> {
  ensureDesktopRuntime();
  return invokeRustCommand('desktop_crosshair_list_monitors');
}

export async function openDesktopCrosshairOverlay(params: {
  configJson: string;
  monitorIndex: number;
  offsetX: number;
  offsetY: number;
}): Promise<{
  active: boolean;
  monitor_index: number;
  hotkey: string;
  global_hotkey_supported: boolean;
  config_json: string | null;
}> {
  ensureDesktopRuntime();
  return invokeRustCommand('desktop_crosshair_open', {
    configJson: params.configJson,
    monitorIndex: params.monitorIndex,
    offsetX: params.offsetX,
    offsetY: params.offsetY,
  });
}

export async function updateDesktopCrosshairOverlay(params: {
  configJson: string;
  monitorIndex: number;
  offsetX: number;
  offsetY: number;
}): Promise<{
  active: boolean;
  monitor_index: number;
  hotkey: string;
  global_hotkey_supported: boolean;
  config_json: string | null;
}> {
  ensureDesktopRuntime();
  return invokeRustCommand('desktop_crosshair_update', {
    configJson: params.configJson,
    monitorIndex: params.monitorIndex,
    offsetX: params.offsetX,
    offsetY: params.offsetY,
  });
}

export async function hideDesktopCrosshairOverlay(): Promise<{
  active: boolean;
  monitor_index: number;
  hotkey: string;
  global_hotkey_supported: boolean;
  config_json: string | null;
}> {
  ensureDesktopRuntime();
  return invokeRustCommand('desktop_crosshair_hide');
}

export async function getDesktopCrosshairStatus(): Promise<{
  active: boolean;
  monitor_index: number;
  hotkey: string;
  global_hotkey_supported: boolean;
  config_json: string | null;
}> {
  ensureDesktopRuntime();
  return invokeRustCommand('desktop_crosshair_status');
}

export async function setDesktopCrosshairHotkey(hotkey: string): Promise<string> {
  ensureDesktopRuntime();
  return invokeRustCommand<string>('desktop_crosshair_set_hotkey', { hotkey });
}

