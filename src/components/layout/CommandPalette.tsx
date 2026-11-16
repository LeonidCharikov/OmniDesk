import React, { useState, useEffect, useId, useRef } from 'react';
import { Search, X, Star, ArrowRight, WifiOff, History } from 'lucide-react';
import { ToolDefinition } from '../../types/tool';
import { useI18n } from '../../i18n/context';
import { getToolCatalogText } from '../../i18n/toolCatalog';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tools: ToolDefinition[];
  favorites: string[];
  recentToolIds?: string[];
  onSelectTool: (toolId: string) => void;
  isOffline: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tools,
  favorites,
  recentToolIds = [],
  onSelectTool,
  isOffline,
}) => {
  const { t, language } = useI18n();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const commandSearchId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Order recent tools first when query is empty
      const recentSet = new Set(recentToolIds);
      const recentTools = recentToolIds
        .map(id => tools.find(tool => tool.id === id))
        .filter((tool): tool is ToolDefinition => Boolean(tool));
      const restTools = tools.filter(tool => !recentSet.has(tool.id));
      return [...recentTools, ...restTools];
    }
    return tools.filter(tool => {
      return (
        getToolCatalogText(tool.id, 'title', language, tool.title).toLowerCase().includes(q) ||
        getToolCatalogText(tool.id, 'desc', language, tool.shortDesc).toLowerCase().includes(q) ||
        tool.category.toLowerCase().includes(q) ||
        tool.tags.some(tag => tag.toLowerCase().includes(q))
      );
    });
  }, [query, tools, language, recentToolIds]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
        return;
      }
      if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        const selected = filtered[activeIndex] || filtered[0];
        if (selected) {
          onSelectTool(selected.id);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filtered, activeIndex, onSelectTool]);

  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    if (activeEl && typeof (activeEl as HTMLElement).scrollIntoView === 'function') {
      (activeEl as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <label htmlFor={commandSearchId} className="sr-only">{t('command_search_label', 'Search tool or keyword')}</label>
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            id={commandSearchId}
            type="text"
            placeholder={t('search_modal_placeholder', 'Search tool (e.g. docx, qr, password, matrix)...')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close', 'Close')}
            className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of matching tools */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {t('no_tools_query', 'No tool matches "{query}"', { query })}
            </div>
          ) : (
            filtered.map((tool, index) => {
              const isFav = favorites.includes(tool.id);
              const isRecent = recentToolIds.includes(tool.id);
              const isLockedOffline = tool.requiresOnline && isOffline;
              const isHighlighted = index === activeIndex;
              return (
                <button
                  key={tool.id}
                  data-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onSelectTool(tool.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors group ${
                    isHighlighted ? 'bg-slate-800 ring-1 ring-indigo-500/40' : 'hover:bg-slate-800/80'
                  }`}
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
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                          {getToolCatalogText(tool.id, 'title', language, t(`tool_${tool.id.replace(/-/g, '_')}_title`, tool.title))}
                        </span>
                        {isFav && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                        {isRecent && !query.trim() && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-300 font-mono shrink-0">
                            <History className="w-2.5 h-2.5" />
                            {t('recent_label', 'Recent')}
                          </span>
                        )}
                        {isLockedOffline && (
                          <span className="text-[10px] text-amber-400 font-mono shrink-0">{t('online_badge', 'Requires online')}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {getToolCatalogText(tool.id, 'desc', language, t(`tool_${tool.id.replace(/-/g, '_')}_desc`, tool.shortDesc))}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider ml-2 shrink-0">
                    {t(`cat_${tool.category}`, tool.category)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>{t('command_nav_hint', '↑↓ navigate · Enter open · ESC close')}</span>
          <span>{t('tools_found_count', '{count} tools found', { count: filtered.length })}</span>
        </div>
      </div>
    </div>
  );
};
