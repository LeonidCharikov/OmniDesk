import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronRight, Copy, Terminal } from 'lucide-react';
import { McpConnectionStatus } from '../../services/mcpClient';
import { invokeRustCommand, isTauri } from '../../services/fileSystemService';
import { useI18n } from '../../i18n/context';

interface McpSetupTutorialPanelProps {
  wsUrl: string;
  transport: 'websocket' | 'stdio';
  mcpStatus: McpConnectionStatus;
}

type TutorialMethod = 'websocket' | 'stdio';
type AiClientTarget = 'claude' | 'cursor' | 'vscode' | 'windsurf';

const AI_CLIENT_CONFIGS: Record<
  AiClientTarget,
  { label: string; rootKey: 'mcpServers' | 'servers'; configPath: string }
> = {
  claude: {
    label: 'Claude Desktop',
    rootKey: 'mcpServers',
    configPath: 'claude_desktop_config.json',
  },
  cursor: {
    label: 'Cursor',
    rootKey: 'mcpServers',
    configPath: '~/.cursor/mcp.json',
  },
  vscode: {
    label: 'VS Code',
    rootKey: 'servers',
    configPath: '.vscode/mcp.json',
  },
  windsurf: {
    label: 'Windsurf',
    rootKey: 'mcpServers',
    configPath: '~/.codeium/windsurf/mcp_config.json',
  },
};

function extractWsPort(wsUrl: string): string {
  try {
    const parsed = new URL(wsUrl.trim());
    if (parsed.port) return parsed.port;
    return parsed.protocol === 'wss:' ? '443' : '3847';
  } catch {
    return '3847';
  }
}

async function copyTextSafely(text: string): Promise<boolean> {
  if (isTauri()) {
    try {
      await invokeRustCommand<void>('mcp_write_clipboard', { text });
      return true;
    } catch {
      // Fall back to browser clipboard API
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export const McpSetupTutorialPanel: React.FC<McpSetupTutorialPanelProps> = ({
  wsUrl,
  transport,
  mcpStatus,
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(() => mcpStatus !== 'connected');
  const [method, setMethod] = useState<TutorialMethod>(transport);
  const [targetClient, setTargetClient] = useState<AiClientTarget>('claude');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setMethod(transport);
  }, [transport]);

  const port = useMemo(() => extractWsPort(wsUrl), [wsUrl]);
  const installCmd = 'cd docs/mcp-server-template && npm install';

  const configSnippet = useMemo(() => {
    const client = AI_CLIENT_CONFIGS[targetClient];
    if (method === 'websocket') {
      return JSON.stringify(
        {
          [client.rootKey]: {
            omnidesk: {
              command: 'node',
              args: ['/ABS/PATH/TO/OmniDesk/docs/mcp-server-template/server.mjs'],
              env: {
                OMNIDESK_MCP_PORT: port,
                OMNIDESK_MCP_TOKEN: 'your-local-secret',
                OMNIDESK_WORKSPACE_DIR: '/ABS/PATH/TO/ALLOWED_FOLDER',
              },
            },
          },
        },
        null,
        2
      );
    }

    return JSON.stringify(
      {
        [client.rootKey]: {
          'omnidesk-native': {
            command: '/ABS/PATH/TO/OmniDesk',
            args: ['--mcp-stdio'],
          },
        },
      },
      null,
      2
    );
  }, [method, targetClient, port]);

  const handleCopy = async (id: string, value: string) => {
    const ok = await copyTextSafely(value);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId(prev => (prev === id ? null : prev));
      }, 1600);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">
              {t('mcp_tutorial_title', 'How to Connect Any Desktop AI (Tutorial)')}
            </h4>
            <p className="text-[11px] text-slate-400">
              {t(
                'mcp_tutorial_desc',
                'Step-by-step guide for Claude Desktop, Cursor, VS Code, Windsurf, and any MCP-compatible host.'
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
        >
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span>{isOpen ? t('mcp_tutorial_hide', 'Hide Tutorial') : t('mcp_tutorial_show', 'Show Tutorial')}</span>
        </button>
      </div>

      {isOpen && (
        <div className="space-y-3.5 pt-1">
          {/* Connection Method Switch */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 border border-slate-800">
            <button
              type="button"
              onClick={() => setMethod('websocket')}
              className={`flex-1 min-w-[170px] px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                method === 'websocket'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('mcp_tutorial_method_ws', 'WebSocket Bridge (Recommended)')}
            </button>
            <button
              type="button"
              onClick={() => setMethod('stdio')}
              className={`flex-1 min-w-[170px] px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                method === 'stdio'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('mcp_tutorial_method_stdio', 'Direct Tauri Stdio (--mcp-stdio)')}
            </button>
          </div>

          {/* Target AI Client Selector */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-slate-300">
                {t('mcp_tutorial_client_label', 'AI Client Config Format')}
              </span>
              <span className="text-slate-400">
                {t('mcp_tutorial_config_path_label', 'Config file location')}:{' '}
                <code className="font-mono text-indigo-300">{AI_CLIENT_CONFIGS[targetClient].configPath}</code>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(AI_CLIENT_CONFIGS) as AiClientTarget[]).map(clientKey => {
                const item = AI_CLIENT_CONFIGS[clientKey];
                const active = targetClient === clientKey;
                return (
                  <button
                    key={clientKey}
                    type="button"
                    onClick={() => setTargetClient(clientKey)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {method === 'websocket' ? (
            <div className="space-y-2.5 text-xs">
              {/* Step 1 */}
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200">
                    {t('mcp_tutorial_ws_step1_title', '1. Install Node.js bridge server dependencies (one time)')}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy('install', installCmd)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-medium text-slate-300 whitespace-nowrap shrink-0"
                  >
                    {copiedId === 'install' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === 'install' ? t('mcp_tutorial_copied_btn', 'Copied') : t('mcp_tutorial_copy_btn', 'Copy')}</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-md bg-slate-950 border border-slate-800/90 font-mono text-[11px] text-emerald-300 overflow-x-auto flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{installCmd}</span>
                </pre>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200">
                    {t('mcp_tutorial_ws_step2_title', '2. Paste this config into your desktop AI app')}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy('ws-json', configSnippet)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-medium text-slate-300 whitespace-nowrap shrink-0"
                  >
                    {copiedId === 'ws-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === 'ws-json' ? t('mcp_tutorial_copied_btn', 'Copied') : t('mcp_tutorial_copy_btn', 'Copy')}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    'mcp_tutorial_ws_step2_hint',
                    'Replace /ABS/PATH/TO/OmniDesk with the full path to your OmniDesk folder. OMNIDESK_WORKSPACE_DIR and OMNIDESK_MCP_TOKEN are optional.'
                  )}
                </p>
                <pre className="p-2.5 rounded-md bg-slate-950 border border-slate-800/90 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
                  {configSnippet}
                </pre>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 space-y-1">
                <span className="font-semibold text-slate-200 block">
                  {t('mcp_tutorial_ws_step3_title', '3. Enable MCP Bridge in OmniDesk above')}
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    'mcp_tutorial_ws_step3_desc',
                    'Turn on Enable MCP Bridge, select WebSocket (Localhost) with matching port ({port}), and choose Read-Only or Read & Write permission level.',
                    { port }
                  )}
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 space-y-1">
                <span className="font-semibold text-slate-200 block">
                  {t('mcp_tutorial_ws_step4_title', '4. Reload your AI client and verify')}
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    'mcp_tutorial_ws_step4_desc',
                    'Restart or reload MCP servers in your AI app. OmniDesk will auto-connect and show Connected above—or ask your AI to run omnidesk_bridge_status.'
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs">
              {/* Step 1 */}
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 space-y-1">
                <span className="font-semibold text-slate-200 block">
                  {t('mcp_tutorial_stdio_step1_title', '1. Switch Transport Mode to Stdio above')}
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    'mcp_tutorial_stdio_step1_desc',
                    'Turn on Enable MCP Bridge and select Stdio (Tauri Desktop IPC) in Transport Mode.'
                  )}
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200">
                    {t('mcp_tutorial_stdio_step2_title', '2. Register the OmniDesk binary in your AI client')}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopy('stdio-json', configSnippet)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-medium text-slate-300 whitespace-nowrap shrink-0"
                  >
                    {copiedId === 'stdio-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === 'stdio-json' ? t('mcp_tutorial_copied_btn', 'Copied') : t('mcp_tutorial_copy_btn', 'Copy')}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    'mcp_tutorial_stdio_step2_hint',
                    'Replace /ABS/PATH/TO/OmniDesk with the path to your compiled OmniDesk desktop executable.'
                  )}
                </p>
                <pre className="p-2.5 rounded-md bg-slate-950 border border-slate-800/90 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
                  {configSnippet}
                </pre>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/80 space-y-1">
                <span className="font-semibold text-slate-200 block">
                  {t('mcp_tutorial_stdio_step3_title', '3. Reload your AI client')}
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {t(
                    'mcp_tutorial_stdio_step3_desc',
                    'Your AI app launches OmniDesk with --mcp-stdio over stdin/stdout and suppresses debug console logs automatically.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 space-y-1 text-[11px] text-slate-400 leading-relaxed">
            <p>
              {t(
                'mcp_tutorial_note_lock',
                'Workspace Lock: When the OmniDesk Lock Screen is active, MCP tool/resource calls return error -32001 until unlocked.'
              )}
            </p>
            <p>
              {t(
                'mcp_tutorial_note_port',
                'Port Conflicts: If port 3847 is already in use, change both OMNIDESK_MCP_PORT and the WebSocket URL port above.'
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
