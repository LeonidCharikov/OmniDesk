import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpCircle,
  Check,
  Clock,
  Coins,
  ExternalLink,
  Globe,
  HardDrive,
  Keyboard,
  Palette,
  Plug,
  ShieldCheck,
  Sliders,
  X,
} from 'lucide-react';
import { UserConfig } from '../../types/tool';
import { useI18n } from '../../i18n/context';
import {
  isTauri,
  OMNIDESK_GITHUB_URL,
  OMNIDESK_PROJECT_WEB_URL,
  openExternalUrl,
} from '../../services/fileSystemService';
import type {
  McpConnectedToolCapability,
  McpConnectionStatus,
  McpLogEntry,
} from '../../services/mcpClient';
import type { DesktopUpdateCheckResult } from '../../services/updaterService';
import { DEFAULT_SHORTCUTS } from '../../services/shortcutsService';
import { lazyWithRetry } from '../../utils/chunkRecovery';
import { ShortcutsSettingsPanel } from './ShortcutsSettingsPanel';
import { ThemesSettingsTab } from './settings/ThemesSettingsTab';
import { CurrencySettingsTab } from './settings/CurrencySettingsTab';
import { SecuritySettingsTab } from './settings/SecuritySettingsTab';
import { LanguageSettingsTab } from './settings/LanguageSettingsTab';

const McpSettingsTab = lazyWithRetry(() => import('./McpSettingsTab'), 'McpSettingsTab');
const WidgetsSettingsTab = lazyWithRetry(
  () => import('./settings/WidgetsSettingsTab'),
  'WidgetsSettingsTab'
);
const BackupSettingsTab = lazyWithRetry(
  () => import('./settings/BackupSettingsTab'),
  'BackupSettingsTab'
);
const UpdatesSettingsTab = lazyWithRetry(
  () => import('./settings/UpdatesSettingsTab'),
  'UpdatesSettingsTab'
);

export type ConfigTabType =
  | 'themes'
  | 'currency'
  | 'widgets'
  | 'security'
  | 'mcp'
  | 'shortcuts'
  | 'backup'
  | 'language'
  | 'updates';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: UserConfig;
  onUpdateConfig: (newConfig: UserConfig) => void;
  onResetDefaults: () => void;
  initialTab?: ConfigTabType;
  mcpStatus?: McpConnectionStatus;
  mcpError?: string;
  mcpLogs?: McpLogEntry[];
  mcpConnectedCapabilities?: McpConnectedToolCapability[];
  onClearMcpLogs?: () => void;
  onReconnectMcp?: () => void;
  externalUpdateResult?: DesktopUpdateCheckResult | null;
  onExternalUpdateResultChange?: (res: DesktopUpdateCheckResult | null) => void;
}

const isDesktopOnlyTab = (tab: ConfigTabType): boolean =>
  tab === 'mcp' || tab === 'widgets' || tab === 'backup' || tab === 'updates';

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onResetDefaults,
  initialTab,
  mcpStatus = 'disconnected',
  mcpError,
  mcpLogs = [],
  mcpConnectedCapabilities = [],
  onClearMcpLogs,
  onReconnectMcp,
  externalUpdateResult,
  onExternalUpdateResultChange,
}) => {
  const { t } = useI18n();
  const runningInTauri = isTauri();
  const [activeTab, setActiveTab] = useState<ConfigTabType>(() =>
    !isTauri() && initialTab && isDesktopOnlyTab(initialTab) ? 'themes' : initialTab || 'themes'
  );
  const [statusBanner, setStatusBanner] = useState<{ success: boolean; message: string } | null>(
    null
  );
  const statusTimerRef = useRef<number | null>(null);

  const showStatusMessage = useCallback(
    (status: { success: boolean; message: string }, durationMs = 4000) => {
      setStatusBanner(status);
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
      statusTimerRef.current = window.setTimeout(() => {
        setStatusBanner(null);
        statusTimerRef.current = null;
      }, durationMs);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (initialTab) {
      const resolvedTab = !runningInTauri && isDesktopOnlyTab(initialTab) ? 'themes' : initialTab;
      setActiveTab(resolvedTab);
    } else if (!runningInTauri && isDesktopOnlyTab(activeTab)) {
      setActiveTab('themes');
    }
  }, [isOpen, initialTab, runningInTauri, activeTab]);

  if (!isOpen) return null;

  const tabItems: Array<{
    id: ConfigTabType;
    label: string;
    icon: React.ReactNode;
    desktopOnly?: boolean;
  }> = [
    { id: 'themes', label: t('tab_themes', 'Themes & Colors'), icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'currency', label: t('tab_currency', 'Default Currency'), icon: <Coins className="w-3.5 h-3.5" /> },
    { id: 'widgets', label: t('tab_widgets', 'Sidebar Widgets'), icon: <Clock className="w-3.5 h-3.5" />, desktopOnly: true },
    { id: 'security', label: t('tab_security', 'Security & Privacy'), icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'mcp', label: t('tab_mcp', 'MCP Bridge'), icon: <Plug className="w-3.5 h-3.5" />, desktopOnly: true },
    { id: 'shortcuts', label: t('tab_shortcuts', 'Shortcuts'), icon: <Keyboard className="w-3.5 h-3.5" /> },
    { id: 'backup', label: t('tab_backup', 'Backup & JSON Export/Import'), icon: <HardDrive className="w-3.5 h-3.5" />, desktopOnly: true },
    { id: 'language', label: t('tab_language', 'Language'), icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'updates', label: t('tab_updates', 'Updates'), icon: <ArrowUpCircle className="w-3.5 h-3.5" />, desktopOnly: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('settings_modal_title', 'OmniDesk Settings & Configurator')}
        className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[90vh] overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/60 shrink-0 relative z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {t('settings_modal_title', 'OmniDesk Settings & Configurator')}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {runningInTauri
                  ? t('settings_modal_subtitle', 'Color themes, sidebar widgets, and portable JSON profiles')
                  : t('settings_modal_subtitle_web', 'Color themes, default currency, shortcuts, and preferences')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('close', 'Close')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          role="tablist"
          className="shrink-0 relative z-10 flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-3.5 border-b border-slate-800 bg-slate-950/30 overflow-x-auto"
        >
          {tabItems
            .filter(tab => !tab.desktopOnly || runningInTauri)
            .map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={e => {
                  setActiveTab(tab.id);
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'text-indigo-300 border-indigo-500/50 bg-indigo-600/20 shadow-xs'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {statusBanner && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs animate-fade-in ${
                statusBanner.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {statusBanner.success ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-medium">{statusBanner.message}</span>
            </div>
          )}

          {activeTab === 'themes' && (
            <ThemesSettingsTab
              config={config}
              runningInTauri={runningInTauri}
              onUpdateConfig={onUpdateConfig}
            />
          )}

          {activeTab === 'currency' && (
            <CurrencySettingsTab config={config} onUpdateConfig={onUpdateConfig} />
          )}

          {runningInTauri && activeTab === 'widgets' && (
            <React.Suspense fallback={null}>
              <WidgetsSettingsTab config={config} onUpdateConfig={onUpdateConfig} />
            </React.Suspense>
          )}

          {activeTab === 'security' && (
            <SecuritySettingsTab
              config={config}
              onUpdateConfig={onUpdateConfig}
              onStatusMessage={showStatusMessage}
            />
          )}

          {runningInTauri && activeTab === 'backup' && (
            <React.Suspense fallback={null}>
              <BackupSettingsTab
                config={config}
                onUpdateConfig={onUpdateConfig}
                onResetDefaults={onResetDefaults}
                onStatusMessage={showStatusMessage}
              />
            </React.Suspense>
          )}

          {runningInTauri && activeTab === 'mcp' && (
            <React.Suspense fallback={null}>
              <McpSettingsTab
                config={config}
                onUpdateConfig={onUpdateConfig}
                mcpStatus={mcpStatus}
                mcpError={mcpError}
                mcpLogs={mcpLogs}
                mcpConnectedCapabilities={mcpConnectedCapabilities}
                onClearMcpLogs={onClearMcpLogs}
                onReconnectMcp={onReconnectMcp}
              />
            </React.Suspense>
          )}

          {activeTab === 'shortcuts' && (
            <ShortcutsSettingsPanel
              shortcuts={config.shortcuts || DEFAULT_SHORTCUTS}
              customToolShortcuts={config.customToolShortcuts || []}
              onChangeShortcuts={next => onUpdateConfig({ ...config, shortcuts: next })}
              onChangeCustomToolShortcuts={next =>
                onUpdateConfig({ ...config, customToolShortcuts: next })
              }
            />
          )}

          {activeTab === 'language' && (
            <LanguageSettingsTab config={config} onUpdateConfig={onUpdateConfig} />
          )}

          {runningInTauri && activeTab === 'updates' && (
            <React.Suspense fallback={null}>
              <UpdatesSettingsTab
                externalUpdateResult={externalUpdateResult}
                onExternalUpdateResultChange={onExternalUpdateResultChange}
              />
            </React.Suspense>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex flex-wrap items-center gap-3 px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 shrink-0 relative z-10 ${
            runningInTauri ? 'justify-between' : 'justify-end'
          }`}
        >
          {runningInTauri && (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={OMNIDESK_PROJECT_WEB_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => {
                  e.preventDefault();
                  void openExternalUrl(OMNIDESK_PROJECT_WEB_URL);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                title={`${t('desktop_link_web', 'Project Website')} (${OMNIDESK_PROJECT_WEB_URL})`}
              >
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('desktop_link_web', 'Project Website')}</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
              <a
                href={OMNIDESK_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => {
                  e.preventDefault();
                  void openExternalUrl(OMNIDESK_GITHUB_URL);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                title={`${t('desktop_link_github', 'GitHub')} (${OMNIDESK_GITHUB_URL})`}
              >
                <span>{t('desktop_link_github', 'GitHub')}</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </div>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            {t('close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
