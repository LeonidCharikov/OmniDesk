import React from 'react';
import { 
  LayoutGrid, 
  Star, 
  FileBox, 
  Calculator,
  FlaskConical, 
  Coins, 
  Wrench, 
  Cpu, 
  Settings,
  HardDrive
} from 'lucide-react';
import { ToolCategory } from '../../types/tool';
import { useI18n } from '../../i18n/context';
import { SidebarWidgets } from './SidebarWidgets';

interface SidebarProps {
  activeCategory: ToolCategory;
  onSelectCategory: (category: ToolCategory) => void;
  favoritesCount: number;
  onOpenConfig: () => void;
  selectedToolId: string | null;
  onBackToOverview: () => void;
  enabledWidgets?: string[];
  onToggleWidget?: (widgetId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeCategory,
  onSelectCategory,
  favoritesCount,
  onOpenConfig,
  selectedToolId,
  onBackToOverview,
  enabledWidgets = ['clock', 'timer', 'crypto'],
  onToggleWidget = () => {},
}) => {
  const { t } = useI18n();

  const categories: Array<{ id: ToolCategory; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'all', label: t('cat_all', 'Všechny nástroje'), icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'favorites', label: t('cat_favorites', 'Oblíbené'), icon: <Star className="w-4 h-4" />, count: favoritesCount },
    { id: 'files', label: t('cat_files', 'Soubory & Dokumenty'), icon: <FileBox className="w-4 h-4" /> },
    { id: 'math', label: t('cat_math', 'Matematika'), icon: <Calculator className="w-4 h-4" /> },
    { id: 'science', label: t('cat_science', 'Věda & Technika'), icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'finance', label: t('cat_finance', 'Finance & Měny'), icon: <Coins className="w-4 h-4" /> },
    { id: 'utilities', label: t('cat_utilities', 'Utility'), icon: <Wrench className="w-4 h-4" /> },
    { id: 'architecture', label: t('cat_architecture', 'Tauri Blueprint'), icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 h-screen bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none overflow-hidden">
      <div className="p-4 space-y-5 overflow-y-auto flex-1">
        {/* Brand Lockup */}
        <div 
          onClick={onBackToOverview}
          className="flex items-center gap-3 px-2 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-white">OmniDesk</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                TAURI
              </span>
            </div>
            <span className="text-xs text-slate-400 block -mt-0.5">Desktop Multi-Tool</span>
          </div>
        </div>

        {/* Categories Navigation */}
        <div className="space-y-1">
          <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
            {t('categories', 'Kategorie nástrojů')}
          </span>
          {categories.map(cat => {
            const isActive = activeCategory === cat.id && !selectedToolId;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onBackToOverview();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {cat.icon}
                  <span>{cat.label}</span>
                </div>
                {cat.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mini-Widgets Area (Live Clock, Timer, Crypto) */}
      <SidebarWidgets
        enabledWidgets={enabledWidgets}
        onToggleWidget={onToggleWidget}
        onOpenWidgetSettings={onOpenConfig}
      />

      {/* Footer / System Settings */}
      <div className="p-3 border-t border-slate-900 bg-slate-950/80 shrink-0">
        <button
          onClick={onOpenConfig}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
        >
          <Settings className="w-3.5 h-3.5 text-indigo-400" />
          <span>{t('local_config_backup', 'Záloha & Konfigurátor')}</span>
        </button>
      </div>
    </aside>
  );
};
