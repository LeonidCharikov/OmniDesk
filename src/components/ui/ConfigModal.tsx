import React, { useState } from 'react';
import { X, Download, HardDrive, Check, RefreshCw, Star } from 'lucide-react';
import { UserConfig, ToolDefinition } from '../../types/tool';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: UserConfig;
  allTools: ToolDefinition[];
  onToggleFavorite: (toolId: string) => void;
  onResetDefaults: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  allTools,
  onToggleFavorite,
  onResetDefaults,
}) => {
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(config, null, 2);

  const downloadConfigFile = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'omnidesk-config.json';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Lokální JSON konfigurace (omnidesk-config.json)</h3>
              <p className="text-xs text-slate-400">Uloženo výhradně na vašem lokálním disku, žádný cloud.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Quick Favorite Toggles */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Správa oblíbených nástrojů ({config.favorites.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allTools.map(t => {
                const isFav = config.favorites.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => onToggleFavorite(t.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      isFav
                        ? 'bg-indigo-950/30 border-indigo-500/40 text-slate-100'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-medium truncate mr-2">{t.title}</span>
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
                Přímý obsah konfiguračního souboru
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {new Blob([jsonString]).size} B
              </span>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-indigo-300 overflow-x-auto max-h-48 leading-relaxed">
              <pre>{jsonString}</pre>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Obnovit výchozí
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadConfigFile}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
            >
              {downloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              {downloaded ? 'Uloženo' : 'Stáhnout omnidesk-config.json'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
