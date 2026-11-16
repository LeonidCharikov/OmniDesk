import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  HardDrive,
  Check,
  RefreshCw,
  Sliders,
  AlertCircle,
  Copy,
  FileJson,
  Palette,
  Clock,
  Coins,
  FileEdit,
  Cpu,
  Globe,
  CheckSquare,
  Calculator,
  ShieldCheck,
  Lock,
  Unlock,
  WifiOff,
  Trash2,
  KeyRound,
  Plug,
  Keyboard,
  Sparkles,
  Archive,
} from 'lucide-react';
import { UserConfig, ThemeId, McpBridgeConfig } from '../../types/tool';
import { useI18n, SupportedLanguage } from '../../i18n/context';
import { THEMES } from '../../services/themes';
import { DEFAULT_MCP, validateConfigJson } from '../../services/storage';
import { invokeRustCommand, isTauri, saveTextWithDialog } from '../../services/fileSystemService';
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
import { ShortcutsSettingsPanel } from './ShortcutsSettingsPanel';
import { LanguageFlagIcon } from './LanguageFlagIcon';
import { DEFAULT_SHORTCUTS } from '../../services/shortcutsService';
import { toastService } from '../../services/toastService';
import {
  buildFullWorkspaceBackup,
  isFullWorkspaceBackup,
  restoreFullWorkspaceBackup,
} from '../../services/workspaceBackupService';
import { WORKSPACE_PRESETS, applyWorkspacePreset } from '../../services/workspacePresetsService';
import {
  hashMasterKey,
  encryptJsonPayload,
  decryptJsonPayload,
  getStorageAudit,
  purgeSensitiveData,
  StorageAuditItem,
} from '../../services/securityService';

export type ConfigTabType = 'themes' | 'currency' | 'widgets' | 'security' | 'mcp' | 'shortcuts' | 'backup' | 'language';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: UserConfig;
  onUpdateConfig: (newConfig: UserConfig) => void;
  onResetDefaults: () => void;
  onLockNow?: () => void;
  initialTab?: ConfigTabType;
  mcpStatus?: McpConnectionStatus;
  mcpError?: string;
  mcpLogs?: McpLogEntry[];
  mcpConnectedCapabilities?: McpConnectedToolCapability[];
  onClearMcpLogs?: () => void;
  onReconnectMcp?: () => void;
}

type TabType = ConfigTabType;

const ALL_CURRENCIES = [
  { code: 'CZK', name: 'Česká koruna', flag: '🇨🇿', symbol: 'Kč' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', symbol: '€' },
  { code: 'USD', name: 'Americký dolar', flag: '🇺🇸', symbol: '$' },
  { code: 'GBP', name: 'Britská libra', flag: '🇬🇧', symbol: '£' },
  { code: 'CHF', name: 'Švýcarský frank', flag: '🇨🇭', symbol: 'CHF' },
  { code: 'PLN', name: 'Polský zlotý', flag: '🇵🇱', symbol: 'zł' },
  { code: 'JPY', name: 'Japonský jen', flag: '🇯🇵', symbol: '¥' },
  { code: 'CAD', name: 'Kanadský dolar', flag: '🇨🇦', symbol: 'C$' },
  { code: 'AUD', name: 'Australský dolar', flag: '🇦🇺', symbol: 'A$' },
  { code: 'HUF', name: 'Maďarský forint', flag: '🇭🇺', symbol: 'Ft' },
  { code: 'SEK', name: 'Švédská koruna', flag: '🇸🇪', symbol: 'kr' },
  { code: 'NOK', name: 'Norská koruna', flag: '🇳🇴', symbol: 'kr' },
  { code: 'DKK', name: 'Dánská koruna', flag: '🇩🇰', symbol: 'kr' },
  { code: 'RUB', name: 'Ruský rubl', flag: '🇷🇺', symbol: '₽' },
];

const CITIES = [
  { id: 'Europe/Prague', name: 'Praha', label: '🇨🇿 Praha (UTC+1)' },
  { id: 'Europe/London', name: 'Londýn', label: '🇬🇧 Londýn (UTC+0)' },
  { id: 'America/New_York', name: 'New York', label: '🇺🇸 New York (UTC-5)' },
  { id: 'Asia/Tokyo', name: 'Tokio', label: '🇯🇵 Tokio (UTC+9)' },
  { id: 'Europe/Moscow', name: 'Moskva', label: '🇷🇺 Moskva (UTC+3)' },
  { id: 'Asia/Dubai', name: 'Dubaj', label: '🇦🇪 Dubaj (UTC+4)' },
  { id: 'Australia/Sydney', name: 'Sydney', label: '🇦🇺 Sydney (UTC+11)' },
  { id: 'Asia/Singapore', name: 'Singapur', label: '🇸🇬 Singapur (UTC+8)' },
  { id: 'America/Los_Angeles', name: 'Los Angeles', label: '🇺🇸 Los Angeles (UTC-8)' },
  { id: 'Europe/Paris', name: 'Paříž', label: '🇫🇷 Paříž (UTC+1)' },
  { id: 'Europe/Berlin', name: 'Berlín', label: '🇩🇪 Berlín (UTC+1)' },
];

const CITY_NAMES: Record<string, Record<'cs' | 'en' | 'de' | 'es' | 'ru', string>> = {
  'Europe/Prague': { cs: 'Praha', en: 'Prague', de: 'Prag', es: 'Praga', ru: 'Прага' },
  'Europe/London': { cs: 'Londýn', en: 'London', de: 'London', es: 'Londres', ru: 'Лондон' },
  'America/New_York': { cs: 'New York', en: 'New York', de: 'New York', es: 'Nueva York', ru: 'Нью-Йорк' },
  'Asia/Tokyo': { cs: 'Tokio', en: 'Tokyo', de: 'Tokio', es: 'Tokio', ru: 'Токио' },
  'Europe/Moscow': { cs: 'Moskva', en: 'Moscow', de: 'Moskau', es: 'Moscú', ru: 'Москва' },
  'Asia/Dubai': { cs: 'Dubaj', en: 'Dubai', de: 'Dubai', es: 'Dubái', ru: 'Дубай' },
  'Australia/Sydney': { cs: 'Sydney', en: 'Sydney', de: 'Sydney', es: 'Sídney', ru: 'Сидней' },
  'Asia/Singapore': { cs: 'Singapur', en: 'Singapore', de: 'Singapur', es: 'Singapur', ru: 'Сингапур' },
  'America/Los_Angeles': { cs: 'Los Angeles', en: 'Los Angeles', de: 'Los Angeles', es: 'Los Ángeles', ru: 'Лос-Анджелес' },
  'Europe/Paris': { cs: 'Paříž', en: 'Paris', de: 'Paris', es: 'París', ru: 'Париж' },
  'Europe/Berlin': { cs: 'Berlín', en: 'Berlin', de: 'Berlin', es: 'Berlín', ru: 'Берлин' },
};

const FIATS = [
  { code: 'CZK', name: 'Česká koruna (CZK)' },
  { code: 'EUR', name: 'Euro (EUR)' },
  { code: 'USD', name: 'Americký dolar (USD)' },
  { code: 'RUB', name: 'Ruský rubl (RUB)' },
  { code: 'GBP', name: 'Britská libra (GBP)' },
  { code: 'CHF', name: 'Švýcarský frank (CHF)' },
  { code: 'PLN', name: 'Polský zlotý (PLN)' },
  { code: 'JPY', name: 'Japonský jen (JPY)' },
];

const CURRENCY_NAMES: Record<string, Record<'cs' | 'en' | 'de' | 'es' | 'ru', string>> = {
  CZK: { cs: 'Česká koruna', en: 'Czech koruna', de: 'Tschechische Krone', es: 'Corona checa', ru: 'Чешская крона' },
  EUR: { cs: 'Euro', en: 'Euro', de: 'Euro', es: 'Euro', ru: 'Евро' },
  USD: { cs: 'Americký dolar', en: 'US dollar', de: 'US-Dollar', es: 'Dólar estadounidense', ru: 'Доллар США' },
  GBP: { cs: 'Britská libra', en: 'British pound', de: 'Britisches Pfund', es: 'Libra esterlina', ru: 'Британский фунт' },
  CHF: { cs: 'Švýcarský frank', en: 'Swiss franc', de: 'Schweizer Franken', es: 'Franco suizo', ru: 'Швейцарский франк' },
  PLN: { cs: 'Polský zlotý', en: 'Polish zloty', de: 'Polnischer Złoty', es: 'Zloty polaco', ru: 'Польский злотый' },
  JPY: { cs: 'Japonský jen', en: 'Japanese yen', de: 'Japanischer Yen', es: 'Yen japonés', ru: 'Японская иена' },
  CAD: { cs: 'Kanadský dolar', en: 'Canadian dollar', de: 'Kanadischer Dollar', es: 'Dólar canadiense', ru: 'Канадский доллар' },
  AUD: { cs: 'Australský dolar', en: 'Australian dollar', de: 'Australischer Dollar', es: 'Dólar australiano', ru: 'Австралийский доллар' },
  HUF: { cs: 'Maďarský forint', en: 'Hungarian forint', de: 'Ungarischer Forint', es: 'Forinto húngaro', ru: 'Венгерский форинт' },
  SEK: { cs: 'Švédská koruna', en: 'Swedish krona', de: 'Schwedische Krone', es: 'Corona sueca', ru: 'Шведская крона' },
  NOK: { cs: 'Norská koruna', en: 'Norwegian krone', de: 'Norwegische Krone', es: 'Corona noruega', ru: 'Норвежская крона' },
  DKK: { cs: 'Dánská koruna', en: 'Danish krone', de: 'Dänische Krone', es: 'Corona danesa', ru: 'Датская крона' },
  RUB: { cs: 'Ruský rubl', en: 'Russian ruble', de: 'Russischer Rubel', es: 'Rublo ruso', ru: 'Российский рубль' },
};

const CRYPTOS = [
  { code: 'BTC', name: 'Bitcoin (BTC)' },
  { code: 'ETH', name: 'Ethereum (ETH)' },
  { code: 'SOL', name: 'Solana (SOL)' },
  { code: 'TON', name: 'Toncoin (TON)' },
  { code: 'BNB', name: 'Binance Coin (BNB)' },
  { code: 'XRP', name: 'Ripple (XRP)' },
  { code: 'DOGE', name: 'Dogecoin (DOGE)' },
  { code: 'AVAX', name: 'Avalanche (AVAX)' },
];

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onResetDefaults,
  onLockNow,
  initialTab,
  mcpStatus = 'disconnected',
  mcpError,
  mcpLogs = [],
  mcpConnectedCapabilities = [],
  onClearMcpLogs,
  onReconnectMcp,
}) => {
  const { t, language, setLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'themes');
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinHint, setNewPinHint] = useState(config.security?.securityHint || '');
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [auditItems, setAuditItems] = useState<StorageAuditItem[]>(() => getStorageAudit());
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
      if (initialTab === 'security') {
        setAuditItems(getStorageAudit());
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const currentThemeId = config.themeId || 'midnight';
  const currentWidgets = config.widgets || {
    enabledWidgets: ['clock', 'timer', 'crypto', 'notes'],
    selectedCity: 'Europe/Prague',
    selectedCityName: 'Praha',
    selectedFiat: 'CZK',
    selectedCrypto: 'BTC',
    selectedCities: ['Europe/Prague'],
    selectedFiats: ['CZK'],
    selectedCryptos: ['BTC'],
    timerDurationMinutes: 25,
    quickNote: '',
  };
  const selectedCities = currentWidgets.selectedCities?.length ? currentWidgets.selectedCities : [currentWidgets.selectedCity];
  const selectedFiats = currentWidgets.selectedFiats?.length ? currentWidgets.selectedFiats : [currentWidgets.selectedFiat];
  const selectedCryptos = currentWidgets.selectedCryptos?.length ? currentWidgets.selectedCryptos : [currentWidgets.selectedCrypto];

  const jsonExportPayload: UserConfig = {
    ...config,
    version: 2,
    exportedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(jsonExportPayload, null, 2);

  const downloadConfigFile = async () => {
    const defaultName = `omnidesk-profile-${new Date().toISOString().slice(0, 10)}.json`;
    const res = await saveTextWithDialog(
      defaultName,
      jsonString,
      [
        { name: `${t('json_file_label', 'JSON File')} (*.json)`, extensions: ['json'] },
        { name: `${t('all_files', 'All Files')} (*.*)`, extensions: ['*'] }
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

  const restoreFromCandidateJson = (candidateText: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(candidateText);
      if (isFullWorkspaceBackup(parsed)) {
        const res = restoreFullWorkspaceBackup(parsed);
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
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      let candidateText = text;
      try {
        const maybeEncrypted = JSON.parse(text);
        if (maybeEncrypted && maybeEncrypted.omnidesk_encrypted) {
          if (!backupPassword) {
            setImportStatus({
              success: false,
              message: t('backup_password_required_import', 'Enter the backup decryption passphrase first, then re-select the encrypted file.'),
            });
            setTimeout(() => setImportStatus(null), 5000);
            return;
          }
          const decrypted = await decryptJsonPayload(text, backupPassword);
          candidateText = JSON.stringify(decrypted);
        }
      } catch (err) {
        if (text.includes('"omnidesk_encrypted"')) {
          setImportStatus({
            success: false,
            message: err instanceof Error ? err.message : t('backup_decrypt_failed', 'Failed to decrypt encrypted backup.'),
          });
          setTimeout(() => setImportStatus(null), 4000);
          return;
        }
      }

      const outcome = restoreFromCandidateJson(candidateText);
      setImportStatus(outcome);
      toastService.show({
        type: outcome.success ? 'success' : 'error',
        title: outcome.message,
      });
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadFullWorkspaceFile = async () => {
    const fullPayload = buildFullWorkspaceBackup(config);
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
      setImportStatus({
        success: false,
        message: t('backup_password_required', 'Please enter a passphrase to encrypt your backup.'),
      });
      setTimeout(() => setImportStatus(null), 4000);
      return;
    }
    const payload = fullWorkspace ? buildFullWorkspaceBackup(config) : jsonExportPayload;
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
      setImportStatus({
        success: true,
        message: msg,
      });
      toastService.show({ type: 'success', title: msg });
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  const handleSaveMasterPin = async () => {
    if (newPin.trim().length < 4) {
      setImportStatus({
        success: false,
        message: t('pin_min_length_error', 'PIN or passphrase must be at least 4 characters.'),
      });
      setTimeout(() => setImportStatus(null), 4000);
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
    setImportStatus({
      success: true,
      message: t('security_lock_enabled_msg', 'Workspace PIN / passphrase lock saved.'),
    });
    setTimeout(() => setImportStatus(null), 4000);
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
    setImportStatus({
      success: true,
      message: t('security_lock_disabled_msg', 'Workspace lock disabled.'),
    });
    setTimeout(() => setImportStatus(null), 4000);
  };

  const handlePurgeSensitive = () => {
    purgeSensitiveData();
    onUpdateConfig({
      ...config,
      widgets: {
        ...currentWidgets,
        quickNote: '',
        dailyTasks: [],
      },
    });
    setConfirmPurge(false);
    setAuditItems(getStorageAudit());
    setImportStatus({
      success: true,
      message: t('privacy_purge_done', 'Local notes, scratchpads, and daily tasks purged.'),
    });
    setTimeout(() => setImportStatus(null), 4000);
  };

  const handleApplyPastedJson = () => {
    const outcome = restoreFromCandidateJson(pastedJson);
    if (outcome.success) {
      setPastedJson('');
      setShowPasteArea(false);
    }
    setImportStatus(outcome);
    toastService.show({
      type: outcome.success ? 'success' : 'error',
      title: outcome.message,
    });
    setTimeout(() => setImportStatus(null), 4000);
  };

  const handleSelectTheme = (themeId: ThemeId) => {
    onUpdateConfig({
      ...config,
      themeId,
      theme: themeId === 'light' ? 'light' : 'dark',
    });
  };

  const toggleWidget = (widgetId: string) => {
    const currentEnabled = currentWidgets.enabledWidgets || [];
    const updated = currentEnabled.includes(widgetId)
      ? currentEnabled.filter(id => id !== widgetId)
      : [...currentEnabled, widgetId];

    onUpdateConfig({
      ...config,
      widgets: {
        ...currentWidgets,
        enabledWidgets: updated,
      },
      enabledWidgets: updated,
    });
  };

  const updateWidgetList = (key: 'selectedCities' | 'selectedFiats' | 'selectedCryptos', index: number, value: string) => {
    const source = key === 'selectedCities' ? selectedCities : key === 'selectedFiats' ? selectedFiats : selectedCryptos;
    const updated = [...source];
    updated[index] = value;
    const next = { ...currentWidgets, [key]: updated };
    if (key === 'selectedCities' && index === 0) {
      next.selectedCity = value;
      next.selectedCityName = CITIES.find(city => city.id === value)?.name || 'Prague';
    }
    if (key === 'selectedFiats' && index === 0) next.selectedFiat = value;
    if (key === 'selectedCryptos' && index === 0) next.selectedCrypto = value;
    onUpdateConfig({ ...config, widgets: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('settings_modal_title', 'OmniDesk Settings & Configurator')}
        className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[90vh] overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t('settings_modal_title', 'OmniDesk Settings & Configurator')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('settings_modal_subtitle', 'Color themes, sidebar widgets, and portable JSON profiles')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('close', 'Close')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div role="tablist" className="shrink-0 relative z-10 flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-3.5 border-b border-slate-800 bg-slate-950/30 overflow-x-auto">
          <button
            role="tab"
            aria-selected={activeTab === 'themes'}
            onClick={(e) => {
              setActiveTab('themes');
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'themes'
                ? 'text-indigo-300 border-indigo-500/50 bg-indigo-600/20 shadow-xs'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{t('tab_themes', 'Themes & Colors')}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'currency'}
            onClick={(e) => {
              setActiveTab('currency');
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'currency'
                ? 'text-indigo-300 border-indigo-500/50 bg-indigo-600/20 shadow-xs'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{t('tab_currency', 'Default Currency')}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'widgets'}
            onClick={(e) => {
              setActiveTab('widgets');
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'widgets'
                ? 'text-indigo-300 border-indigo-500/50 bg-indigo-600/20 shadow-xs'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('tab_widgets', 'Sidebar Widgets')}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'security'}
            onClick={(e) => {
              setActiveTab('security');
              setAuditItems(getStorageAudit());
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'security'
                ? 'text-indigo-300 border-indigo-500/50 bg-indigo-600/20 shadow-xs'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('tab_security', 'Security & Privacy')}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'mcp'}
            onClick={(e) => {
              setActiveTab('mcp');
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'mcp'
                ? 'text-indigo-300 border-indigo-500/50 bg-indigo-600/20 shadow-xs'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Plug className="w-3.5 h-3.5" />
            <span>{t('tab_mcp', 'MCP Bridge')}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'shortcuts'}
            onClick={(e) => {
              setActiveTab('shortcuts');
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'shortcuts'
                ? 'text-indigo-300 border-indigo-500/50 bg-indigo-600/20 shadow-xs'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{t('tab_shortcuts', 'Shortcuts')}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'backup'}
            onClick={(e) => {
              setActiveTab('backup');
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'backup'
                ? 'text-indigo-300 border-indigo-500/50 bg-indigo-600/20 shadow-xs'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{t('tab_backup', 'Backup & JSON Export/Import')}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'language'}
            onClick={(e) => {
              setActiveTab('language');
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
            }}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'language'
                ? 'text-indigo-300 border-indigo-500/50 bg-indigo-600/20 shadow-xs'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t('tab_language', 'Language')}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {importStatus && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs animate-fade-in ${
                importStatus.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {importStatus.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span className="font-medium">{importStatus.message}</span>
            </div>
          )}

          {/* TAB 1: THEMES & COLORS */}
          {activeTab === 'themes' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {t('choose_color_theme', 'Choose Application Theme')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('theme_description', 'Customize contrast, tint, and overall aesthetics of the OmniDesk workspace.')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {THEMES.map((th) => {
                  const isSelected = currentThemeId === th.id;
                  return (
                    <div
                      key={th.id}
                      onClick={() => handleSelectTheme(th.id)}
                      className={`cursor-pointer p-3.5 rounded-xl border transition-all relative group flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/20'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-white">
                          {t(th.nameKey, th.defaultName)}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      {/* Theme Preview Card */}
                      <div
                        className="w-full h-14 rounded-lg border p-2 flex flex-col justify-between"
                        style={{
                          backgroundColor: th.previewBg,
                          borderColor: th.previewBorder,
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: th.previewAccent }}
                          />
                          <div
                            className="h-1.5 w-12 rounded"
                            style={{ backgroundColor: th.previewBorder }}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <div
                            className="h-1.5 w-6 rounded"
                            style={{ backgroundColor: th.previewAccent }}
                          />
                          <div
                            className="h-1.5 w-16 rounded"
                            style={{ backgroundColor: th.previewBorder }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Workspace Starter Presets */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      {t('workspace_presets_title', 'Workspace Starter Presets')}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {t('workspace_presets_desc', 'Configure pinned favorites and sidebar widgets for your workflow in one click.')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {WORKSPACE_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        onUpdateConfig(applyWorkspacePreset(config, preset.id));
                        toastService.show({
                          type: 'success',
                          title: t('workspace_preset_applied', 'Applied "{name}" preset', {
                            name: t(preset.nameKey, preset.defaultName),
                          }),
                        });
                      }}
                      className="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 text-left transition-colors"
                    >
                      <span className="text-xs font-semibold text-white block">
                        {t(preset.nameKey, preset.defaultName)}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                        {t(preset.descKey, preset.defaultDesc)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DEFAULT CURRENCY */}
          {activeTab === 'currency' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {t('choose_default_currency', 'Default Application Currency')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('currency_description', 'This currency will be preselected in currency converters, crypto calculators, and sidebar widgets.')}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-mono">
                  <span>{t('active_default_currency', 'Active default currency:')}</span>
                  <strong className="text-white font-bold">{config.defaultCurrency || 'CZK'}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ALL_CURRENCIES.map(curr => {
                  const isSelected = (config.defaultCurrency || 'CZK') === curr.code;
                  return (
                    <div
                      key={curr.code}
                      onClick={() => {
                        onUpdateConfig({
                          ...config,
                          defaultCurrency: curr.code,
                          widgets: {
                            ...currentWidgets,
                            selectedFiat: curr.code,
                          },
                        });
                      }}
                      className={`cursor-pointer p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/30'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{curr.flag}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white font-mono">{curr.code}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({curr.symbol})</span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">                          {CURRENCY_NAMES[curr.code]?.[language] || curr.name}</span>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-slate-700 bg-slate-900" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SIDEBAR WIDGETS */}
          {activeTab === 'widgets' && (
            <div className="space-y-6">
              {/* Widget Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {t('widgets_visibility', 'Active Mini Widgets in Sidebar')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {t('widgets_visibility_desc', 'Enable or disable individual mini panels.')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'clock',
                      title: t('widget_clock_title', 'Live Clock & World Time'),
                      desc: t('widget_clock_desc', 'Time and date for selected world cities'),
                      icon: <Clock className="w-4 h-4 text-indigo-400" />,
                    },
                    {
                      id: 'timer',
                      title: t('widget_timer_title', 'Quick Timer / Pomodoro'),
                      desc: t('widget_timer_desc', 'Quick 25m focus and break countdown'),
                      icon: <Sliders className="w-4 h-4 text-amber-400" />,
                    },
                    {
                      id: 'crypto',
                      title: t('widget_crypto_title', 'Exchange Rates & Crypto'),
                      desc: t('widget_crypto_desc', 'Track selected cryptocurrency and fiat currency'),
                      icon: <Coins className="w-4 h-4 text-emerald-400" />,
                    },
                    {
                      id: 'calc',
                      title: t('widget_calc_title', 'Quick Calculator & Unit Converter'),
                      desc: t('widget_calc_desc', 'Instant math calculations and unit conversions'),
                      icon: <Calculator className="w-4 h-4 text-indigo-400" />,
                    },
                    {
                      id: 'tasks',
                      title: t('widget_tasks_title', 'Daily Task Checklist'),
                      desc: t('widget_tasks_desc', 'Quick list of priorities and daily goals'),
                      icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
                    },
                    {
                      id: 'notes',
                      title: t('widget_notes_title', 'Quick Sticky Note'),
                      desc: t('widget_notes_desc', 'Instant notes right in the sidebar'),
                      icon: <FileEdit className="w-4 h-4 text-yellow-400" />,
                    },
                    {
                      id: 'system',
                      title: t('widget_system_title', 'System Hardware Gauge'),
                      desc: t('widget_system_desc', 'Compact CPU and RAM load indicator'),
                      icon: <Cpu className="w-4 h-4 text-cyan-400" />,
                    },
                  ].map((w) => {
                    const isEnabled = currentWidgets.enabledWidgets?.includes(w.id);
                    return (
                      <div
                        key={w.id}
                        onClick={() => toggleWidget(w.id)}
                        className={`cursor-pointer p-3 rounded-xl border flex items-center justify-between transition-all ${
                          isEnabled
                            ? 'bg-indigo-950/20 border-indigo-500/40'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            {w.icon}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-white block">
                              {w.title}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {w.desc}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isEnabled
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-slate-700 bg-slate-900'
                          }`}
                        >
                          {isEnabled && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customization Options: City, Fiat, Crypto */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  {t('widget_customization', 'Widget Content Customization')}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* City selector for Clock widget */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t('selected_city_for_clock', 'Clock Cities')}
                    </label>
                    <div className="space-y-1">
                      {Array.from({ length: 3 }, (_, index) => (
                        <select key={index} value={selectedCities[index] || selectedCities[0]} onChange={e => updateWidgetList('selectedCities', index, e.target.value)} className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500">
                          {CITIES.map(c => <option key={c.id} value={c.id}>{c.label.replace(c.name, CITY_NAMES[c.id]?.[language] || c.name)}</option>)}
                        </select>
                      ))}
                    </div>
                  </div>

                  {/* Fiat selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t('selected_fiat', 'Tracked Fiat Currency')}
                    </label>
                    <div className="space-y-1">
                      {Array.from({ length: 3 }, (_, index) => (
                        <select key={index} value={selectedFiats[index] || selectedFiats[0]} onChange={e => updateWidgetList('selectedFiats', index, e.target.value)} className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500">
                          {FIATS.map(f => <option key={f.code} value={f.code}>{CURRENCY_NAMES[f.code]?.[language] || f.name} ({f.code})</option>)}
                        </select>
                      ))}
                    </div>
                  </div>

                  {/* Crypto selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t('selected_crypto', 'Tracked Cryptocurrency')}
                    </label>
                    <div className="space-y-1">
                      {Array.from({ length: 3 }, (_, index) => (
                        <select key={index} value={selectedCryptos[index] || selectedCryptos[0]} onChange={e => updateWidgetList('selectedCryptos', index, e.target.value)} className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500">
                          {CRYPTOS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </select>
                      ))}
                      <label className="text-xs font-medium text-slate-300 sm:col-span-3">
                        {t('widget_timer_custom', 'Custom timer duration (minutes)')}
                        <input type="number" min="1" max="180" value={currentWidgets.timerDurationMinutes || 25} onChange={e => onUpdateConfig({ ...config, widgets: { ...currentWidgets, timerDurationMinutes: Math.min(180, Math.max(1, Number(e.target.value) || 1)) } })} className="mt-1 w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: SECURITY & PRIVACY */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {t('security_privacy_title', 'Workspace Lock, Offline Simulation & Storage Audit')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('security_privacy_desc', 'Protect your local workspace with PBKDF2-SHA256 PIN verification and inspect local browser storage.')}
                </p>
              </div>

              {/* Workspace PIN Lock */}
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
                    <span className={`text-xs font-mono ${config.security?.lockEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
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
                    onClick={handleSaveMasterPin}
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

              {/* Simulated Offline Mode */}
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

              {/* Storage Privacy Audit */}
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
                    onClick={() => setAuditItems(getStorageAudit())}
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
                          <span className="text-[10px] text-slate-500 uppercase">{item.category}</span>
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
                        onClick={handlePurgeSensitive}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                      >
                        {t('confirm_purge_btn', 'Confirm Purge')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP & JSON MIGRATION */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {t('backup_and_migration', 'Backup & Configuration Migration Across Devices')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('backup_desc', 'Export your settings into a standard JSON file or transfer them easily to another computer.')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={downloadConfigFile}
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

              {/* Paste JSON Area */}
              {showPasteArea && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fade-in">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {t('paste_json_label', 'Paste profile JSON code:')}
                  </label>
                  <textarea
                    value={pastedJson}
                    onChange={(e) => setPastedJson(e.target.value)}
                    placeholder='{"version": 2, "themeId": "midnight", ...}'
                    rows={6}
                    className="w-full text-xs font-mono p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleApplyPastedJson}
                      disabled={!pastedJson.trim()}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                    >
                      {t('apply_configuration', 'Apply Configuration')}
                    </button>
                  </div>
                </div>
              )}

              {/* Full Workspace Backup (All Tools + Settings) */}
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
                    onClick={downloadFullWorkspaceFile}
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

              {/* Encrypted Backup (AES-256-GCM) */}
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

              {/* JSON preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t('current_json_preview', 'Current Configuration (Live JSON)')}
                </span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-850 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-40">
                  {jsonString}
                </pre>
              </div>

              {/* Reset to Factory Defaults */}
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
          )}

          {/* TAB: MCP BRIDGE */}
          {activeTab === 'mcp' && (() => {
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
          })()}

          {/* TAB: SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <ShortcutsSettingsPanel
              shortcuts={config.shortcuts || DEFAULT_SHORTCUTS}
              customToolShortcuts={config.customToolShortcuts || []}
              onChangeShortcuts={next =>
                onUpdateConfig({
                  ...config,
                  shortcuts: next,
                })
              }
              onChangeCustomToolShortcuts={next =>
                onUpdateConfig({
                  ...config,
                  customToolShortcuts: next,
                })
              }
            />
          )}

          {/* TAB 4: LANGUAGE */}
          {activeTab === 'language' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {t('select_language', 'Select Interface Language')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('language_desc', 'OmniDesk supports 5 fully localized languages.')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { code: 'cs' as SupportedLanguage, label: 'Čeština', flag: '🇨🇿', sub: 'Czech' },
                  { code: 'ru' as SupportedLanguage, label: 'Русский', flag: '🇷🇺', sub: 'Russian' },
                  { code: 'en' as SupportedLanguage, label: 'English', flag: '🇬🇧', sub: 'Universal' },
                  { code: 'de' as SupportedLanguage, label: 'Deutsch', flag: '🇩🇪', sub: 'German' },
                  { code: 'es' as SupportedLanguage, label: 'Español', flag: '🇪🇸', sub: 'Spanish' },
                ].map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <div
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        onUpdateConfig({
                          ...config,
                          language: lang.code,
                        });
                      }}
                      className={`cursor-pointer p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/20'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <LanguageFlagIcon code={lang.code} className="w-7 h-5 rounded-sm shrink-0 shadow-sm" />
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            {lang.label}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {t(`lang_name_${lang.code}`, lang.sub)}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 shrink-0 relative z-10">
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
