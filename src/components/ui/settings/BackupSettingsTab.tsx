import React, { useRef, useState } from 'react';
import { Archive, Check, Copy, Download, FileJson, Lock, RefreshCw, Upload } from 'lucide-react';
import { UserConfig } from '../../../types/tool';
import { SupportedLanguage, useI18n } from '../../../i18n/context';
import { validateConfigJson } from '../../../services/storage';
import { saveTextWithDialog } from '../../../services/fileSystemService';
import { toastService } from '../../../services/toastService';
import {
  buildFullWorkspaceBackupAsync,
  isFullWorkspaceBackup,
  restoreFullWorkspaceBackupAsync,
} from '../../../services/workspaceBackupService';
import { decryptJsonPayload, encryptJsonPayload } from '../../../services/securityService';

interface BackupSettingsTabProps {
  config: UserConfig;
  onUpdateConfig: (newConfig: UserConfig) => void;
  onResetDefaults: () => void;
  onStatusMessage: (status: { success: boolean; message: string }, durationMs?: number) => void;
}

export const BackupSettingsTab: React.FC<BackupSettingsTabProps> = ({
  config,
  onUpdateConfig,
  onResetDefaults,
  onStatusMessage,
}) => {
  const { t, setLanguage } = useI18n();
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const jsonExportPayload: UserConfig = {
    ...config,
    version: 2,
    exportedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(jsonExportPayload, null, 2);
  const previewJsonString = JSON.stringify(
    {
      ...jsonExportPayload,
      mcp: jsonExportPayload.mcp
        ? {
            ...jsonExportPayload.mcp,
            authToken: jsonExportPayload.mcp.authToken ? '••••••••' : undefined,
          }
        : undefined,
    },
    null,
    2
  );

  const downloadConfigFile = async () => {
    const defaultName = `omnidesk-profile-${new Date().toISOString().slice(0, 10)}.json`;
    const res = await saveTextWithDialog(
      defaultName,
      jsonString,
      [
        { name: `${t('json_file_label', 'JSON File')} (*.json)`, extensions: ['json'] },
        { name: `${t('all_files', 'All Files')} (*.*)`, extensions: ['*'] },
      ],
      t('save_profile_title', 'Save Configuration Profile')
    );
    if (res.success) {
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    }
  };

  const copyConfigJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const restoreFromCandidateJson = async (
    candidateText: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const parsed = JSON.parse(candidateText);
      if (isFullWorkspaceBackup(parsed)) {
        const res = await restoreFullWorkspaceBackupAsync(parsed);
        if (res.valid && res.config) {
          if (res.config.language && ['cs', 'en', 'de', 'es', 'ru'].includes(res.config.language)) {
            setLanguage(res.config.language as SupportedLanguage);
          }
          onUpdateConfig(res.config);
          return {
            success: true,
            message: t('full_workspace_restored_msg', 'Full workspace and tool data restored ({count} stores).', {
              count: res.restoredKeys,
            }),
          };
        }
        return {
          success: false,
          message: res.error || t('import_parse_error', 'Failed to read JSON file.'),
        };
      }
    } catch {
      // Fall through to standard config validation
    }

    const res = validateConfigJson(candidateText);
    if (res.valid && res.config) {
      if (res.config.language && ['cs', 'en', 'de', 'es', 'ru'].includes(res.config.language)) {
        setLanguage(res.config.language as SupportedLanguage);
      }
      onUpdateConfig(res.config);
      return {
        success: true,
        message: t('config_imported_success', 'Configuration loaded from file successfully!'),
      };
    }

    return {
      success: false,
      message: res.error || t('import_parse_error', 'Failed to read JSON file.'),
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const text = event.target?.result as string;
      let candidateText = text;
      try {
        const maybeEncrypted = JSON.parse(text);
        if (maybeEncrypted && maybeEncrypted.omnidesk_encrypted) {
          if (!backupPassword) {
            onStatusMessage(
              {
                success: false,
                message: t(
                  'backup_password_required_import',
                  'Enter the backup decryption passphrase first, then re-select the encrypted file.'
                ),
              },
              5000
            );
            return;
          }
          const decrypted = await decryptJsonPayload(text, backupPassword);
          candidateText = JSON.stringify(decrypted);
        }
      } catch (err) {
        if (text.includes('"omnidesk_encrypted"')) {
          onStatusMessage({
            success: false,
            message:
              err instanceof Error
                ? err.message
                : t('backup_decrypt_failed', 'Failed to decrypt encrypted backup.'),
          });
          return;
        }
      }

      const outcome = await restoreFromCandidateJson(candidateText);
      onStatusMessage(outcome);
      toastService.show({
        type: outcome.success ? 'success' : 'error',
        title: outcome.message,
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadFullWorkspaceFile = async () => {
    const fullPayload = await buildFullWorkspaceBackupAsync(config);
    const defaultName = `omnidesk-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    const res = await saveTextWithDialog(
      defaultName,
      JSON.stringify(fullPayload, null, 2),
      [
        { name: `${t('json_file_label', 'JSON File')} (*.json)`, extensions: ['json'] },
        { name: `${t('all_files', 'All Files')} (*.*)`, extensions: ['*'] },
      ],
      t('save_full_workspace_title', 'Export Full Workspace Backup')
    );
    if (res.success) {
      const msg = t('full_workspace_exported_msg', 'Full workspace backup saved ({count} local stores).', {
        count: Object.keys(fullPayload.storageData).length,
      });
      toastService.show({ type: 'success', title: msg });
    }
  };

  const downloadEncryptedBackup = async (fullWorkspace = false) => {
    if (!backupPassword.trim()) {
      onStatusMessage({
        success: false,
        message: t('backup_password_required', 'Please enter a passphrase to encrypt your backup.'),
      });
      return;
    }
    const payload = fullWorkspace ? await buildFullWorkspaceBackupAsync(config) : jsonExportPayload;
    const encrypted = await encryptJsonPayload(payload, backupPassword);
    const defaultName = fullWorkspace
      ? `omnidesk-workspace-${new Date().toISOString().slice(0, 10)}.enc.json`
      : `omnidesk-profile-${new Date().toISOString().slice(0, 10)}.enc.json`;
    const res = await saveTextWithDialog(
      defaultName,
      encrypted,
      [
        { name: `${t('encrypted_backup_file', 'Encrypted Profile')} (*.json)`, extensions: ['json'] },
        { name: `${t('all_files', 'All Files')} (*.*)`, extensions: ['*'] },
      ],
      t('save_encrypted_profile_title', 'Save Encrypted Configuration Profile')
    );
    if (res.success) {
      const msg = t('encrypted_backup_saved', 'AES-256-GCM encrypted profile backup saved.');
      onStatusMessage({ success: true, message: msg });
      toastService.show({ type: 'success', title: msg });
    }
  };

  const handleApplyPastedJson = async () => {
    const outcome = await restoreFromCandidateJson(pastedJson);
    if (outcome.success) {
      setPastedJson('');
      setShowPasteArea(false);
    }
    onStatusMessage(outcome);
    toastService.show({
      type: outcome.success ? 'success' : 'error',
      title: outcome.message,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-white">
          {t('backup_and_migration', 'Backup & Configuration Migration Across Devices')}
        </h3>
        <p className="text-xs text-slate-400">
          {t('backup_desc', 'Export your settings into a standard JSON file or transfer them easily to another computer.')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => void downloadConfigFile()}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
        >
          {downloaded ? <Check className="w-4 h-4 text-emerald-300" /> : <Download className="w-4 h-4" />}
          <span>{downloaded ? t('downloaded', 'Downloaded!') : t('download_json_backup', 'Download .json Backup')}</span>
        </button>

        <button
          onClick={copyConfigJson}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? t('copied_to_clipboard', 'Copied!') : t('copy_json_clipboard', 'Copy JSON to Clipboard')}</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
        >
          <Upload className="w-4 h-4 text-indigo-400" />
          <span>{t('import_json_file', 'Import & Restore from .json File')}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="hidden"
        />

        <button
          onClick={() => setShowPasteArea(!showPasteArea)}
          className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
        >
          <FileJson className="w-4 h-4 text-amber-400" />
          <span>{showPasteArea ? t('hide_paste_area', 'Hide Text Paste Area') : t('paste_json_text', 'Paste JSON Text')}</span>
        </button>
      </div>

      {showPasteArea && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fade-in">
          <label className="text-xs font-semibold text-slate-300 block">
            {t('paste_json_label', 'Paste profile JSON code:')}
          </label>
          <textarea
            value={pastedJson}
            onChange={e => setPastedJson(e.target.value)}
            placeholder='{"version": 2, "themeId": "midnight", ...}'
            rows={6}
            className="w-full text-xs font-mono p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => void handleApplyPastedJson()}
              disabled={!pastedJson.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
            >
              {t('apply_configuration', 'Apply Configuration')}
            </button>
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-indigo-400" />
          <div>
            <h4 className="text-xs font-semibold text-white">
              {t('full_workspace_backup_title', 'Full Workspace Backup (Settings + Calendar + Notes + Tools)')}
            </h4>
            <p className="text-[11px] text-slate-400">
              {t(
                'full_workspace_backup_desc',
                'Includes all local tool data (Calendar, Kanban, Notes, Expenses, Habits, Shopping List, Flashcards) alongside your profile settings. Import above restores both formats automatically.'
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void downloadFullWorkspaceFile()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('export_full_workspace_btn', 'Export Full Workspace (.json)')}</span>
          </button>
          <button
            type="button"
            onClick={() => void downloadEncryptedBackup(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t('export_encrypted_workspace_btn', 'Export Encrypted Workspace')}</span>
          </button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-semibold text-white">
            {t('encrypted_backup_title', 'Encrypted Profile Backup (AES-256-GCM)')}
          </h4>
        </div>
        <p className="text-[11px] text-slate-400">
          {t('encrypted_backup_desc', 'Protect exported backups with a passphrase using PBKDF2-SHA256 + AES-256-GCM. Enter the same passphrase before importing an encrypted file.')}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="password"
            value={backupPassword}
            onChange={e => setBackupPassword(e.target.value)}
            placeholder={t('encrypted_backup_passphrase', 'Backup encryption / decryption passphrase...')}
            className="flex-1 text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => void downloadEncryptedBackup(false)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('download_encrypted_backup', 'Export Encrypted')}</span>
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {t('current_json_preview', 'Current Configuration (Live JSON)')}
        </span>
        <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-40">
          {previewJsonString}
        </pre>
      </div>

      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-slate-300 block">
            {t('factory_reset', 'Factory Reset')}
          </span>
          <span className="text-[11px] text-slate-500 block">
            {t('factory_reset_desc', 'Restore default color theme, widgets, and language')}
          </span>
        </div>
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('reset_defaults', 'Reset Defaults')}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmReset(false);
                onResetDefaults();
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
            >
              {t('confirm_reset_btn', 'Confirm Reset')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
