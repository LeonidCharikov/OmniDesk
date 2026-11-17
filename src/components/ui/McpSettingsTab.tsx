import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { McpBridgeConfig, UserConfig } from '../../types/tool';
import { useI18n } from '../../i18n/context';
import { DEFAULT_MCP } from '../../services/storage';
import { invokeRustCommand, isTauri } from '../../services/fileSystemService';
import {
  isValidMcpWebSocketUrl,
  McpConnectedToolCapability,
  McpConnectionStatus,
  McpLogEntry,
  OMNIDESK_MCP_TOOLS,
} from '../../services/mcpClient';
import { McpLogPanel } from './McpLogPanel';
import { McpConnectedToolsPanel } from './McpConnectedToolsPanel';
import { McpSetupTutorialPanel } from './McpSetupTutorialPanel';

interface McpSettingsTabProps {
  config: UserConfig;
  onUpdateConfig: (newConfig: UserConfig) => void;
  mcpStatus: McpConnectionStatus;
  mcpError?: string;
  mcpLogs: McpLogEntry[];
  mcpConnectedCapabilities: McpConnectedToolCapability[];
  onClearMcpLogs?: () => void;
  onReconnectMcp?: () => void;
}

export const McpSettingsTab: React.FC<McpSettingsTabProps> = ({
  config,
  onUpdateConfig,
  mcpStatus,
  mcpError,
  mcpLogs,
  mcpConnectedCapabilities,
  onClearMcpLogs,
  onReconnectMcp,
}) => {
  const { t } = useI18n();

  const currentMcp: McpBridgeConfig = {
    ...DEFAULT_MCP,
    ...(config.mcp || {}),
  };

  const updateMcp = (patch: Partial<McpBridgeConfig>) => {
    onUpdateConfig({
      ...config,
      mcp: {
        ...currentMcp,
        ...patch,
      },
    });
  };

  const wsValid = isValidMcpWebSocketUrl(currentMcp.wsUrl);
  const visibleTools = OMNIDESK_MCP_TOOLS.filter(
    tool => currentMcp.accessMode === 'readwrite' || tool.access === 'readonly'
  );

  const statusLabel =
    mcpStatus === 'connected'
      ? t('mcp_status_connected', 'Connected')
      : mcpStatus === 'connecting'
      ? t('mcp_status_connecting', 'Connecting...')
      : mcpStatus === 'error'
      ? t('mcp_status_error', 'Connection Error')
      : t('mcp_status_disconnected', 'Disconnected');

  const statusStyle =
    mcpStatus === 'connected'
      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
      : mcpStatus === 'connecting'
      ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
      : mcpStatus === 'error'
      ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
      : 'bg-slate-900 border-slate-800 text-slate-400';

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {t('mcp_bridge_title', 'Model Context Protocol (MCP) Bridge')}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            {t(
              'mcp_bridge_desc',
              'Connect OmniDesk to a local MCP server over WebSocket or Tauri stdio IPC so external AI assistants can access Calendar, Tasks, Notes, and System Info.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${statusStyle}`}>
            <span className="text-slate-400 mr-1.5">{t('mcp_status_label', 'Connection Status')}:</span>
            <span>{statusLabel}</span>
          </div>
          {currentMcp.enabled && onReconnectMcp && (
            <button
              type="button"
              onClick={onReconnectMcp}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('mcp_reconnect_btn', 'Reconnect')}</span>
            </button>
          )}
        </div>
      </div>

      {mcpError && mcpStatus === 'error' && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{mcpError}</span>
        </div>
      )}

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-white block">
            {t('mcp_enable_bridge', 'Enable MCP Bridge')}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {t('mcp_enable_bridge_desc', 'Connect automatically to the configured local MCP transport while the workspace is unlocked.')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => updateMcp({ enabled: !currentMcp.enabled })}
          aria-pressed={currentMcp.enabled}
          className={`w-12 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
            currentMcp.enabled ? 'bg-indigo-600' : 'bg-slate-800'
          }`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-white transition-transform ${
              currentMcp.enabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {isTauri() && (
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-white block">
              {t('desktop_close_to_tray_label', 'Keep Running in System Tray on Close')}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {t(
                'desktop_close_to_tray_desc',
                'Hide the OmniDesk window to the OS tray when closing so the MCP Bridge remains active in the background.'
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !Boolean(config.desktop?.closeToTray);
              onUpdateConfig({
                ...config,
                desktop: {
                  ...config.desktop,
                  closeToTray: next,
                },
              });
              void invokeRustCommand('set_close_to_tray', { enabled: next }).catch(() => {});
            }}
            aria-pressed={Boolean(config.desktop?.closeToTray)}
            className={`w-12 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
              config.desktop?.closeToTray ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                config.desktop?.closeToTray ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            {t('mcp_transport_label', 'Transport Mode')}
          </label>
          <select
            value={currentMcp.transport}
            onChange={e => updateMcp({ transport: e.target.value === 'stdio' ? 'stdio' : 'websocket' })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            <option value="websocket">{t('mcp_transport_ws', 'WebSocket (Localhost)')}</option>
            <option value="stdio">{t('mcp_transport_stdio', 'Stdio (Tauri Desktop IPC)')}</option>
          </select>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            {t('mcp_access_mode_label', 'Permission Level')}
          </label>
          <select
            value={currentMcp.accessMode}
            onChange={e => updateMcp({ accessMode: e.target.value === 'readwrite' ? 'readwrite' : 'readonly' })}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            <option value="readonly">{t('mcp_access_readonly', 'Read-Only (Calendar, Tasks, Notes, System Info)')}</option>
            <option value="readwrite">{t('mcp_access_readwrite', 'Read & Write (Create/Update Events, Tasks, Notes & Open Tools)')}</option>
          </select>
        </div>
      </div>

      {currentMcp.transport === 'websocket' && (
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('mcp_ws_url_label', 'Local WebSocket Bridge URL')}
            </label>
            <input
              type="text"
              value={currentMcp.wsUrl}
              onChange={e => updateMcp({ wsUrl: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg bg-slate-900 border text-xs font-mono text-slate-100 focus:outline-none ${
                wsValid ? 'border-slate-800 focus:border-indigo-500' : 'border-rose-500/60'
              }`}
            />
            <p className={`text-[11px] ${wsValid ? 'text-slate-500' : 'text-rose-400'}`}>
              {wsValid
                ? t('mcp_ws_url_hint', 'Must target 127.0.0.1 or localhost (e.g. ws://127.0.0.1:3847/bridge).')
                : t('mcp_ws_url_invalid', 'Only localhost or 127.0.0.1 WebSocket URLs are permitted.')}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('mcp_auth_token_label', 'Optional Bridge Auth Token')}
            </label>
            <input
              type="password"
              value={currentMcp.authToken || ''}
              onChange={e => updateMcp({ authToken: e.target.value })}
              placeholder={t('mcp_auth_token_placeholder', 'Matches OMNIDESK_MCP_TOKEN on your local server...')}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      <McpSetupTutorialPanel
        wsUrl={currentMcp.wsUrl}
        transport={currentMcp.transport}
        mcpStatus={mcpStatus}
      />

      <McpConnectedToolsPanel
        capabilities={mcpConnectedCapabilities}
        mcpStatus={mcpStatus}
        accessMode={currentMcp.accessMode}
      />

      <McpLogPanel logs={mcpLogs} onClear={onClearMcpLogs ?? (() => {})} />

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
        <span className="text-xs font-semibold text-slate-300 block">
          {t('mcp_exposed_tools_title', 'Exposed MCP Tools')} ({visibleTools.length})
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {visibleTools.map(tool => (
            <div key={tool.name} className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800/80">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold text-indigo-300">{tool.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{tool.access}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{tool.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
