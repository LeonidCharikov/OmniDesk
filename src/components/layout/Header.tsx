import React, { useEffect, useRef, useState } from 'react';
import { Search, Star, ArrowLeft, ShieldCheck, Sliders, Menu, Minus, Square, Copy, X, WifiOff, Keyboard, ChevronDown, Check, Download } from 'lucide-react';
import { ToolDefinition } from '../../types/tool';
import { useI18n, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n/context';
import { getToolCatalogText } from '../../i18n/toolCatalog';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { LanguageFlagIcon } from '../ui/LanguageFlagIcon';
import { isTauri } from '../../services/fileSystemService';

interface HeaderProps {
  currentCategoryName: string;
  activeTool: ToolDefinition | null;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenSearch: () => void;
  onOpenSettings?: () => void;
  onOpenShortcutsHelp?: () => void;
  searchShortcutLabel?: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  isOffline?: boolean;
  availableUpdateVersion?: string;
  isInstallingUpdate?: boolean;
  updateProgressPercent?: number;
  onTriggerUpdate?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCategoryName,
  activeTool,
  onBack,
  isFavorite,
  onToggleFavorite,
  onOpenSearch,
  onOpenSettings,
  onOpenShortcutsHelp,
  searchShortcutLabel = 'Ctrl+K',
  onToggleSidebar,
  isSidebarOpen,
  isOffline = false,
  availableUpdateVersion,
  isInstallingUpdate = false,
  updateProgressPercent,
  onTriggerUpdate,
}) => {
  const { language, setLanguage, t } = useI18n();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const runningInTauri = isTauri();

  useEffect(() => {
    if (!runningInTauri) return;
    let active = true;
    let unlistenResize: (() => void) | undefined;

    void import('@tauri-apps/api/window')
      .then(async ({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        const syncMaximized = async () => {
          try {
            const maximized = await win.isMaximized();
            if (active) setIsWindowMaximized(maximized);
          } catch {
            // ignore permission or lifecycle errors
          }
        };
        await syncMaximized();
        unlistenResize = await win.onResized(() => {
          void syncMaximized();
        });
      })
      .catch(() => {});

    return () => {
      active = false;
      unlistenResize?.();
    };
  }, [runningInTauri]);

  useEffect(() => {
    if (!langMenuOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLangMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [langMenuOpen]);

  const handleHeaderMouseDown = async (event: React.MouseEvent<HTMLElement>) => {
    if (
      !runningInTauri ||
      event.button !== 0 ||
      event.detail > 1 ||
      (event.target instanceof Element && event.target.closest('button, select, input, a'))
    ) {
      return;
    }

    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().startDragging();
    } catch (error) {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        console.error('Unable to drag the application window:', error);
      }
    }
  };

  const handleHeaderDoubleClick = async (event: React.MouseEvent<HTMLElement>) => {
    if (
      !runningInTauri ||
      (event.target instanceof Element && event.target.closest('button, select, input, a'))
    ) {
      return;
    }
    await handleMaximize();
  };

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (error) {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        console.error('Unable to minimize the application window:', error);
      }
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      await win.toggleMaximize();
      setIsWindowMaximized(await win.isMaximized());
    } catch (error) {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        console.error('Unable to maximize the application window:', error);
      } else if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (error) {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        console.error('Unable to close the application window:', error);
      }
    }
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const toolTitle = activeTool
    ? getToolCatalogText(activeTool.id, 'title', language, t(`tool_${activeTool.id.replace(/-/g, '_')}_title`, activeTool.title))
    : '';

  return (
    <header
      onMouseDown={handleHeaderMouseDown}
      onDoubleClick={handleHeaderDoubleClick}
      className="h-14 min-h-14 w-full max-w-full border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-xl px-2.5 sm:px-4 md:px-5 py-2 flex items-center justify-between gap-1.5 sm:gap-2 shrink-0 select-none transition-colors z-20 min-w-0"
    >
      {/* Zone 1: Hamburger + Breadcrumbs & Back Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 lg:flex-initial min-w-0 lg:max-w-[40%] overflow-hidden">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title={isSidebarOpen ? t('close_sidebar', 'Close sidebar') : t('open_sidebar', 'Open sidebar')}
            aria-label={isSidebarOpen ? t('close_sidebar', 'Close sidebar') : t('open_sidebar', 'Open sidebar')}
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {activeTool && (
          <button
            onClick={onBack}
            className="h-8 px-2 sm:h-9 sm:px-2.5 rounded-lg text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors shrink-0 inline-flex items-center justify-center gap-1 text-xs"
            title={t('back', 'Back')}
            aria-label={t('back', 'Back')}
          >
            <ArrowLeft className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="hidden xl:inline font-medium whitespace-nowrap">{t('back', 'Back')}</span>
          </button>
        )}

        <div data-tauri-drag-region className="flex items-center gap-1 sm:gap-1.5 text-xs text-slate-400 truncate min-w-0">
          {activeTool ? (
            <>
              <span className="font-semibold text-slate-300 hidden xl:inline shrink-0">OmniDesk</span>
              <span aria-hidden="true" className="text-slate-600 hidden xl:inline shrink-0">/</span>
              <span className="text-slate-400 truncate hidden md:inline shrink-0 max-w-28 xl:max-w-none">
                {currentCategoryName}
              </span>
              <span aria-hidden="true" className="text-slate-600 hidden md:inline shrink-0">/</span>
              <span className="text-indigo-400 font-semibold text-xs sm:text-sm truncate min-w-0">
                {toolTitle}
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold text-slate-200 text-xs sm:text-sm shrink-0">OmniDesk</span>
              <span aria-hidden="true" className="text-slate-600 shrink-0 hidden sm:inline">/</span>
              <span className="text-slate-300 font-medium truncate min-w-0 hidden sm:inline">
                {currentCategoryName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Zone 2: Centered Search (visible on >= 1024px) */}
      <div className="hidden lg:flex items-center justify-center flex-1 min-w-0 max-w-sm xl:max-w-md mx-3">
        <button
          onClick={onOpenSearch}
          className="w-full min-w-0 h-9 flex items-center justify-between px-3.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{t('search_placeholder', 'Quick search tools... Ctrl+K')}</span>
          </div>
          <kbd className="shrink-0 ml-2 font-mono text-[10px] bg-slate-800/90 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
            {searchShortcutLabel}
          </kbd>
        </button>
      </div>

      {/* Zone 3: PWA Install / Desktop Update Download, Connectivity/Lock, Language, Settings & Window Controls */}
      <div className="flex items-center justify-end gap-1 sm:gap-1.5 shrink-0">
        <button
          onClick={onOpenSearch}
          className="lg:hidden h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors shrink-0"
          title={t('search_placeholder', 'Search')}
          aria-label={t('search_placeholder', 'Search')}
        >
          <Search className="w-4 h-4" />
        </button>

        {!runningInTauri && <PWAInstallButton />}

        {runningInTauri && availableUpdateVersion && onTriggerUpdate && (
          <button
            type="button"
            onClick={onTriggerUpdate}
            disabled={isInstallingUpdate}
            className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-100 text-xs font-semibold transition-colors shrink-0 shadow-sm disabled:opacity-60"
            title={
              isInstallingUpdate
                ? t('header_update_installing_tooltip', 'Downloading and installing update v{version}...', {
                    version: availableUpdateVersion,
                  })
                : t('header_update_available_tooltip', 'Update v{version} available — click to download and update', {
                    version: availableUpdateVersion,
                  })
            }
            aria-label={t('header_update_available_tooltip', 'Update v{version} available — click to download and update', {
              version: availableUpdateVersion,
            })}
          >
            <Download className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0 ${isInstallingUpdate ? 'animate-bounce' : ''}`} />
            <span className="hidden md:inline whitespace-nowrap">
              {isInstallingUpdate
                ? typeof updateProgressPercent === 'number'
                  ? `${updateProgressPercent}%`
                  : t('updates_installing_btn', 'Downloading & Installing...')
                : t('header_update_btn', 'Update v{version}', { version: availableUpdateVersion })}
            </span>
          </button>
        )}

        {isOffline && (
          <div
            className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0"
            title={t('offline_mode_active', 'Offline mode active')}
          >
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden 2xl:inline text-xs font-medium whitespace-nowrap">
              {t('offline_badge', 'Offline')}
            </span>
          </div>
        )}

        {activeTool ? (
          <button
            onClick={onToggleFavorite}
            className={`inline-flex items-center justify-center gap-1.5 h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
              isFavorite
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={isFavorite ? t('in_favorites', 'In Favorites') : t('add_favorite', 'Add to Favorites')}
            aria-label={isFavorite ? t('in_favorites', 'In Favorites') : t('add_favorite', 'Add to Favorites')}
          >
            <Star className={`w-3.5 h-3.5 shrink-0 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden 2xl:inline whitespace-nowrap">
              {isFavorite ? t('in_favorites', 'In Favorites') : t('add_favorite', 'Add to Favorites')}
            </span>
          </button>
        ) : !isOffline ? (
          <div
            className="hidden md:inline-flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0"
            title={t('local_sandboxed', 'Local Sandbox')}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden 2xl:inline text-xs font-medium text-emerald-300 whitespace-nowrap">
              {t('local_sandboxed', 'Local Sandbox')}
            </span>
          </div>
        ) : null}

        <div ref={langMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setLangMenuOpen(prev => !prev)}
            aria-haspopup="listbox"
            aria-expanded={langMenuOpen}
            aria-label={t('interface_language', 'Interface Language')}
            title={t('interface_language', 'Interface Language')}
            className="h-8 sm:h-9 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 font-medium transition-colors"
          >
            <LanguageFlagIcon code={currentLang.code} className="w-4 h-3 rounded-[2px] shrink-0" />
            <span className="hidden sm:inline text-xs uppercase font-semibold text-slate-300">{currentLang.code}</span>
            <ChevronDown className="hidden sm:block w-3 h-3 text-slate-400" />
          </button>

          {langMenuOpen && (
            <div
              role="listbox"
              aria-label={t('interface_language', 'Interface Language')}
              className="absolute right-0 mt-1.5 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 z-50"
            >
              {SUPPORTED_LANGUAGES.map(lang => {
                const isSelected = lang.code === language;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setLanguage(lang.code as SupportedLanguage);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/20 text-white font-semibold'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <LanguageFlagIcon code={lang.code} className="w-4 h-3 rounded-[2px] shrink-0" />
                      <span className="truncate">{lang.name}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {onOpenShortcutsHelp && (
          <button
            onClick={onOpenShortcutsHelp}
            className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors shrink-0"
            title={t('shortcuts_help_title', 'Keyboard Shortcuts')}
            aria-label={t('shortcuts_help_title', 'Keyboard Shortcuts')}
          >
            <Keyboard className="w-4 h-4 text-slate-300" />
          </button>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="h-8 w-8 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors shrink-0"
            title={t('settings_modal_title', 'Settings & Appearance')}
            aria-label={t('settings_modal_title', 'Settings & Appearance')}
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
          </button>
        )}

        {runningInTauri && (
          <div className="flex items-center ml-0.5 pl-1.5 sm:pl-2 border-l border-slate-800/80 gap-0.5 shrink-0">
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title={t('window_minimize', 'Minimize')}
              aria-label={t('window_minimize', 'Minimize')}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title={isWindowMaximized ? t('window_restore', 'Restore') : t('window_maximize', 'Maximize')}
              aria-label={isWindowMaximized ? t('window_restore', 'Restore') : t('window_maximize', 'Maximize')}
            >
              {isWindowMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded text-slate-400 hover:text-rose-100 hover:bg-rose-600/80 transition-colors"
              title={t('window_close', 'Close')}
              aria-label={t('window_close', 'Close')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
