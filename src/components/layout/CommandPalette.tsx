import React, { useState, useEffect, useId } from 'react';
import { Search, X, Star, ArrowRight, WifiOff, Globe } from 'lucide-react';
import { ToolDefinition } from '../../types/tool';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tools: ToolDefinition[];
  favorites: string[];
  onSelectTool: (toolId: string) => void;
  isOffline: boolean;
}

import { useI18n } from '../../i18n/context';
import { getToolCatalogText } from '../../i18n/toolCatalog';

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tools,
  favorites,
  onSelectTool,
  isOffline,
}) => {
  const { t, language } = useI18n();
  const [query, setQuery] = useState('');
  const commandSearchId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = tools.filter(tool => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      getToolCatalogText(tool.id, 'title', language, tool.title).toLowerCase().includes(q) ||
      getToolCatalogText(tool.id, 'desc', language, tool.shortDesc).toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q) ||
      tool.tags.some(tag => tag.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <label htmlFor={commandSearchId} className="sr-only">{t('command_search_label', 'Hledat nástroj nebo klíčové slovo')}</label>
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            id={commandSearchId}
            type="text"
            placeholder={t('search_modal_placeholder', 'Hledat nástroj (např. docx, qr, heslo, matice)...')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of matching tools */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {t('no_tools_query', 'Žádný nástroj neodpovídá zadání "{query}"', { query })}
            </div>
          ) : (
            filtered.map(tool => {
              const isFav = favorites.includes(tool.id);
              const isLockedOffline = tool.requiresOnline && isOffline;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    onSelectTool(tool.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl text-left hover:bg-slate-800/80 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 group-hover:border-indigo-500/40 shrink-0">
                      {isLockedOffline ? (
                        <WifiOff className="w-4 h-4 text-amber-400" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                          {getToolCatalogText(tool.id, 'title', language, t(`tool_${tool.id.replace(/-/g, '_')}_title`, tool.title))}
                        </span>
                        {isFav && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                        {isLockedOffline && (
                          <span className="text-[10px] text-amber-400 font-mono">{t('online_badge', 'Vyžaduje online')}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {getToolCatalogText(tool.id, 'desc', language, t(`tool_${tool.id.replace(/-/g, '_')}_desc`, tool.shortDesc))}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider ml-2 shrink-0">
                    {tool.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>{t('command_close_hint', 'Stiskněte ESC pro zavření')}</span>
          <span>{t('tools_found_count', '{count} nalezených nástrojů', { count: filtered.length })}</span>
        </div>
      </div>
    </div>
  );
};
