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

  return (
    <header
      onMouseDown={handleHeaderMouseDown}
      className="min-h-14 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-xl px-3 sm:px-5 py-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4 shrink-0 select-none transition-colors"
    >
      {/* Zone 1: Hamburger + Breadcrumbs & Back Navigation */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden">
        {/* Hamburger toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title={isSidebarOpen ? t('close_sidebar', 'Zavřít panel') : t('open_sidebar', 'Otevřít panel')}
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        {activeTool && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title={t('back', 'Zpět')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div data-tauri-drag-region className="flex items-center gap-2 text-xs text-slate-400 truncate min-w-0">
          <span className="font-semibold text-slate-300 hidden sm:inline">OmniDesk</span>
          <span aria-hidden="true" className="text-slate-600 hidden min-[640px]:inline">/</span>
          <span className="truncate hidden min-[640px]:inline">{currentCategoryName}</span>
          {activeTool && (
            <>
              <span aria-hidden="true" className="text-slate-600 hidden min-[800px]:inline">/</span>
              <span className="text-indigo-400 font-medium truncate hidden min-[800px]:inline">
                {getToolCatalogText(activeTool.id, 'title', language, t(`tool_${activeTool.id.replace(/-/g, '_')}_title`, activeTool.title))}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Zone 2: Search Affordance – full bar on >=1100px, icon-only below */}
      <div className="flex items-center justify-center w-[clamp(2.5rem,24vw,22rem)]">
        {/* Full search bar – hidden below 1100px */}
        <button
          onClick={onOpenSearch}
          className="hidden min-[1100px]:flex w-full min-w-0 items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate">{t('search_placeholder', 'Rychlé hledání nástrojů... Ctrl+K')}</span>
          </div>
          <kbd className="hidden min-[1280px]:block shrink-0 font-mono text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
            Ctrl+K
          </kbd>
        </button>
        {/* Icon-only search button – visible below 1100px */}
        <button
          onClick={onOpenSearch}
          className="min-[1100px]:hidden p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors"
          title={t('search_placeholder', 'Hledat')}
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Zone 3: Language Selector & Settings Actions */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
        {/* Language selector */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <label htmlFor={langSelectId} className="sr-only">{t('interface_language', 'Jazyk rozhraní')}</label>
          <Languages className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <select
            id={langSelectId}
            value={language}
            onChange={e => setLanguage(e.target.value as SupportedLanguage)}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer max-w-20 sm:max-w-none max-[1100px]:w-4 max-[1100px]:text-[0px]"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-200">
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title={t('settings_modal_title', 'Nastavení & Vzhled')}
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
          </button>
        )}

        {activeTool ? (
          <button
            onClick={onToggleFavorite}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isFavorite
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden min-[1100px]:inline">{isFavorite ? t('in_favorites', 'V oblíbených') : t('add_favorite', 'Přidat do oblíbených')}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden min-[1100px]:inline">{t('local_sandboxed', 'Lokální sandbox')}</span>
          </div>
        )}

        {/* Window action buttons (Tauri & Desktop) */}
        <div className="flex items-center ml-1 pl-1 sm:pl-2 border-l border-slate-800/80 gap-0.5">
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
