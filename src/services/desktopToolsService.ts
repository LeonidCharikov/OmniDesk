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
