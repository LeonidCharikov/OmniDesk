import React, { useState, useRef } from 'react';
import { X, Download, Upload, HardDrive, Check, RefreshCw, Star, Sliders, AlertCircle, Copy, FileJson } from 'lucide-react';
import { UserConfig, ToolDefinition } from '../../types/tool';
import { useI18n } from '../../i18n/context';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: UserConfig;
  allTools: ToolDefinition[];
  onToggleFavorite: (toolId: string) => void;
  onResetDefaults: () => void;
  onUpdateConfig?: (newConfig: UserConfig) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  allTools,
  onToggleFavorite,
  onResetDefaults,
  onUpdateConfig,
}) => {
  const { t } = useI18n();
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentConfigData: UserConfig = {
    ...config,
    enabledWidgets: config.enabledWidgets || ['clock', 'timer', 'crypto'],
  };

  const jsonString = JSON.stringify(currentConfigData, null, 2);

  const downloadConfigFile = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnidesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

  const applyConfigObject = (imported: Partial<UserConfig>) => {
    if (!imported || typeof imported !== 'object') {
      throw new Error(t('invalid_config_format', 'Soubor neobsahuje platný formát konfigurace OmniDesk.'));
    }

    const merged: UserConfig = {
      ...config,
      favorites: Array.isArray(imported.favorites) ? imported.favorites : config.favorites,
      recentToolIds: Array.isArray(imported.recentToolIds) ? imported.recentToolIds : config.recentToolIds,
      simulatedOffline: false,
      theme: imported.theme === 'light' ? 'light' : 'dark',
      enabledWidgets: Array.isArray(imported.enabledWidgets) ? imported.enabledWidgets : (config.enabledWidgets || ['clock', 'timer', 'crypto']),
      language: imported.language || config.language,
    };

    if (onUpdateConfig) {
      onUpdateConfig(merged);
    }
    setImportStatus({
      success: true,
      message: t('config_imported_success', 'Konfigurace byla úspěšně načtena a uložena do zařízení!'),
    });
    setTimeout(() => setImportStatus(null), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        applyConfigObject(parsed);
      } catch (err: unknown) {
        setImportStatus({
          success: false,
          message: err instanceof Error ? err.message : t('import_parse_error', 'Chyba při čtení JSON souboru.'),
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyPastedJson = () => {
    try {
      const parsed = JSON.parse(pastedJson);
      applyConfigObject(parsed);
      setPastedJson('');
      setShowPasteArea(false);
    } catch (err: unknown) {
      setImportStatus({
        success: false,
        message: err instanceof Error ? err.message : t('invalid_pasted_json', 'Neplatná syntaxe vloženého JSONu.'),
      });
    }
  };

  const toggleWidget = (widgetId: string) => {
    const current = config.enabledWidgets || ['clock', 'timer', 'crypto'];
    const updated = current.includes(widgetId)
      ? current.filter(id => id !== widgetId)
      : [...current, widgetId];

    if (onUpdateConfig) {
      onUpdateConfig({
        ...config,
        enabledWidgets: updated,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {t('config_manager_title', 'Konfigurátor & Správce Záloh (omnidesk-config.json)')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('config_manager_desc', 'Exportujte a importujte svá nastavení pro snadný přenos mezi zařízeními a verzemi.')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Import / Export Notification Banner */}
          {importStatus && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
              importStatus.success 
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-red-950/40 border-red-800/60 text-red-300'
            }`}>
              {importStatus.success ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* Backup & Restore Controls */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <FileJson className="w-4 h-4 text-indigo-400" />
              {t('backup_restore_title', 'Exportovat nebo Obnovit konfiguraci')}
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('backup_restore_desc', 'Uložte si profil do souboru JSON a při smazání mezipaměti nebo na jiném počítači ho jedním klikem nahrajte zpět.')}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={downloadConfigFile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
              >
                {downloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
                <span>{downloaded ? t('saved', 'Uloženo') : t('export_json_file', 'Stáhnout zálohu .json')}</span>
              </button>

              <button
                onClick={copyConfigJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t('copied', 'Zkopírováno') : t('copy_json', 'Kopírovat JSON')}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 hover:bg-emerald-950 border border-emerald-800/60 rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t('import_json_file', 'Nahrát soubor .json')}</span>
              </button>

              <button
                onClick={() => setShowPasteArea(!showPasteArea)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {t('paste_json_text', 'Vložit textem')}
              </button>
            </div>

            {showPasteArea && (
              <div className="pt-2 space-y-2">
                <textarea
                  value={pastedJson}
                  onChange={e => setPastedJson(e.target.value)}
                  placeholder={t('paste_json_placeholder', 'Vložte sem zkopírovaný obsah konfigurace v JSON formátu...')}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleApplyPastedJson}
                  className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors"
                >
                  {t('apply_imported_config', 'Aplikovat vloženou konfiguraci')}
                </button>
              </div>
            )}
          </div>

          {/* Mini-Widgets Selector on Sidebar */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              {t('sidebar_widgets_settings', 'Zobrazení mini-widgetů na postranním panelu')}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'clock', label: t('widget_clock', 'Živé hodiny a datum') },
                { id: 'timer', label: t('widget_timer', 'Rychlý časovač / Pomodoro') },
                { id: 'crypto', label: t('widget_crypto', 'Lístek kryptoměn & měn') },
              ].map(w => {
                const isChecked = (config.enabledWidgets || ['clock', 'timer', 'crypto']).includes(w.id);
                return (
                  <label
                    key={w.id}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                      isChecked
                        ? 'bg-indigo-950/30 border-indigo-500/40 text-slate-100'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleWidget(w.id)}
                      className="rounded bg-slate-900 text-indigo-600 focus:ring-0"
                    />
                    <span className="font-medium">{w.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Quick Favorite Toggles */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              {t('favorites_management', 'Správa oblíbených nástrojů')} ({config.favorites.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {allTools.map(tool => {
                const isFav = config.favorites.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    onClick={() => onToggleFavorite(tool.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      isFav
                        ? 'bg-indigo-950/30 border-indigo-500/40 text-slate-100'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-medium truncate mr-2">{t(`tool_${tool.id.replace(/-/g, '_')}_title`, tool.title)}</span>
                    <Star className={`w-3.5 h-3.5 shrink-0 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* JSON File Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t('live_json_config_preview', 'Přímý náhled JSON konfigurace')}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {new Blob([jsonString]).size} B
              </span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-indigo-300 overflow-x-auto max-h-36 leading-relaxed">
              <pre>{jsonString}</pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('reset_defaults', 'Obnovit výchozí')}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {t('close', 'Zavřít')}
          </button>
        </div>
      </div>
    </div>
  );
};
