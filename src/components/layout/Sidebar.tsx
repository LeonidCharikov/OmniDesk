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
  Wifi, 
  WifiOff, 
  Settings,
  HardDrive
} from 'lucide-react';
import { ToolCategory } from '../../types/tool';
import { useI18n } from '../../i18n/context';

interface SidebarProps {
  activeCategory: ToolCategory;
  onSelectCategory: (category: ToolCategory) => void;
  favoritesCount: number;
  isSimulatedOffline: boolean;
  onToggleOffline: () => void;
  onOpenConfig: () => void;
  selectedToolId: string | null;
  onBackToOverview: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeCategory,
  onSelectCategory,
  favoritesCount,
  isSimulatedOffline,
  onToggleOffline,
  onOpenConfig,
  selectedToolId,
  onBackToOverview,
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
    { id: 'architecture', label: t('cat_architecture', 'Tauri & Kód'), icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 h-screen bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none">
      <div className="p-4 space-y-6">
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

      {/* Footer / System Connectivity & Settings */}
      <div className="p-4 border-t border-slate-900 space-y-3 bg-slate-950/60">
        {/* Offline Simulation Switcher */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t('connectivity_status', 'Stav konektivity')}
            </span>
            <span className={`flex items-center gap-1 text-[11px] font-mono ${
              isSimulatedOffline ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {isSimulatedOffline ? (
                <>
                  <WifiOff className="w-3 h-3" />
                  {t('offline', 'Offline')}
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3" />
                  {t('online', 'Online')}
                </>
              )}
            </span>
          </div>

          <button
            onClick={onToggleOffline}
            className={`w-full py-1.5 px-2 text-[11px] font-medium rounded-lg border transition-colors ${
              isSimulatedOffline
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/40'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {isSimulatedOffline ? t('disable_simulation', 'Zrušit simulaci offline') : t('simulate_offline', 'Simulovat offline režim')}
          </button>
        </div>

        {/* Local JSON config button */}
        <button
          onClick={onOpenConfig}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900/40 hover:bg-slate-900 rounded-lg border border-slate-800 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{t('local_config', 'Lokální JSON konfigurace')}</span>
        </button>
      </div>
    </aside>
  );
};
