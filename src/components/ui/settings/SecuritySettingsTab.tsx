import React, { useState, useEffect, useCallback } from 'react';
import { KeyRound, Lock, Trash2, Unlock, WifiOff } from 'lucide-react';
import { UserConfig } from '../../../types/tool';
import { useI18n } from '../../../i18n/context';
import {
  getStorageAuditAsync,
  hashMasterKey,
  purgeSensitiveDataAsync,
  StorageAuditItem,
} from '../../../services/securityService';
import { DEFAULT_WIDGETS_CONFIG } from './settingsConstants';

interface SecuritySettingsTabProps {
  config: UserConfig;
  runningInTauri: boolean;
  onUpdateConfig: (newConfig: UserConfig) => void;
  onClose: () => void;
  onLockNow?: () => void;
  onStatusMessage: (status: { success: boolean; message: string }) => void;
}

export const SecuritySettingsTab: React.FC<SecuritySettingsTabProps> = ({
  config,
  runningInTauri,
  onUpdateConfig,
  onClose,
  onLockNow,
  onStatusMessage,
}) => {
  const { t } = useI18n();
  const currentWidgets = config.widgets || DEFAULT_WIDGETS_CONFIG;
  const [newPin, setNewPin] = useState('');
  const [newPinHint, setNewPinHint] = useState(config.security?.securityHint || '');
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [auditItems, setAuditItems] = useState<StorageAuditItem[]>([]);

  const refreshAudit = useCallback(async () => {
    const items = await getStorageAuditAsync();
    setAuditItems(items);
  }, []);

  useEffect(() => {
    void refreshAudit();
  }, [refreshAudit]);

  const handleSaveMasterPin = async () => {
    if (newPin.trim().length < 4) {
      onStatusMessage({
        success: false,
        message: t('pin_min_length_error', 'PIN or passphrase must be at least 4 characters.'),
      });
      return;
    }
    const { hashHex, saltHex } = await hashMasterKey(newPin.trim());
    onUpdateConfig({
      ...config,
      security: {
        lockEnabled: true,
        pinHash: hashHex,
        pinSalt: saltHex,
        autoLockMinutes: config.security?.autoLockMinutes ?? 0,
        lockOnBlur: Boolean(config.security?.lockOnBlur),
        securityHint: newPinHint.trim() || undefined,
      },
    });
    setNewPin('');
    onStatusMessage({
      success: true,
      message: t('security_lock_enabled_msg', 'Workspace PIN / passphrase lock saved.'),
    });
  };

  const handleDisableMasterPin = () => {
    onUpdateConfig({
      ...config,
      security: {
        lockEnabled: false,
        autoLockMinutes: 0,
        lockOnBlur: false,
        pinHash: undefined,
        pinSalt: undefined,
        securityHint: undefined,
      },
    });
    setNewPin('');
    setNewPinHint('');
    onStatusMessage({
      success: true,
      message: t('security_lock_disabled_msg', 'Workspace lock disabled.'),
    });
  };

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
          {runningInTauri
            ? t('security_privacy_title', 'Workspace Lock, Offline Simulation & Storage Audit')
            : t('security_privacy_title_web', 'Offline Simulation & Local Storage Audit')}
        </h3>
        <p className="text-xs text-slate-400">
          {runningInTauri
            ? t('security_privacy_desc', 'Protect your local workspace with PBKDF2-SHA256 PIN verification and inspect local browser storage.')
            : t('security_privacy_desc_web', 'Simulate offline mode and inspect or purge local browser storage.')}
        </p>
      </div>

      {runningInTauri && (
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {config.security?.lockEnabled ? (
                <Lock className="w-4 h-4 text-emerald-400" />
              ) : (
                <Unlock className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-xs font-semibold text-white">
                {t('master_pin_lock', 'Master PIN / Passphrase Lock')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono ${
                  config.security?.lockEnabled ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {config.security?.lockEnabled ? t('enabled', 'Enabled') : t('disabled', 'Disabled')}
              </span>
              {config.security?.lockEnabled && onLockNow && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLockNow();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-colors"
                >
                  {t('lock_workspace_now', 'Lock Workspace')}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-300 block">
                {config.security?.lockEnabled
                  ? t('new_pin_label', 'New PIN / Passphrase (min 4 chars)')
                  : t('set_pin_label', 'Set PIN / Passphrase (min 4 chars)')}
              </label>
              <input
                type="password"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="••••"
                className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-300 block">
                {t('security_hint_label', 'Optional Hint')}
              </label>
              <input
                type="text"
                value={newPinHint}
                onChange={e => setNewPinHint(e.target.value)}
                placeholder={t('security_hint_placeholder', 'e.g. Favorite year + city')}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs text-slate-300 block">
                {t('auto_lock_label', 'Auto-Lock Inactivity Timeout')}
              </label>
              <select
                value={config.security?.autoLockMinutes ?? 0}
                onChange={e =>
                  onUpdateConfig({
                    ...config,
                    security: {
                      lockEnabled: Boolean(config.security?.lockEnabled),
                      pinHash: config.security?.pinHash,
                      pinSalt: config.security?.pinSalt,
                      securityHint: config.security?.securityHint,
                      lockOnBlur: Boolean(config.security?.lockOnBlur),
                      autoLockMinutes: Number(e.target.value),
                    },
                  })
                }
                disabled={!config.security?.lockEnabled}
                className="w-full text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white disabled:opacity-50"
              >
                <option value={0}>{t('auto_lock_never', 'Never')}</option>
                <option value={5}>{t('auto_lock_5m', '5 minutes')}</option>
                <option value={15}>{t('auto_lock_15m', '15 minutes')}</option>
                <option value={30}>{t('auto_lock_30m', '30 minutes')}</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2.5 p-2.5 w-full rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(config.security?.lockOnBlur)}
                  disabled={!config.security?.lockEnabled}
                  onChange={e =>
                    onUpdateConfig({
                      ...config,
                      security: {
                        lockEnabled: Boolean(config.security?.lockEnabled),
                        pinHash: config.security?.pinHash,
                        pinSalt: config.security?.pinSalt,
                        securityHint: config.security?.securityHint,
                        autoLockMinutes: config.security?.autoLockMinutes ?? 0,
                        lockOnBlur: e.target.checked,
                      },
                    })
                  }
                  className="accent-indigo-500"
                />
                <span>{t('lock_on_blur_label', 'Lock when tab loses focus')}</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleSaveMasterPin()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{t('save_pin_btn', 'Save PIN Lock')}</span>
            </button>
            {config.security?.lockEnabled && (
              <button
                type="button"
                onClick={handleDisableMasterPin}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                {t('disable_pin_btn', 'Disable Lock')}
              </button>
            )}
          </div>
        </div>
      )}

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

        <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/80 border border-slate-800 rounded-lg bg-slate-900/40">
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
