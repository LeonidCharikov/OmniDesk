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
  HardDrive,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Code2,
  CalendarCheck,
} from 'lucide-react';
import { ToolCategory, WidgetCustomization } from '../../types/tool';
import { useI18n } from '../../i18n/context';
import { SidebarWidgets } from './SidebarWidgets';

interface SidebarProps {
  activeCategory: ToolCategory;
  onSelectCategory: (category: ToolCategory) => void;
  favoritesCount: number;
  onOpenConfig: () => void;
  selectedToolId: string | null;
  onBackToOverview: () => void;
  widgets: WidgetCustomization;
  onToggleWidget: (widgetId: string) => void;
  onUpdateQuickNote: (text: string) => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (taskText: string) => void;
  onDeleteTask: (taskId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeCategory,
  onSelectCategory,
  favoritesCount,
  onOpenConfig,
  selectedToolId,
  onBackToOverview,
  widgets,
  onToggleWidget,
  onUpdateQuickNote,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  isOpen,
  onToggle,
}) => {
  const { t } = useI18n();

  const isCollapsed = !isOpen;

  const categories: Array<{ id: ToolCategory; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'all', label: t('cat_all', 'Všechny nástroje'), icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'favorites', label: t('cat_favorites', 'Oblíbené'), icon: <Star className="w-4 h-4" />, count: favoritesCount },
    { id: 'files', label: t('cat_files', 'Soubory & Dokumenty'), icon: <FileBox className="w-4 h-4" /> },
    { id: 'programming', label: t('cat_programming', 'Programování & Kód'), icon: <Code2 className="w-4 h-4" /> },
    { id: 'planning', label: t('cat_planning', 'Plánování & Produktivita'), icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'math', label: t('cat_math', 'Matematika'), icon: <Calculator className="w-4 h-4" /> },
    { id: 'science', label: t('cat_science', 'Věda & Technika'), icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'finance', label: t('cat_finance', 'Finance & Měny'), icon: <Coins className="w-4 h-4" /> },
    { id: 'utilities', label: t('cat_utilities', 'Utility'), icon: <Wrench className="w-4 h-4" /> },
    { id: 'architecture', label: t('cat_architecture', 'Tauri Blueprint'), icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <aside
      className={`
        h-screen bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between select-none overflow-hidden sidebar-container
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-16'}
        max-sm:fixed max-sm:top-0 max-sm:left-0 max-sm:z-40
        ${isOpen ? 'max-sm:w-64' : 'max-sm:w-0 max-sm:border-r-0'}
      `}
    >
      <div className="p-4 space-y-5 overflow-y-auto flex-1 min-w-0">
        {/* Brand Lockup + Toggle */}
        <div className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div 
            onClick={onBackToOverview}
            className={`flex items-center gap-3 cursor-pointer group min-w-0 ${isCollapsed ? 'px-0' : 'px-2'}`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            {isOpen && (
              <div className="sidebar-brand-copy min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-white">OmniDesk</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/50">
                    TAURI
                  </span>
                </div>
                <span className="text-xs text-slate-400 block -mt-0.5">Desktop Multi-Tool</span>
              </div>
            )}
          </div>
          {/* Collapse/expand toggle – hidden on mobile (hamburger is in header) */}
          <button
            onClick={onToggle}
            className={`hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 ${
              isCollapsed ? 'absolute right-0 top-0' : ''
            }`}
            title={isOpen ? t('collapse_sidebar', 'Sbalit panel') : t('expand_sidebar', 'Rozbalit panel')}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Categories Navigation */}
        <div className="space-y-1">
          {isOpen && (
            <span className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
              {t('categories', 'Kategorie nástrojů')}
            </span>
          )}
          {categories.map(cat => {
            const isActive = activeCategory === cat.id && !selectedToolId;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onBackToOverview();
                }}
                className={`${isCollapsed ? 'w-10 h-10 p-0 justify-center mx-auto' : 'w-full px-3 py-2 justify-between min-w-0'} flex items-center rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
                title={isCollapsed ? cat.label : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {cat.icon}
                  {isOpen && <span className="truncate whitespace-nowrap">{cat.label}</span>}
                </div>
                {isOpen && cat.count !== undefined && (
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

      {/* Mini-Widgets Area – hidden when collapsed */}
      <SidebarWidgets
        widgets={widgets}
        onToggleWidget={onToggleWidget}
        onUpdateQuickNote={onUpdateQuickNote}
        onToggleTask={onToggleTask}
        onAddTask={onAddTask}
        onDeleteTask={onDeleteTask}
        onOpenWidgetSettings={onOpenConfig}
        isCollapsed={isCollapsed}
      />

      {/* Footer / System Settings */}
      <div className="p-3 border-t border-slate-900 bg-slate-950/80 shrink-0">
        <button
          onClick={onOpenConfig}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
        >
          <Settings className="w-3.5 h-3.5 text-indigo-400" />
          {isOpen && <span>{t('settings_and_backup', 'Nastavení & Záloha')}</span>}
        </button>
      </div>
    </aside>
  );
};
