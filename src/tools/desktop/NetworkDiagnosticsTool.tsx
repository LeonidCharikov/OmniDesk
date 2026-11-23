import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Globe,
  Network,
  Play,
  Plus,
  Power,
  Radar,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Wifi,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { isTauri } from '../../services/fileSystemService';
import { toastService } from '../../services/toastService';
import {
  DnsLookupResult,
  HostNetworkSummary,
  PingResult,
  TcpCheckResult,
  WolDevicePreset,
  getDesktopNetworkInterfaces,
  isValidIpv4Address,
  isValidMacAddress,
  isValidNetworkHost,
  normalizeMacAddress,
  parsePortList,
  runDesktopDnsLookup,
  runDesktopPing,
  runDesktopTcpCheck,
  sendDesktopWolPacket,
} from '../../services/desktopToolsService';
import { DesktopOnlyGuard } from './DesktopOnlyGuard';

const WOL_DEVICES_KEY = 'omnidesk_wol_devices_v1';

function loadSavedWolDevices(): WolDevicePreset[] {
  try {
    const raw = localStorage.getItem(WOL_DEVICES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is WolDevicePreset =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as WolDevicePreset).id === 'string' &&
        typeof (item as WolDevicePreset).mac === 'string'
    );
  } catch {
    return [];
  }
}

export const NetworkDiagnosticsTool: React.FC = () => {
  const { t } = useI18n();
  const runningInTauri = isTauri();

  const [activeTab, setActiveTab] = useState<'ping' | 'tcp' | 'dns' | 'wol'>('ping');
  const [error, setError] = useState<string | null>(null);

  // Ping state
  const [pingHost, setPingHost] = useState('1.1.1.1');
  const [pingCount, setPingCount] = useState(4);
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);

  // TCP Port Checker state
  const [tcpHost, setTcpHost] = useState('127.0.0.1');
  const [tcpPortsInput, setTcpPortsInput] = useState('80, 443, 3000, 5173, 5432, 8080');
  const [tcpTimeoutMs, setTcpTimeoutMs] = useState(1500);
  const [tcpLoading, setTcpLoading] = useState(false);
  const [tcpResults, setTcpResults] = useState<TcpCheckResult[]>([]);

  // DNS & Interfaces state
  const [dnsHost, setDnsHost] = useState('github.com');
  const [dnsType, setDnsType] = useState<'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME'>('A');
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsResult, setDnsResult] = useState<DnsLookupResult | null>(null);
  const [interfaces, setInterfaces] = useState<HostNetworkSummary | null>(null);
  const [ifLoading, setIfLoading] = useState(false);

  // Wake-on-LAN state
  const [wolName, setWolName] = useState('');
  const [wolMac, setWolMac] = useState('AA:BB:CC:DD:EE:FF');
  const [wolBroadcast, setWolBroadcast] = useState('255.255.255.255');
  const [wolPort, setWolPort] = useState(9);
  const [wolSending, setWolSending] = useState(false);
  const [wolLog, setWolLog] = useState<string | null>(null);
  const [wolDevices, setWolDevices] = useState<WolDevicePreset[]>(loadSavedWolDevices);

  const loadInterfaces = useCallback(async () => {
    if (!runningInTauri) return;
    setIfLoading(true);
    try {
      const summary = await getDesktopNetworkInterfaces();
      setInterfaces(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIfLoading(false);
    }
  }, [runningInTauri]);

  useEffect(() => {
    if (activeTab === 'dns' && !interfaces && runningInTauri) {
      void loadInterfaces();
    }
  }, [activeTab, interfaces, runningInTauri, loadInterfaces]);

  const handleRunPing = async () => {
    setError(null);
    if (!isValidNetworkHost(pingHost)) {
      setError(t('net_err_invalid_host', 'Please enter a valid hostname or IP address.'));
      return;
    }
    setPingLoading(true);
    try {
      const res = await runDesktopPing(pingHost.trim(), pingCount);
      setPingResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPingLoading(false);
    }
  };

  const handleRunTcpScan = async () => {
    setError(null);
    if (!isValidNetworkHost(tcpHost)) {
      setError(t('net_err_invalid_host', 'Please enter a valid hostname or IP address.'));
      return;
    }
    const ports = parsePortList(tcpPortsInput, 24);
    if (ports.length === 0) {
      setError(t('net_err_invalid_ports', 'Enter at least one valid TCP port (1–65535).'));
      return;
    }
    setTcpLoading(true);
    setTcpResults([]);
    try {
      const checks = await Promise.all(
        ports.map(port => runDesktopTcpCheck(tcpHost.trim(), port, tcpTimeoutMs))
      );
      setTcpResults(checks);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTcpLoading(false);
    }
  };

  const handleRunDnsLookup = async () => {
    setError(null);
    if (!isValidNetworkHost(dnsHost)) {
      setError(t('net_err_invalid_host', 'Please enter a valid hostname or IP address.'));
      return;
    }
    setDnsLoading(true);
    try {
      const res = await runDesktopDnsLookup(dnsHost.trim(), dnsType);
      setDnsResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDnsLoading(false);
    }
  };

  const saveWolDevices = (next: WolDevicePreset[]) => {
    setWolDevices(next);
    try {
      localStorage.setItem(WOL_DEVICES_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  };

  const handleAddWolDevice = () => {
    setError(null);
    const normalized = normalizeMacAddress(wolMac);
    if (!normalized) {
      setError(t('net_err_invalid_mac', 'Invalid MAC address (expected AA:BB:CC:DD:EE:FF).'));
      return;
    }
    if (!isValidIpv4Address(wolBroadcast)) {
      setError(t('net_err_invalid_broadcast', 'Invalid IPv4 broadcast address.'));
      return;
    }
    const preset: WolDevicePreset = {
      id: `${Date.now()}`,
      name: wolName.trim() || normalized,
      mac: normalized,
      broadcastIp: wolBroadcast.trim(),
      port: wolPort,
    };
    saveWolDevices([preset, ...wolDevices]);
    setWolName('');
    toastService.show({
      type: 'success',
      title: t('net_wol_saved_toast', 'Saved Wake-on-LAN device'),
    });
  };

  const handleSendWol = async (mac: string, broadcastIp: string, port: number) => {
    setError(null);
    setWolLog(null);
    if (!isValidMacAddress(mac)) {
      setError(t('net_err_invalid_mac', 'Invalid MAC address (expected AA:BB:CC:DD:EE:FF).'));
      return;
    }
    if (!isValidIpv4Address(broadcastIp)) {
      setError(t('net_err_invalid_broadcast', 'Invalid IPv4 broadcast address.'));
      return;
    }
    setWolSending(true);
    try {
      const message = await sendDesktopWolPacket(mac, broadcastIp, port);
      setWolLog(message);
      toastService.show({ type: 'success', title: message });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toastService.show({ type: 'error', title: msg });
    } finally {
      setWolSending(false);
    }
  };

  if (!runningInTauri) {
    return (
      <DesktopOnlyGuard
        title={t('tool_network_diagnostics_title', 'Network Diagnostics & Wake-on-LAN')}
        description={t(
          'tool_network_diagnostics_desc',
          'Native ICMP ping, TCP port scanner, DNS record lookup, local LAN adapters, and Wake-on-LAN magic packets.'
        )}
      />
    );
  }

  const maxRtt = pingResult?.rtts_ms.length
    ? Math.max(...pingResult.rtts_ms, 1)
    : 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_network_diagnostics_title', 'Network Diagnostics & Wake-on-LAN')}
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              {t('desktop_only_badge', 'Desktop Only')}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {t(
              'net_subtitle',
              'Run native OS ping, TCP port probes, DNS record queries, inspect LAN adapters, and send Wake-on-LAN UDP magic packets.'
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-slate-800">
        {[
          { id: 'ping' as const, label: t('net_tab_ping', 'ICMP Ping'), icon: <Activity className="w-3.5 h-3.5" /> },
          { id: 'tcp' as const, label: t('net_tab_tcp', 'TCP Port Check'), icon: <Radar className="w-3.5 h-3.5" /> },
          { id: 'dns' as const, label: t('net_tab_dns', 'DNS & Adapters'), icon: <Globe className="w-3.5 h-3.5" /> },
          { id: 'wol' as const, label: t('net_tab_wol', 'Wake-on-LAN'), icon: <Power className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setError(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: PING */}
      {activeTab === 'ping' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7 space-y-1">
                <label className="text-xs text-slate-400">
                  {t('net_host_label', 'Host / IP Address')}
                </label>
                <input
                  type="text"
                  value={pingHost}
                  onChange={e => setPingHost(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleRunPing()}
                  placeholder="1.1.1.1"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs text-slate-400">
                  {t('net_packets_label', 'Packets')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={pingCount}
                  onChange={e => setPingCount(Math.max(1, Math.min(10, Number(e.target.value) || 4)))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-3 flex items-end">
                <button
                  type="button"
                  disabled={pingLoading}
                  onClick={() => void handleRunPing()}
                  className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{pingLoading ? t('net_pinging', 'Pinging...') : t('net_run_ping', 'Run Ping')}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {['1.1.1.1', '8.8.8.8', '127.0.0.1', 'github.com'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPingHost(preset)}
                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-slate-400 hover:text-white"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {pingResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">{t('net_stat_loss', 'Packet Loss')}</span>
                  <span
                    className={`text-xl font-mono font-bold mt-0.5 block ${
                      pingResult.loss_percent > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {pingResult.loss_percent}%
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">{t('net_stat_min', 'Min RTT')}</span>
                  <span className="text-xl font-mono font-bold text-slate-100 mt-0.5 block">
                    {pingResult.min_ms !== null ? `${pingResult.min_ms} ms` : '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">{t('net_stat_avg', 'Avg RTT')}</span>
                  <span className="text-xl font-mono font-bold text-indigo-400 mt-0.5 block">
                    {pingResult.avg_ms !== null ? `${pingResult.avg_ms} ms` : '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">{t('net_stat_max', 'Max RTT')}</span>
                  <span className="text-xl font-mono font-bold text-amber-400 mt-0.5 block">
                    {pingResult.max_ms !== null ? `${pingResult.max_ms} ms` : '—'}
                  </span>
                </div>
              </div>

              {pingResult.rtts_ms.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">
                    {t('net_rtt_chart', 'Packet Latency Breakdown (ms)')}
                  </span>
                  <div className="h-24 flex items-end gap-2 pt-2">
                    {pingResult.rtts_ms.map((rtt, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[10px] font-mono text-slate-400">{rtt}</span>
                        <div
                          className="w-full max-w-[40px] rounded-t bg-indigo-500/80"
                          style={{ height: `${Math.max(12, Math.round((rtt / maxRtt) * 75))}%` }}
                        />
                        <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {pingResult.raw_output}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TCP PORT CHECKER */}
      {activeTab === 'tcp' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4 space-y-1">
                <label className="text-xs text-slate-400">{t('net_host_label', 'Host / IP Address')}</label>
                <input
                  type="text"
                  value={tcpHost}
                  onChange={e => setTcpHost(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <label className="text-xs text-slate-400">
                  {t('net_ports_input_label', 'Ports (comma list or range, max 24)')}
                </label>
                <input
                  type="text"
                  value={tcpPortsInput}
                  onChange={e => setTcpPortsInput(e.target.value)}
                  placeholder="22, 80, 443, 3000-3005"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs text-slate-400">{t('net_timeout_ms', 'Timeout (ms)')}</label>
                <input
                  type="number"
                  min={200}
                  max={10000}
                  step={250}
                  value={tcpTimeoutMs}
                  onChange={e => setTcpTimeoutMs(Math.max(200, Math.min(10000, Number(e.target.value) || 1500)))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <button
                  type="button"
                  disabled={tcpLoading}
                  onClick={() => void handleRunTcpScan()}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Radar className="w-3.5 h-3.5" />
                  <span>{tcpLoading ? t('net_scanning', 'Checking...') : t('net_scan_btn', 'Check')}</span>
                </button>
              </div>
            </div>
          </div>

          {tcpResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tcpResults.map(res => (
                <div
                  key={`${res.host}:${res.port}`}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                    res.open
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-slate-900/40 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-mono text-sm font-bold text-white">
                      {res.host}:{res.port}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {res.resolved_ip || '—'} · {res.latency_ms} ms
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold ${
                      res.open
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {res.open ? t('net_port_open', 'OPEN') : t('net_port_closed', 'CLOSED')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DNS & NETWORK INTERFACES */}
      {activeTab === 'dns' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-white">
              {t('net_dns_heading', 'Native DNS Lookup')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <input
                  type="text"
                  value={dnsHost}
                  onChange={e => setDnsHost(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void handleRunDnsLookup()}
                  placeholder="example.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <select
                  value={dnsType}
                  onChange={e => setDnsType(e.target.value as 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME')}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {(['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME'] as const).map(rt => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <button
                  type="button"
                  disabled={dnsLoading}
                  onClick={() => void handleRunDnsLookup()}
                  className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {dnsLoading ? t('net_resolving', 'Resolving...') : t('net_resolve_btn', 'Resolve DNS')}
                </button>
              </div>
            </div>

            {dnsResult && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-400 block mb-1">IPv4 (A)</span>
                    <div className="font-mono text-emerald-300 space-y-0.5">
                      {dnsResult.ipv4.length > 0 ? dnsResult.ipv4.map(ip => <div key={ip}>{ip}</div>) : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-400 block mb-1">IPv6 (AAAA)</span>
                    <div className="font-mono text-indigo-300 space-y-0.5 break-all">
                      {dnsResult.ipv6.length > 0 ? dnsResult.ipv6.map(ip => <div key={ip}>{ip}</div>) : '—'}
                    </div>
                  </div>
                </div>
                {dnsResult.raw_records && (
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                    {dnsResult.raw_records}
                  </pre>
                )}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">
                  {t('net_adapters_heading', 'Local Network Interfaces')}
                </h3>
                {interfaces?.primary_local_ip && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                    LAN: {interfaces.primary_local_ip}
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={ifLoading}
                onClick={() => void loadInterfaces()}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white inline-flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${ifLoading ? 'animate-spin' : ''}`} />
                <span>{t('ppm_refresh_btn', 'Refresh')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(interfaces?.interfaces || []).map(iface => (
                <div
                  key={iface.name}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate flex items-center gap-1.5">
                      <Network className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{iface.name}</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                      MAC: {iface.mac_address}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] shrink-0">
                    <div className="text-emerald-400">↓ {iface.received_mb.toFixed(1)} MB</div>
                    <div className="text-indigo-400">↑ {iface.transmitted_mb.toFixed(1)} MB</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WAKE-ON-LAN */}
      {activeTab === 'wol' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3 space-y-1">
                <label className="text-xs text-slate-400">{t('net_wol_name', 'Device Name')}</label>
                <input
                  type="text"
                  value={wolName}
                  onChange={e => setWolName(e.target.value)}
                  placeholder={t('net_wol_name_placeholder', 'Home NAS / PC')}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <label className="text-xs text-slate-400">{t('net_wol_mac', 'MAC Address')}</label>
                <input
                  type="text"
                  value={wolMac}
                  onChange={e => setWolMac(e.target.value)}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <label className="text-xs text-slate-400">{t('net_wol_broadcast', 'Broadcast IP')}</label>
                <input
                  type="text"
                  value={wolBroadcast}
                  onChange={e => setWolBroadcast(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs text-slate-400">{t('ppm_col_port', 'Port')}</label>
                <select
                  value={wolPort}
                  onChange={e => setWolPort(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value={9}>9 (UDP)</option>
                  <option value={7}>7 (UDP)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={wolSending}
                onClick={() => void handleSendWol(wolMac, wolBroadcast, wolPort)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{t('net_wol_send_btn', 'Send Magic Packet')}</span>
              </button>
              <button
                type="button"
                onClick={handleAddWolDevice}
                className="px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 hover:border-indigo-500 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('net_wol_save_device', 'Save Device Preset')}</span>
              </button>
            </div>

            {wolLog && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs font-mono text-emerald-300">
                {wolLog}
              </div>
            )}
          </div>

          {wolDevices.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t('net_wol_saved_devices', 'Saved LAN Devices')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {wolDevices.map(dev => (
                  <div
                    key={dev.id}
                    className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{dev.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {dev.mac} · {dev.broadcastIp}:{dev.port}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={wolSending}
                        onClick={() => void handleSendWol(dev.mac, dev.broadcastIp, dev.port)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Power className="w-3 h-3" />
                        <span>{t('net_wol_wake_btn', 'Wake')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => saveWolDevices(wolDevices.filter(d => d.id !== dev.id))}
                        aria-label={t('delete', 'Delete')}
                        className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
