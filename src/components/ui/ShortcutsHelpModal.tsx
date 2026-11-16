import React, { useEffect } from 'react';
import { Keyboard, X, Sliders } from 'lucide-react';
import { BUILTIN_SHORTCUT_ACTIONS } from '../../services/shortcutsService';
import { CustomToolShortcut, ShortcutBindings } from '../../types/tool';
import { TOOLS_REGISTRY } from '../../tools/registry';
import { useI18n } from '../../i18n/context';
import { getToolCatalogText } from '../../i18n/toolCatalog';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutBindings;
  customToolShortcuts: CustomToolShortcut[];
  onCustomize: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
  customToolShortcuts,
  onCustomize,
}) => {
  const { t, language } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('shortcuts_help_title', 'Keyboard Shortcuts')}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {t('shortcuts_help_title', 'Keyboard Shortcuts')}
              </h2>
              <p className="text-[11px] text-slate-400">
                {t('shortcuts_help_subtitle', 'Active workspace and custom tool keybindings')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close', 'Close')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-300">
              {t('shortcuts_builtin_heading', 'Workspace Navigation')}
            </h3>
            <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/50">
              {BUILTIN_SHORTCUT_ACTIONS.map(action => (
                <div key={action.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-200">{t(action.labelKey, action.defaultLabel)}</span>
                  <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-indigo-300 shrink-0">
                    {shortcuts[action.id] || action.defaultCombo}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-300">
              {t('shortcuts_custom_heading', 'Custom Tool Shortcuts')} ({customToolShortcuts.length})
            </h3>
            {customToolShortcuts.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-400">
                {t(
                  'shortcuts_custom_empty',
                  'No custom tool shortcuts created yet. Add your own shortcuts in Settings.'
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/50">
                {customToolShortcuts.map(binding => {
                  const tool = TOOLS_REGISTRY.find(item => item.id === binding.toolId);
                  const title = tool
                    ? getToolCatalogText(tool.id, 'title', language, tool.title)
                    : binding.toolId;
                  return (
                    <div key={binding.id} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-200 truncate">{title}</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-emerald-300 shrink-0">
                        {binding.combo}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onCustomize();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-100 transition-colors whitespace-nowrap"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('shortcuts_customize_btn', 'Customize Shortcuts')}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            {t('close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};
