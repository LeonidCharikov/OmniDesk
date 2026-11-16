import React, { useMemo, useState } from 'react';
import { Layers, CheckCircle2, CircleSlash, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { McpConnectedToolCapability, McpConnectionStatus } from '../../services/mcpClient';
import { McpAccessMode } from '../../types/tool';
import { useI18n } from '../../i18n/context';
import { getToolCatalogText } from '../../i18n/toolCatalog';

interface McpConnectedToolsPanelProps {
  capabilities: McpConnectedToolCapability[];
  mcpStatus: McpConnectionStatus;
  accessMode: McpAccessMode;
}

export const McpConnectedToolsPanel: React.FC<McpConnectedToolsPanelProps> = ({
  capabilities,
  mcpStatus,
  accessMode,
}) => {
  const { t, language } = useI18n();
  const [showLocalCatalog, setShowLocalCatalog] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  const isConnected = mcpStatus === 'connected';
  const activeCount = capabilities.filter(cap => cap.isAvailable).length;

  const catalogCap = useMemo(
    () => capabilities.find(cap => Array.isArray(cap.localTools) && cap.localTools.length > 0),
    [capabilities]
  );

  const filteredLocalTools = useMemo(() => {
    const list = catalogCap?.localTools || [];
    const q = localSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(tool => {
      const title = getToolCatalogText(tool.id, 'title', language, tool.title).toLowerCase();
      return (
        tool.id.toLowerCase().includes(q) ||
        title.includes(q) ||
        tool.category.toLowerCase().includes(q)
      );
    });
  }, [catalogCap, localSearch, language]);

  return (
    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">
              {t('mcp_connected_tools_title', 'Connected Tools')} ({activeCount}/{capabilities.length})
            </h4>
            <p className="text-[11px] text-slate-400">
              {t(
                'mcp_connected_tools_desc',
                'Local OmniDesk tools and capabilities currently exposed to the active MCP server.'
              )}
            </p>
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium shrink-0 ${
            isConnected
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
        >
          {isConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CircleSlash className="w-3.5 h-3.5" />}
          <span>
            {isConnected
              ? t('mcp_connected_live_badge', 'Active on MCP Server')
              : t('mcp_connected_offline_badge', 'Bridge Offline')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {capabilities.map(cap => {
          const title = cap.localToolId
            ? getToolCatalogText(cap.localToolId, 'title', language, t(cap.titleKey, cap.defaultTitle))
            : t(cap.titleKey, cap.defaultTitle);
          const hasLocalList = Boolean(cap.localTools && cap.localTools.length > 0);

          return (
            <div
              key={cap.id}
              className={`p-3 rounded-xl border transition-colors ${
                cap.isAvailable
                  ? 'bg-slate-900/70 border-emerald-500/30'
                  : 'bg-slate-900/40 border-slate-800/80 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-white leading-snug">{title}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                      cap.canWrite
                        ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
                        : 'bg-slate-950 border-slate-700 text-slate-300'
                    }`}
                  >
                    {cap.canWrite
                      ? t('mcp_cap_mode_rw', 'Read & Write')
                      : t('mcp_cap_mode_ro', 'Read-Only')}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                      cap.isAvailable
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    {cap.isAvailable
                      ? t('mcp_cap_status_available', 'Available')
                      : t('mcp_cap_status_standby', 'Offline')}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {t(cap.descKey, cap.defaultDesc)}
              </p>

              <div className="flex flex-wrap gap-1 mt-2">
                {cap.exposedMcpTools.map(toolName => (
                  <span
                    key={toolName}
                    className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-800 font-mono text-[10px] text-indigo-300"
                  >
                    {toolName}
                  </span>
                ))}
              </div>

              {hasLocalList && (
                <button
                  type="button"
                  onClick={() => setShowLocalCatalog(prev => !prev)}
                  className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {showLocalCatalog ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  <span>
                    {showLocalCatalog
                      ? t('mcp_hide_local_tools', 'Hide local tools')
                      : `${t('mcp_show_local_tools', 'Inspect local tools')} (${cap.localTools?.length ?? 0})`}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showLocalCatalog && catalogCap?.localTools && (
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder={t('mcp_search_local_tools_placeholder', 'Filter local tools...')}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/70 rounded-lg border border-slate-800/80 bg-slate-900/40">
            {filteredLocalTools.map(tool => {
              const localizedTitle = getToolCatalogText(tool.id, 'title', language, tool.title);
              return (
                <div key={tool.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="text-slate-200 font-medium block truncate">{localizedTitle}</span>
                    <span className="text-[10px] font-mono text-slate-500">{tool.id}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                      !isConnected
                        ? 'bg-slate-950 border-slate-800 text-slate-500'
                        : accessMode === 'readwrite'
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                        : 'bg-sky-950/50 border-sky-500/40 text-sky-300'
                    }`}
                  >
                    {!isConnected
                      ? t('mcp_cap_status_standby', 'Offline')
                      : accessMode === 'readwrite'
                      ? t('mcp_local_tools_launchable', 'Discoverable & Launchable')
                      : t('mcp_local_tools_discoverable', 'Discoverable')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
