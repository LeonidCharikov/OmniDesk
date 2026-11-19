import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, WifiOff } from 'lucide-react';
import { UserConfig } from '../../../types/tool';
import { useI18n } from '../../../i18n/context';
import {
  getStorageAuditAsync,
  purgeSensitiveDataAsync,
  StorageAuditItem,
} from '../../../services/securityService';
import { DEFAULT_WIDGETS_CONFIG } from './settingsConstants';

interface SecuritySettingsTabProps {
  config: UserConfig;
  onUpdateConfig: (newConfig: UserConfig) => void;
  onStatusMessage: (status: { success: boolean; message: string }) => void;
}

export const SecuritySettingsTab: React.FC<SecuritySettingsTabProps> = ({
  config,
  onUpdateConfig,
  onStatusMessage,
}) => {
  const { t } = useI18n();
  const currentWidgets = config.widgets || DEFAULT_WIDGETS_CONFIG;
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [auditItems, setAuditItems] = useState<StorageAuditItem[]>([]);

  const refreshAudit = useCallback(async () => {
    const items = await getStorageAuditAsync();
    setAuditItems(items);
  }, []);

  useEffect(() => {
    void refreshAudit();
  }, [refreshAudit]);

  const handlePurgeSensitive = async () => {
    await purgeSensitiveDataAsync();
    onUpdateConfig({
      ...config,
      widgets: {
        ...currentWidgets,
        quickNote: '',
        dailyTasks: [],
      },
    });
    setConfirmPurge(false);
    await refreshAudit();
    onStatusMessage({
      success: true,
      message: t('privacy_purge_done', 'Local notes, scratchpads, and daily tasks purged.'),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white">
          {t('security_privacy_title_web', 'Offline Simulation & Local Storage Audit')}
        </h3>
        <p className="text-xs text-slate-400">
          {t('security_privacy_desc_web', 'Simulate offline mode and inspect or purge local browser storage.')}
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-amber-400">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white block">
              {t('simulate_offline_title', 'Simulate Offline Mode')}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {t('simulate_offline_desc', 'Test how OmniDesk behaves without network connectivity by locking online-only tools.')}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            onUpdateConfig({
              ...config,
              simulatedOffline: !config.simulatedOffline,
            })
          }
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
            config.simulatedOffline
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          {config.simulatedOffline ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
        </button>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-semibold text-white">
              {t('storage_audit_title', 'Local Storage Privacy Audit')}
            </h4>
            <p className="text-[11px] text-slate-400">
              {t('storage_audit_desc', 'Inspect keys stored locally on this device and purge sensitive scratchpads or tasks.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshAudit()}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
          >
            {t('refresh', 'Refresh')}
          </button>
        </div>

        <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/80 border border-slate-800 rounded-lg bg-slate-900/40">
          {auditItems.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 text-center">
              {t('storage_audit_empty', 'No local storage entries detected.')}
            </div>
          ) : (
            auditItems.map(item => (
              <div key={item.key} className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <span className="font-mono text-slate-200 block truncate">{item.key}</span>
                  <span className="text-[10px] text-slate-500 uppercase">
                    {item.category} · {item.source === 'indexedDB' ? 'IndexedDB' : 'localStorage'}
                  </span>
                </div>
                <span className="font-mono text-slate-400 tabular-nums shrink-0">
                  {item.bytes < 1024 ? `${item.bytes} B` : `${(item.bytes / 1024).toFixed(1)} KB`}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500">
            {t('storage_total_keys', '{count} keys stored locally', { count: auditItems.length })}
          </span>
          {!confirmPurge ? (
            <button
              type="button"
              onClick={() => setConfirmPurge(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-800/40 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('purge_sensitive_btn', 'Purge Notes & Tasks')}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmPurge(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handlePurgeSensitive()}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                {t('confirm_purge_btn', 'Confirm Purge')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
