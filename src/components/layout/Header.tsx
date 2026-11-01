import React, { useId } from 'react';
import { Search, Star, ArrowLeft, ShieldCheck, Languages, Sliders, Menu, Minus, Square, X } from 'lucide-react';
import { ToolDefinition } from '../../types/tool';
import { useI18n, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n/context';
import { getToolCatalogText } from '../../i18n/toolCatalog';

interface HeaderProps {
  currentCategoryName: string;
  activeTool: ToolDefinition | null;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenSearch: () => void;
  onOpenSettings?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentCategoryName,
  activeTool,
  onBack,
  isFavorite,
  onToggleFavorite,
  onOpenSearch,
  onOpenSettings,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const { language, setLanguage, t } = useI18n();
  const langSelectId = useId();

  const handleHeaderMouseDown = async (event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button, select, input, a'))) {
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
      await getCurrentWindow().toggleMaximize();
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
      className="h-14 min-h-14 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-xl px-2.5 sm:px-4 md:px-5 py-2 flex items-center justify-between gap-2 shrink-0 select-none transition-colors z-20"
    >
      {/* Zone 1: Hamburger + Breadcrumbs & Back Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0 max-w-[50%] lg:max-w-[40%] overflow-hidden">
        {/* Hamburger toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title={isSidebarOpen ? t('close_sidebar', 'Zavřít panel') : t('open_sidebar', 'Otevřít panel')}
            aria-label={isSidebarOpen ? t('close_sidebar', 'Zavřít panel') : t('open_sidebar', 'Otevřít panel')}
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Back button (when tool is open) */}
        {activeTool && (
          <button
            onClick={onBack}
            className="p-1.5 sm:p-2 rounded-lg text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors shrink-0 flex items-center gap-1 text-xs"
            title={t('back', 'Zpět')}
            aria-label={t('back', 'Zpět')}
          >
            <ArrowLeft className="w-4 h-4 text-slate-300" />
            <span className="hidden xl:inline font-medium">{t('back', 'Zpět')}</span>
          </button>
        )}

        {/* Breadcrumb & Title */}
        <div data-tauri-drag-region className="flex items-center gap-1.5 text-xs text-slate-400 truncate min-w-0">
          {activeTool ? (
            <>
              {/* Desktop (>= 1280px): OmniDesk / Category / Tool */}
              <span className="font-semibold text-slate-300 hidden xl:inline shrink-0">OmniDesk</span>
              <span aria-hidden="true" className="text-slate-600 hidden xl:inline shrink-0">/</span>

              {/* Tablet & Desktop (>= 640px): Category */}
              <span className="text-slate-400 truncate hidden sm:inline shrink-0 max-w-28 xl:max-w-none">
                {currentCategoryName}
              </span>
              <span aria-hidden="true" className="text-slate-600 hidden sm:inline shrink-0">/</span>

              {/* Active Tool Name: Always visible and prominent */}
              <span className="text-indigo-400 font-semibold text-xs sm:text-sm truncate min-w-0">
                {toolTitle}
              </span>
            </>
          ) : (
            <>
              {/* Main menu: OmniDesk / Category */}
              <span className="font-semibold text-slate-200 text-xs sm:text-sm shrink-0">OmniDesk</span>
              <span aria-hidden="true" className="text-slate-600 shrink-0">/</span>
              <span className="text-slate-300 font-medium truncate min-w-0">
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
          className="w-full min-w-0 flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{t('search_placeholder', 'Rychlé hledání nástrojů... Ctrl+K')}</span>
          </div>
          <kbd className="shrink-0 ml-2 font-mono text-[10px] bg-slate-800/90 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Language Selector, Tool Actions & Window Controls */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
        {/* Compact search button (< 1024px) */}
        <button
          onClick={onOpenSearch}
          className="lg:hidden p-1.5 sm:p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors shrink-0"
          title={t('search_placeholder', 'Hledat')}
          aria-label={t('search_placeholder', 'Hledat')}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Active tool: Favorite toggle; Main menu: Sandboxed badge */}
        {activeTool ? (
          <button
            onClick={onToggleFavorite}
            className={`inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
              isFavorite
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={isFavorite ? t('in_favorites', 'V oblíbených') : t('add_favorite', 'Přidat do oblíbených')}
            aria-label={isFavorite ? t('in_favorites', 'V oblíbených') : t('add_favorite', 'Přidat do oblíbených')}
          >
            <Star className={`w-3.5 h-3.5 shrink-0 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden 2xl:inline whitespace-nowrap">
              {isFavorite ? t('in_favorites', 'V oblíbených') : t('add_favorite', 'Přidat do oblíbených')}
            </span>
          </button>
        ) : (
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0"
            title={t('local_sandboxed', 'Lokální sandbox')}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden 2xl:inline text-xs font-medium text-emerald-300 whitespace-nowrap">
              {t('local_sandboxed', 'Lokální sandbox')}
            </span>
          </div>
        )}

        {/* Language selector */}
        <div className="relative flex items-center rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors shrink-0">
          <label htmlFor={langSelectId} className="sr-only">{t('interface_language', 'Jazyk rozhraní')}</label>
          <div className="pointer-events-none flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-200 font-medium">
            <span className="text-sm leading-none" aria-hidden="true">{currentLang.flag}</span>
            <span className="text-xs uppercase font-semibold text-slate-300">{currentLang.code}</span>
          </div>
          <select
            id={langSelectId}
            value={language}
            onChange={e => setLanguage(e.target.value as SupportedLanguage)}
            aria-label={t('interface_language', 'Jazyk rozhraní')}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-200 text-xs py-1">
                {lang.flag} {lang.name} ({lang.code.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors shrink-0"
            title={t('settings_modal_title', 'Nastavení & Vzhled')}
            aria-label={t('settings_modal_title', 'Nastavení & Vzhled')}
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
          </button>
        )}

        {/* Window action buttons (Tauri & Desktop >= 640px) */}
        <div className="hidden sm:flex items-center ml-0.5 pl-1.5 sm:pl-2 border-l border-slate-800/80 gap-0.5 shrink-0">
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title={t('window_minimize', 'Minimalizovat')}
            aria-label={t('window_minimize', 'Minimalizovat')}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title={t('window_maximize', 'Maximalizovat')}
            aria-label={t('window_maximize', 'Maximalizovat')}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded text-slate-400 hover:text-rose-100 hover:bg-rose-600/80 transition-colors"
            title={t('window_close', 'Zavřít')}
            aria-label={t('window_close', 'Zavřít')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
