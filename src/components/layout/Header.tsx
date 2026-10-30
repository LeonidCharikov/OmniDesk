import React, { useId } from 'react';
import { Search, Star, ArrowLeft, ShieldCheck, Languages, Sliders } from 'lucide-react';
import { ToolDefinition } from '../../types/tool';
import { useI18n, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n/context';

interface HeaderProps {
  currentCategoryName: string;
  activeTool: ToolDefinition | null;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenSearch: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCategoryName,
  activeTool,
  onBack,
  isFavorite,
  onToggleFavorite,
  onOpenSearch,
  onOpenSettings,
}) => {
  const { language, setLanguage, t } = useI18n();
  const langSelectId = useId();

  return (
    <header className="min-h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-6 shrink-0 select-none">
      {/* Zone 1: Breadcrumbs & Back Navigation */}
      <div className="flex items-center gap-3 min-w-0">
        {activeTool && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title={t('back', 'Zpět')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-400 truncate min-w-0">
          <span className="font-semibold text-slate-300 hidden sm:inline">OmniDesk</span>
          <span aria-hidden="true" className="text-slate-600">/</span>
          <span className="truncate">{currentCategoryName}</span>
          {activeTool && (
            <>
              <span aria-hidden="true" className="text-slate-600">/</span>
              <span className="text-indigo-400 font-medium truncate">
                {t(`tool_${activeTool.id.replace(/-/g, '_')}_title`, activeTool.title)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Zone 2: Search Affordance */}
      <div className="flex-1 min-w-0 max-w-md">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>{t('search_placeholder', 'Rychlé hledání nástrojů... Ctrl+K')}</span>
          </div>
          <kbd className="hidden sm:block font-mono text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Language Selector & Settings Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Language selector */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <label htmlFor={langSelectId} className="sr-only">{t('interface_language', 'Jazyk rozhraní')}</label>
          <Languages className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <select
            id={langSelectId}
            value={language}
            onChange={e => setLanguage(e.target.value as SupportedLanguage)}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer max-w-20 sm:max-w-none"
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
            <span className="hidden sm:inline">{isFavorite ? t('in_favorites', 'V oblíbených') : t('add_favorite', 'Přidat do oblíbených')}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('local_sandboxed', 'Lokální sandbox')}</span>
          </div>
        )}
      </div>
    </header>
  );
};
