import React, { useState, useEffect, useId, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Star,
  ArrowRight,
  WifiOff,
  History,
  Sliders,
  Palette,
  NotebookPen,
  Calendar,
} from 'lucide-react';
import { CustomToolShortcut, ThemeId, ToolDefinition } from '../../types/tool';
import { useI18n } from '../../i18n/context';
import { getToolCatalogText } from '../../i18n/toolCatalog';
import { THEMES } from '../../services/themes';
import { isTauri } from '../../services/fileSystemService';

const CALENDAR_STORAGE_KEY = 'omnidesk_calendar_events';
const NOTES_STORAGE_KEY = 'omnidesk-notes';

export type ConfigTabId =
  | 'themes'
  | 'currency'
  | 'widgets'
  | 'security'
  | 'mcp'
  | 'shortcuts'
  | 'backup'
  | 'language'
  | 'updates';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tools: ToolDefinition[];
  favorites: string[];
  recentToolIds?: string[];
  customToolShortcuts?: CustomToolShortcut[];
  onSelectTool: (toolId: string) => void;
  onOpenSettingsTab?: (tab: ConfigTabId) => void;
  onSelectTheme?: (themeId: ThemeId) => void;
  isOffline: boolean;
}

type PaletteEntry =
  | {
      kind: 'tool';
      id: string;
      tool: ToolDefinition;
      title: string;
      subtitle: string;
      shortcutCombo?: string;
    }
  | {
      kind: 'settings';
      id: string;
      tab: ConfigTabId;
      title: string;
      subtitle: string;
    }
  | {
      kind: 'theme';
      id: string;
      themeId: ThemeId;
      title: string;
      subtitle: string;
    }
  | {
      kind: 'note';
      id: string;
      title: string;
      subtitle: string;
    }
  | {
      kind: 'event';
      id: string;
      title: string;
      subtitle: string;
    };

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tools,
  favorites,
  recentToolIds = [],
  customToolShortcuts = [],
  onSelectTool,
  onOpenSettingsTab,
  onSelectTheme,
  isOffline,
}) => {
  const { t, language } = useI18n();
  const runningInTauri = isTauri();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const commandSearchId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const shortcutByToolId = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of customToolShortcuts) {
      if (!map.has(item.toolId)) map.set(item.toolId, item.combo);
    }
    return map;
  }, [customToolShortcuts]);

  const savedNotes = useMemo(() => {
    if (!isOpen || typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(NOTES_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Array<{ id: number; title?: string; body?: string }>) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [isOpen]);

  const savedEvents = useMemo(() => {
    if (!isOpen || typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Array<{ id: string; title?: string; date?: string }>) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [isOpen]);

  const entries: PaletteEntry[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    const toToolEntry = (tool: ToolDefinition): PaletteEntry => ({
      kind: 'tool',
      id: `tool-${tool.id}`,
      tool,
      title: getToolCatalogText(
        tool.id,
        'title',
        language,
        t(`tool_${tool.id.replace(/-/g, '_')}_title`, tool.title)
      ),
      subtitle: getToolCatalogText(
        tool.id,
        'desc',
        language,
        t(`tool_${tool.id.replace(/-/g, '_')}_desc`, tool.shortDesc)
      ),
      shortcutCombo: shortcutByToolId.get(tool.id),
    });

    if (!q) {
      const recentSet = new Set(recentToolIds);
      const recentTools = recentToolIds
        .map(id => tools.find(tool => tool.id === id))
        .filter((tool): tool is ToolDefinition => Boolean(tool));
      const restTools = tools.filter(tool => !recentSet.has(tool.id));
      return [...recentTools, ...restTools].map(toToolEntry);
    }

    const matchedTools = tools
      .filter(tool => {
        const localizedTitle = getToolCatalogText(tool.id, 'title', language, tool.title).toLowerCase();
        const localizedDesc = getToolCatalogText(tool.id, 'desc', language, tool.shortDesc).toLowerCase();
        return (
          localizedTitle.includes(q) ||
          localizedDesc.includes(q) ||
          tool.category.toLowerCase().includes(q) ||
          tool.tags.some(tag => tag.toLowerCase().includes(q))
        );
      })
      .map(toToolEntry);

    const settingsItems: Array<{ tab: ConfigTabId; title: string; keywords: string }> = [
      { tab: 'themes', title: t('tab_themes', 'Themes & Colors'), keywords: 'theme colors dark light preset' },
      { tab: 'currency', title: t('tab_currency', 'Default Currency'), keywords: 'currency fiat czk eur usd cny rmb yuan' },
      ...(runningInTauri
        ? [{ tab: 'widgets' as ConfigTabId, title: t('tab_widgets', 'Sidebar Widgets'), keywords: 'widgets clock timer crypto tasks calc' }]
        : []),
      { tab: 'security', title: t('tab_security', 'Security & Privacy'), keywords: 'security privacy offline audit purge' },
      ...(runningInTauri
        ? [{ tab: 'mcp' as ConfigTabId, title: t('tab_mcp', 'MCP Bridge'), keywords: 'mcp ai claude cursor websocket stdio log' }]
        : []),
      { tab: 'shortcuts', title: t('tab_shortcuts', 'Shortcuts'), keywords: 'shortcuts hotkeys keybindings custom' },
      ...(runningInTauri
        ? [{ tab: 'backup' as ConfigTabId, title: t('tab_backup', 'Backup & JSON Export/Import'), keywords: 'backup export import json workspace' }]
        : []),
      { tab: 'language', title: t('tab_language', 'Language'), keywords: 'language i18n locale english czech german spanish russian' },
      ...(runningInTauri
        ? [{ tab: 'updates' as ConfigTabId, title: t('tab_updates', 'Updates'), keywords: 'updates version release download install tauri' }]
        : []),
    ];

    const matchedSettings: PaletteEntry[] = onOpenSettingsTab
      ? settingsItems
          .filter(item => item.title.toLowerCase().includes(q) || item.keywords.includes(q))
          .map(item => ({
            kind: 'settings',
            id: `settings-${item.tab}`,
            tab: item.tab,
            title: item.title,
            subtitle: t('command_open_settings_tab', 'Open Settings tab'),
          }))
      : [];

    const matchedThemes: PaletteEntry[] = onSelectTheme
      ? THEMES.filter(th => {
          const name = t(th.nameKey, th.defaultName).toLowerCase();
          return name.includes(q) || th.id.includes(q) || 'theme'.includes(q);
        }).map(th => ({
          kind: 'theme',
          id: `theme-${th.id}`,
          themeId: th.id,
          title: t(th.nameKey, th.defaultName),
          subtitle: t('command_switch_theme', 'Switch workspace theme'),
        }))
      : [];

    const matchedNotes: PaletteEntry[] = savedNotes
      .filter(note => {
        const title = (note.title || '').toLowerCase();
        const body = (note.body || '').toLowerCase();
        return title.includes(q) || body.includes(q);
      })
      .slice(0, 5)
      .map(note => ({
        kind: 'note',
        id: `note-${note.id}`,
        title: note.title || t('notes_title', 'Notes Workspace'),
        subtitle: (note.body || '').slice(0, 80) || t('command_jump_notes', 'Open in Notes Workspace'),
      }));

    const matchedEvents: PaletteEntry[] = savedEvents
      .filter(ev => {
        const title = (ev.title || '').toLowerCase();
        const date = (ev.date || '').toLowerCase();
        return title.includes(q) || date.includes(q);
      })
      .slice(0, 5)
      .map(ev => ({
        kind: 'event',
        id: `event-${ev.id}`,
        title: ev.title || t('cat_planning', 'Calendar Event'),
        subtitle: `${ev.date || ''} · ${t('command_jump_calendar', 'Open in Calendar')}`,
      }));

    return [
      ...matchedTools,
      ...matchedNotes,
      ...matchedEvents,
      ...matchedSettings,
      ...matchedThemes,
    ];
  }, [
    query,
    tools,
    language,
    recentToolIds,
    shortcutByToolId,
    savedNotes,
    savedEvents,
    onOpenSettingsTab,
    onSelectTheme,
    runningInTauri,
    t,
  ]);

  const executeEntry = (entry: PaletteEntry) => {
    if (entry.kind === 'tool') {
      onSelectTool(entry.tool.id);
    } else if (entry.kind === 'note') {
      onSelectTool('notes');
    } else if (entry.kind === 'event') {
      onSelectTool('calendar');
    } else if (entry.kind === 'settings') {
      onOpenSettingsTab?.(entry.tab);
    } else if (entry.kind === 'theme') {
      onSelectTheme?.(entry.themeId);
    }
    onClose();
  };

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
        setActiveIndex(prev => (entries.length > 0 ? (prev + 1) % entries.length : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (entries.length > 0 ? (prev - 1 + entries.length) % entries.length : 0));
        return;
      }
      if (e.key === 'Enter' && entries.length > 0) {
        e.preventDefault();
        const selected = entries[activeIndex] || entries[0];
        if (selected) {
          executeEntry(selected);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, entries, activeIndex]);

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
        role="dialog"
        aria-modal="true"
        aria-label={t('command_search_label', 'Search tool or keyword')}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <label htmlFor={commandSearchId} className="sr-only">
            {t('command_search_label', 'Search tool or keyword')}
          </label>
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            id={commandSearchId}
            type="text"
            placeholder={t(
              'command_search_extended_placeholder',
              'Search tools, notes, calendar events, settings, or themes...'
            )}
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

        {/* List of matching entries */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {t('no_tools_query', 'No tool matches "{query}"', { query })}
            </div>
          ) : (
            entries.map((entry, index) => {
              const isHighlighted = index === activeIndex;
              const isTool = entry.kind === 'tool';
              const isFav = isTool && favorites.includes(entry.tool.id);
              const isRecent = isTool && recentToolIds.includes(entry.tool.id);
              const isLockedOffline = isTool && entry.tool.requiresOnline && isOffline;

              const badgeText =
                entry.kind === 'tool'
                  ? t(`cat_${entry.tool.category}`, entry.tool.category)
                  : entry.kind === 'settings'
                  ? t('command_badge_settings', 'Settings')
                  : entry.kind === 'theme'
                  ? t('command_badge_theme', 'Theme')
                  : entry.kind === 'note'
                  ? t('command_badge_note', 'Note')
                  : t('command_badge_event', 'Event');

              return (
                <button
                  key={entry.id}
                  data-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => executeEntry(entry)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors group ${
                    isHighlighted ? 'bg-slate-800 ring-1 ring-indigo-500/40' : 'hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 group-hover:border-indigo-500/40 shrink-0">
                      {isLockedOffline ? (
                        <WifiOff className="w-4 h-4 text-amber-400" />
                      ) : entry.kind === 'settings' ? (
                        <Sliders className="w-4 h-4" />
                      ) : entry.kind === 'theme' ? (
                        <Palette className="w-4 h-4" />
                      ) : entry.kind === 'note' ? (
                        <NotebookPen className="w-4 h-4" />
                      ) : entry.kind === 'event' ? (
                        <Calendar className="w-4 h-4" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                          {entry.title}
                        </span>
                        {isFav && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                        {isRecent && !query.trim() && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-300 font-mono shrink-0">
                            <History className="w-2.5 h-2.5" />
                            {t('recent_label', 'Recent')}
                          </span>
                        )}
                        {isLockedOffline && (
                          <span className="text-[10px] text-amber-400 font-mono shrink-0">
                            {t('online_badge', 'Requires online')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{entry.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {isTool && entry.shortcutCombo && (
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-[10px] text-emerald-300">
                        {entry.shortcutCombo}
                      </kbd>
                    )}
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
                      {badgeText}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>{t('command_nav_hint', '↑↓ navigate · Enter open · ESC close')}</span>
          <span>{t('tools_found_count', '{count} tools found', { count: entries.length })}</span>
        </div>
      </div>
    </div>
  );
};
