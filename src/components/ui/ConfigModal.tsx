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
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { UserConfig, ThemeId, WidgetCustomization } from '../../types/tool';
import { useI18n } from '../../i18n/context';
import { THEMES } from '../../services/themes';
import { DEFAULT_CONFIG, validateConfigJson } from '../../services/storage';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: UserConfig;
  onUpdateConfig: (newConfig: UserConfig) => void;
  onResetDefaults: () => void;
}

type TabType = 'themes' | 'widgets' | 'backup' | 'language';

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
}) => {
  const { t, language, setLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('themes');
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentThemeId = config.themeId || 'midnight';
  const currentWidgets = config.widgets || {
    enabledWidgets: ['clock', 'timer', 'crypto', 'notes'],
    selectedCity: 'Europe/Prague',
    selectedCityName: 'Praha',
    selectedFiat: 'CZK',
    selectedCrypto: 'BTC',
    quickNote: '',
  };

  const jsonExportPayload: UserConfig = {
    ...config,
    version: 2,
    exportedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(jsonExportPayload, null, 2);

  const downloadConfigFile = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnidesk-profile-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const copyConfigJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = validateConfigJson(text);
      if (res.valid && res.config) {
        onUpdateConfig(res.config);
        setImportStatus({
          success: true,
          message: t('config_imported_success', 'Konfigurace byla úspěšně načtena ze souboru!'),
        });
      } else {
        setImportStatus({
          success: false,
          message: res.error || t('import_parse_error', 'Chyba při čtení JSON souboru.'),
        });
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyPastedJson = () => {
    const res = validateConfigJson(pastedJson);
    if (res.valid && res.config) {
      onUpdateConfig(res.config);
      setPastedJson('');
      setShowPasteArea(false);
      setImportStatus({
        success: true,
        message: t('config_imported_success', 'Konfigurace byla úspěšně aplikována!'),
      });
    } else {
      setImportStatus({
        success: false,
        message: res.error || t('invalid_pasted_json', 'Neplatná syntaxe vloženého JSONu.'),
      });
    }
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

  const handleCityChange = (cityId: string) => {
    const found = CITIES.find(c => c.id === cityId);
    onUpdateConfig({
      ...config,
      widgets: {
        ...currentWidgets,
        selectedCity: cityId,
        selectedCityName: found?.name || 'Praha',
      },
    });
  };

  const handleFiatChange = (fiatCode: string) => {
    onUpdateConfig({
      ...config,
      widgets: {
        ...currentWidgets,
        selectedFiat: fiatCode,
      },
    });
  };

  const handleCryptoChange = (cryptoCode: string) => {
    onUpdateConfig({
      ...config,
      widgets: {
        ...currentWidgets,
        selectedCrypto: cryptoCode,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t('settings_modal_title', 'Nastavení & Konfigurátor OmniDesk')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('settings_modal_subtitle', 'Barevné režimy, správa postranních widgetů a přenositelné JSON profily')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/30">
          <button
            onClick={() => setActiveTab('themes')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'themes'
                ? 'text-indigo-400 border-indigo-500 bg-slate-800/40'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{t('tab_themes', 'Vzhled & Barvy')}</span>
          </button>

          <button
            onClick={() => setActiveTab('widgets')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'widgets'
                ? 'text-indigo-400 border-indigo-500 bg-slate-800/40'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('tab_widgets', 'Postranní Widgety')}</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'backup'
                ? 'text-indigo-400 border-indigo-500 bg-slate-800/40'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{t('tab_backup', 'Záloha & JSON Export/Import')}</span>
          </button>

          <button
            onClick={() => setActiveTab('language')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeTab === 'language'
                ? 'text-indigo-400 border-indigo-500 bg-slate-800/40'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t('tab_language', 'Jazyk')}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  {t('choose_color_theme', 'Vyberte barevný režim aplikace')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('theme_description', 'Přizpůsobte si kontrast, tónování a celkovou estetiku prostředí OmniDesk.')}
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
                      {t('widgets_visibility', 'Aktivní mini widgety v postranním panelu')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {t('widgets_visibility_desc', 'Zapněte nebo vypněte zobrazení jednotlivých mini panelů.')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'clock',
                      title: t('widget_clock_title', 'Živé hodiny a světový čas'),
                      desc: t('widget_clock_desc', 'Čas a datum pro vybrané světové město'),
                      icon: <Clock className="w-4 h-4 text-indigo-400" />,
                    },
                    {
                      id: 'timer',
                      title: t('widget_timer_title', 'Rychlý časovač / Pomodoro'),
                      desc: t('widget_timer_desc', 'Rychlý odpočet 25m soustředění a pauzy'),
                      icon: <Sliders className="w-4 h-4 text-amber-400" />,
                    },
                    {
                      id: 'crypto',
                      title: t('widget_crypto_title', 'Kurzovní lístek & Krypto'),
                      desc: t('widget_crypto_desc', 'Sledování vybrané kryptoměny a měny'),
                      icon: <Coins className="w-4 h-4 text-emerald-400" />,
                    },
                    {
                      id: 'notes',
                      title: t('widget_notes_title', 'Rychlý zápisník (Sticky Note)'),
                      desc: t('widget_notes_desc', 'Okamžité poznámky přímo v postranním panelu'),
                      icon: <FileEdit className="w-4 h-4 text-yellow-400" />,
                    },
                    {
                      id: 'system',
                      title: t('widget_system_title', 'Systémový hardware gauge'),
                      desc: t('widget_system_desc', 'Kompaktní ukazatel vytížení CPU a RAM'),
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
                  {t('widget_customization', 'Přizpůsobení obsahu widgetů')}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* City selector for Clock widget */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t('selected_city_for_clock', 'Město pro hodiny')}
                    </label>
                    <select
                      value={currentWidgets.selectedCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {CITIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fiat selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t('selected_fiat', 'Sledovaná fiat měna')}
                    </label>
                    <select
                      value={currentWidgets.selectedFiat}
                      onChange={(e) => handleFiatChange(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {FIATS.map((f) => (
                        <option key={f.code} value={f.code}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Crypto selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t('selected_crypto', 'Sledovaná kryptoměna')}
                    </label>
                    <select
                      value={currentWidgets.selectedCrypto}
                      onChange={(e) => handleCryptoChange(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {CRYPTOS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ideas for further widgets */}
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {t('future_widgets_title', 'Návrhy na další widgety do příštích verzí')}
                </span>
                <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                  <li><strong>Rychlé převody jednotek</strong> (Quick SI / Imperial bar)</li>
                  <li><strong>Baterie & Spotřeba</strong> (Battery level and charging status přes Tauri)</li>
                  <li><strong>Počasí a teplota</strong> (Lokální offline meteo z cache)</li>
                  <li><strong>Denní cíle a úkoly</strong> (Mini Checklist pro dnešní den)</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP & JSON MIGRATION */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {t('backup_and_migration', 'Záloha a migrace konfigurace mezi zařízeními')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('backup_desc', 'Exportujte své nastavení do standardního JSON souboru nebo jej jednoduše přeneste na jiný počítač.')}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={downloadConfigFile}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
                >
                  {downloaded ? <Check className="w-4 h-4 text-emerald-300" /> : <Download className="w-4 h-4" />}
                  <span>{downloaded ? t('downloaded', 'Staženo!') : t('download_json_backup', 'Stáhnout zálohu .json')}</span>
                </button>

                <button
                  onClick={copyConfigJson}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? t('copied_to_clipboard', 'Zkopírováno!') : t('copy_json_clipboard', 'Kopírovat JSON do schránky')}</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
                >
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>{t('import_json_file', 'Nahrát a obnovit ze souboru .json')}</span>
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
                  <span>{showPasteArea ? t('hide_paste_area', 'Skrýt vkládání textem') : t('paste_json_text', 'Vložit JSON textem')}</span>
                </button>
              </div>

              {/* Paste JSON Area */}
              {showPasteArea && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fade-in">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {t('paste_json_label', 'Vložte JSON kód profilu:')}
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
                      {t('apply_configuration', 'Aplikovat konfiguraci')}
                    </button>
                  </div>
                </div>
              )}

              {/* JSON preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t('current_json_preview', 'Aktuální konfigurace (Live JSON)')}
                </span>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-850 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-40">
                  {jsonString}
                </pre>
              </div>

              {/* Reset to Factory Defaults */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">
                    {t('factory_reset', 'Tovární nastavení')}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {t('factory_reset_desc', 'Obnovit výchozí barevný režim, widgety i jazyk')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (confirm(t('confirm_reset', 'Opravdu chcete obnovit výchozí nastavení?'))) {
                      onResetDefaults();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('reset_defaults', 'Obnovit výchozí')}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LANGUAGE */}
          {activeTab === 'language' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {t('select_language', 'Výběr jazyka rozhraní')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('language_desc', 'OmniDesk podporuje 5 plně lokalizovaných jazyků.')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { code: 'cs', label: 'Čeština', flag: '🇨🇿', sub: 'Zdrojový jazyk' },
                  { code: 'ru', label: 'Русский', flag: '🇷🇺', sub: 'Полный перевод' },
                  { code: 'en', label: 'English', flag: '🇬🇧', sub: 'Universal' },
                  { code: 'de', label: 'Deutsch', flag: '🇩🇪', sub: 'Vollständig lokalisiert' },
                  { code: 'es', label: 'Español', flag: '🇪🇸', sub: 'Traducción completa' },
                ].map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <div
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code as any);
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
                        <span className="text-2xl">{lang.flag}</span>
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            {lang.label}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {lang.sub}
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
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/60">
          <span className="text-xs text-slate-500">
            OmniDesk v2.4 • 100% Offline-First
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            {t('close', 'Zavřít')}
          </button>
        </div>
      </div>
    </div>
  );
};
