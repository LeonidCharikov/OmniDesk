import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Copy,
  Check,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Trash2,
  Cpu,
  ArrowUpDown,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { isTauri } from '../../services/fileSystemService';
import { toastService } from '../../services/toastService';
import {
  DesktopListeningPort,
  DesktopProcessInfo,
  ProcessSortField,
  filterAndSortProcesses,
  filterListeningPorts,
  killDesktopProcess,
  listDesktopPorts,
  listDesktopProcesses,
} from '../../services/desktopToolsService';
import { DesktopOnlyGuard } from './DesktopOnlyGuard';

const DEV_PORT_PRESETS = ['3000', '5173', '8080', '8000', '5432', '6379'];

export const PortProcessManagerTool: React.FC = () => {
  const { t } = useI18n();
  const runningInTauri = isTauri();

  const [activeTab, setActiveTab] = useState<'ports' | 'processes'>('ports');
  const [ports, setPorts] = useState<DesktopListeningPort[]>([]);
  const [processes, setProcesses] = useState<DesktopProcessInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<'ALL' | 'TCP' | 'UDP'>('ALL');
  const [sortField, setSortField] = useState<ProcessSortField>('memory_mb');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmKillPid, setConfirmKillPid] = useState<number | null>(null);
  const [killingPid, setKillingPid] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!runningInTauri) return;
    setLoading(true);
    setError(null);
    try {
      const [nextPorts, nextProcesses] = await Promise.all([
        listDesktopPorts(),
        listDesktopProcesses(200),
      ]);
      setPorts(nextPorts);
      setProcesses(nextProcesses);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [runningInTauri]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!runningInTauri || autoRefreshSec <= 0) return;
    const timer = window.setInterval(() => {
      void refreshData();
    }, autoRefreshSec * 1000);
    return () => window.clearInterval(timer);
  }, [runningInTauri, autoRefreshSec, refreshData]);

  const filteredPorts = useMemo(
    () => filterListeningPorts(ports, searchQuery, protocolFilter),
    [ports, searchQuery, protocolFilter]
  );

  const filteredProcesses = useMemo(
    () => filterAndSortProcesses(processes, searchQuery, sortField, sortDir),
    [processes, searchQuery, sortField, sortDir]
  );

  const handleSort = (field: ProcessSortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' || field === 'pid' ? 'asc' : 'desc');
    }
  };

  const handleKillProcess = async (pid: number, name: string) => {
    setKillingPid(pid);
    setError(null);
    try {
      await killDesktopProcess(pid);
      setConfirmKillPid(null);
      toastService.show({
        type: 'success',
        title: t('ppm_killed_toast', 'Terminated {name} (PID {pid})', { name, pid }),
      });
      await refreshData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toastService.show({ type: 'error', title: msg });
    } finally {
      setKillingPid(null);
    }
  };

  const handleCopy = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  if (!runningInTauri) {
    return (
      <DesktopOnlyGuard
        title={t('tool_port_process_manager_title', 'Port & Process Manager')}
        description={t(
          'tool_port_process_manager_desc',
          'Inspect active listening TCP/UDP ports and running OS processes, filter dev servers, and terminate stuck PIDs safely.'
        )}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_port_process_manager_title', 'Port & Process Manager')}
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              {t('desktop_only_badge', 'Desktop Only')}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {t(
              'ppm_subtitle',
              'Find what is occupying localhost ports (3000, 5173, 8080...) or inspect top CPU & RAM processes natively.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={t('ppm_auto_refresh', 'Auto-refresh interval')}
            value={autoRefreshSec}
            onChange={e => setAutoRefreshSec(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value={0}>{t('ppm_refresh_manual', 'Manual refresh')}</option>
            <option value={2}>{t('ppm_refresh_2s', 'Every 2s')}</option>
            <option value={5}>{t('ppm_refresh_5s', 'Every 5s')}</option>
            <option value={10}>{t('ppm_refresh_10s', 'Every 10s')}</option>
          </select>

          <button
            type="button"
            onClick={() => void refreshData()}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('ppm_refresh_btn', 'Refresh')}</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">
            {t('ppm_stat_ports', 'Listening Ports')}
          </span>
          <span className="text-xl font-mono font-bold text-white mt-0.5 block">
            {ports.length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">
            {t('ppm_stat_tcp', 'TCP Listeners')}
          </span>
          <span className="text-xl font-mono font-bold text-emerald-400 mt-0.5 block">
            {ports.filter(p => p.protocol === 'TCP').length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">
            {t('ppm_stat_processes', 'Loaded Processes')}
          </span>
          <span className="text-xl font-mono font-bold text-indigo-400 mt-0.5 block">
            {processes.length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">
            {t('ppm_stat_top_ram', 'Top Process RAM')}
          </span>
          <span className="text-xl font-mono font-bold text-amber-400 mt-0.5 block">
            {processes[0] ? `${processes[0].memory_mb.toFixed(0)} MB` : '—'}
          </span>
        </div>
      </div>

      {/* Tabs + Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('ports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'ports'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>
              {t('ppm_tab_ports', 'Listening Ports')} ({filteredPorts.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('processes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'processes'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>
              {t('ppm_tab_processes', 'Running Processes')} ({filteredProcesses.length})
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 sm:flex-initial justify-end">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('ppm_search_placeholder', 'Filter by port, PID, or process name...')}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {activeTab === 'ports' && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
              {(['ALL', 'TCP', 'UDP'] as const).map(proto => (
                <button
                  key={proto}
                  type="button"
                  onClick={() => setProtocolFilter(proto)}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                    protocolFilter === proto
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {proto}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Dev Port Chips */}
      {activeTab === 'ports' && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500 mr-1">{t('ppm_quick_ports', 'Quick dev ports:')}</span>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className={`px-2 py-0.5 rounded-md border font-mono text-[11px] transition-colors ${
              searchQuery === ''
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t('ppm_all_ports', 'All')}
          </button>
          {DEV_PORT_PRESETS.map(port => (
            <button
              key={port}
              type="button"
              onClick={() => setSearchQuery(port)}
              className={`px-2 py-0.5 rounded-md border font-mono text-[11px] transition-colors ${
                searchQuery === port
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              :{port}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ports Table */}
      {activeTab === 'ports' ? (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">{t('ppm_col_port', 'Port')}</th>
                <th className="py-2.5 px-3">{t('ppm_col_proto', 'Proto')}</th>
                <th className="py-2.5 px-3">{t('ppm_col_address', 'Local Address')}</th>
                <th className="py-2.5 px-3">{t('ppm_col_pid', 'PID')}</th>
                <th className="py-2.5 px-3">{t('ppm_col_process', 'Process')}</th>
                <th className="py-2.5 px-3 text-right">{t('ppm_col_actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredPorts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {t('ppm_no_ports', 'No listening ports match your filter.')}
                  </td>
                </tr>
              ) : (
                filteredPorts.map(entry => {
                  const rowKey = `${entry.protocol}-${entry.local_address}-${entry.port}-${entry.pid}`;
                  const isConfirming = confirmKillPid === entry.pid && entry.pid > 0;
                  return (
                    <tr key={rowKey} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-indigo-300">
                        :{entry.port}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{entry.protocol}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {entry.local_address}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{entry.pid || '—'}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-100">
                        {entry.process_name}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(rowKey, `${entry.local_address}:${entry.port}`)}
                            title={t('copy', 'Copy')}
                            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                          >
                            {copiedKey === rowKey ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {entry.pid > 0 &&
                            (isConfirming ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={killingPid === entry.pid}
                                  onClick={() => void handleKillProcess(entry.pid, entry.process_name)}
                                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold"
                                >
                                  {t('ppm_confirm_kill', 'Confirm Kill')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmKillPid(null)}
                                  className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                                >
                                  {t('cancel', 'Cancel')}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmKillPid(entry.pid)}
                                className="px-2 py-1 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-300 hover:bg-rose-900/60 text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{t('ppm_kill_btn', 'Kill')}</span>
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Processes Table */
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('pid')}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    <span>{t('ppm_col_pid', 'PID')}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    <span>{t('ppm_col_process', 'Process')}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('cpu_usage')}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    <span>{t('ppm_col_cpu', 'CPU %')}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('memory_mb')}
                    className="inline-flex items-center gap-1 hover:text-white"
                  >
                    <span>{t('ppm_col_ram', 'RAM (MB)')}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">{t('ppm_col_cmd', 'Command')}</th>
                <th className="py-2.5 px-3 text-right">{t('ppm_col_actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {t('ppm_no_processes', 'No running processes match your filter.')}
                  </td>
                </tr>
              ) : (
                filteredProcesses.map(proc => {
                  const isConfirming = confirmKillPid === proc.pid;
                  return (
                    <tr key={proc.pid} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-300">{proc.pid}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-100 flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{proc.name}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-amber-300">
                        {proc.cpu_usage.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-300">
                        {proc.memory_mb.toFixed(1)} MB
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                        {proc.cmd || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isConfirming ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={killingPid === proc.pid}
                              onClick={() => void handleKillProcess(proc.pid, proc.name)}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold"
                            >
                              {t('ppm_confirm_kill', 'Confirm Kill')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmKillPid(null)}
                              className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                            >
                              {t('cancel', 'Cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmKillPid(proc.pid)}
                            className="px-2 py-1 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-300 hover:bg-rose-900/60 text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{t('ppm_kill_btn', 'Kill')}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
