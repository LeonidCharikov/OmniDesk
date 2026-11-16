import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Terminal,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Info,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { McpLogEntry } from '../../services/mcpClient';
import { useI18n } from '../../i18n/context';

interface McpLogPanelProps {
  logs: McpLogEntry[];
  onClear: () => void;
}

type LogFilter = 'all' | 'incoming' | 'outgoing' | 'error';

function formatLogTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const McpLogPanel: React.FC<McpLogPanelProps> = ({ logs, onClear }) => {
  const { t } = useI18n();
  const [filter, setFilter] = useState<LogFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    let incoming = 0;
    let outgoing = 0;
    let error = 0;
    for (const entry of logs) {
      if (entry.direction === 'incoming') incoming += 1;
      if (entry.direction === 'outgoing') outgoing += 1;
      if (entry.direction === 'error' || entry.isError) error += 1;
    }
    return { all: logs.length, incoming, outgoing, error };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs;
    if (filter === 'error') {
      return logs.filter(entry => entry.direction === 'error' || Boolean(entry.isError));
    }
    return logs.filter(entry => entry.direction === filter);
  }, [logs, filter]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filteredLogs.length]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyAll = async () => {
    if (filteredLogs.length === 0 || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(filteredLogs, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard write may fail without focus
    }
  };

  const filterButtons: Array<{ id: LogFilter; label: string; count: number }> = [
    { id: 'all', label: t('mcp_log_filter_all', 'All'), count: counts.all },
    { id: 'incoming', label: t('mcp_log_filter_incoming', 'Incoming'), count: counts.incoming },
    { id: 'outgoing', label: t('mcp_log_filter_outgoing', 'Outgoing'), count: counts.outgoing },
    { id: 'error', label: t('mcp_log_filter_error', 'Errors'), count: counts.error },
  ];

  return (
    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">
              {t('mcp_log_title', 'MCP Log')}
            </h4>
            <p className="text-[11px] text-slate-400">
              {t(
                'mcp_log_desc',
                'Live stream of JSON-RPC messages and errors between OmniDesk and the connected MCP server.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyAll}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none border border-slate-800 text-[11px] font-medium text-slate-300 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? t('mcp_log_copied', 'Copied') : t('mcp_log_copy', 'Copy Log')}</span>
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 disabled:opacity-40 disabled:pointer-events-none border border-slate-800 hover:border-rose-500/40 text-[11px] font-medium text-slate-300 hover:text-rose-300 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>{t('mcp_log_clear', 'Clear')}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {filterButtons.map(btn => {
          const active = filter === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => setFilter(btn.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1.5 ${
                active
                  ? btn.id === 'error'
                    ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                    : 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{btn.label}</span>
              <span className="text-[10px] font-mono opacity-80">{btn.count}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={scrollContainerRef}
        className="max-h-72 overflow-y-auto rounded-lg bg-slate-950 border border-slate-800/90 divide-y divide-slate-800/70 font-mono text-[11px]"
      >
        {filteredLogs.length === 0 ? (
          <div className="p-5 text-center text-slate-500 font-sans text-xs">
            {logs.length === 0
              ? t(
                  'mcp_log_empty',
                  'No MCP traffic recorded yet. Enable the MCP Bridge to inspect JSON-RPC requests, responses, and errors.'
                )
              : t('mcp_log_empty_filter', 'No log entries match the selected filter.')}
          </div>
        ) : (
          filteredLogs.map(entry => {
            const isExpanded = Boolean(expandedIds[entry.id]);
            const isErrorEntry = entry.direction === 'error' || Boolean(entry.isError);
            const badgeConfig =
              entry.direction === 'error'
                ? {
                    label: t('mcp_log_dir_error', 'ERR'),
                    className: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
                    Icon: AlertTriangle,
                  }
                : entry.direction === 'incoming'
                ? {
                    label: t('mcp_log_dir_incoming', 'IN'),
                    className: 'bg-sky-950/70 border-sky-500/40 text-sky-300',
                    Icon: ArrowDownLeft,
                  }
                : entry.direction === 'outgoing'
                ? {
                    label: t('mcp_log_dir_outgoing', 'OUT'),
                    className: isErrorEntry
                      ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                      : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
                    Icon: isErrorEntry ? AlertTriangle : ArrowUpRight,
                  }
                : {
                    label: t('mcp_log_dir_system', 'SYS'),
                    className: 'bg-slate-900 border-slate-700 text-slate-300',
                    Icon: Info,
                  };
            const BadgeIcon = badgeConfig.Icon;

            return (
              <div
                key={entry.id}
                className={`p-2.5 transition-colors ${
                  isErrorEntry ? 'bg-rose-950/15 hover:bg-rose-950/25' : 'hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(entry.id)}
                    className="flex items-center gap-2 text-left min-w-0 flex-1"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatLogTime(entry.timestamp)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold shrink-0 ${badgeConfig.className}`}
                    >
                      <BadgeIcon className="w-2.5 h-2.5" />
                      <span>{badgeConfig.label}</span>
                    </span>
                    {entry.rpcId !== undefined && entry.rpcId !== null && (
                      <span className="text-[10px] text-slate-400 shrink-0">#{String(entry.rpcId)}</span>
                    )}
                    <span
                      className={`truncate ${
                        isErrorEntry ? 'text-rose-200' : 'text-slate-200'
                      }`}
                    >
                      {entry.summary}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(entry.id)}
                    className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 shrink-0"
                  >
                    {t('mcp_log_payload_toggle', 'JSON')}
                  </button>
                </div>

                {isExpanded && (
                  <pre className="mt-2 p-2.5 rounded-lg bg-black/50 border border-slate-800/80 text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {entry.payload}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
