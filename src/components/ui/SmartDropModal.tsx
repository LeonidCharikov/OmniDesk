import React, { useMemo } from 'react';
import { FileUp, ArrowRight, X } from 'lucide-react';
import { TOOLS_REGISTRY } from '../../tools/registry';
import { getMatchingToolIdsForFile } from '../../services/toolPipeService';
import { useI18n } from '../../i18n/context';
import { getToolCatalogText } from '../../i18n/toolCatalog';

interface SmartDropModalProps {
  file: File | null;
  onClose: () => void;
  onLaunchWithFile: (toolId: string, file: File) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const SmartDropModal: React.FC<SmartDropModalProps> = ({
  file,
  onClose,
  onLaunchWithFile,
}) => {
  const { t, language } = useI18n();

  const matchingTools = useMemo(() => {
    if (!file) return [];
    const ids = getMatchingToolIdsForFile(file.name, file.type);
    return ids
      .map(id => TOOLS_REGISTRY.find(tool => tool.id === id))
      .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));
  }, [file]);

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('smart_drop_title', 'Open Dropped File')}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <FileUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">
                {t('smart_drop_title', 'Open File in OmniDesk')}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {file.name} · {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close', 'Close')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-400">
            {t('smart_drop_desc', 'Choose a matching tool to open and load this file immediately:')}
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {matchingTools.map(tool => {
              const title = getToolCatalogText(tool.id, 'title', language, tool.title);
              const desc = getToolCatalogText(tool.id, 'desc', language, tool.shortDesc);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onLaunchWithFile(tool.id, file)}
                  className="w-full p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-left flex items-center justify-between gap-3 transition-colors group"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white group-hover:text-indigo-300 block truncate">
                      {title}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                      {desc}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
