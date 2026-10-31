import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToolGrid } from './components/layout/ToolGrid';
import { CommandPalette } from './components/layout/CommandPalette';
import { ConfigModal } from './components/ui/ConfigModal';
import { ArchitectureTool } from './tools/architecture/ArchitectureTool';
import { TOOLS_REGISTRY } from './tools/registry';
import { ToolCategory, UserConfig } from './types/tool';
import { loadUserConfig, saveUserConfig, DEFAULT_CONFIG } from './services/storage';
import { applyTheme } from './services/themes';
import { useI18n } from './i18n/context';
import { Info } from 'lucide-react';
import { getToolCatalogText } from './i18n/toolCatalog';

export default function App() {
  const [config, setConfig] = useState<UserConfig>(loadUserConfig);
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isToolInfoOpen, setIsToolInfoOpen] = useState(false);

  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);

  // Close sidebar overlay on mobile when navigating
  const closeSidebarOnMobile = useCallback(() => {
    if (window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
  }, []);

  const { t, language } = useI18n();

  // Apply theme dynamically to document root
  useEffect(() => {
    applyTheme(config.themeId || 'midnight');
  }, [config.themeId]);

  useEffect(() => {
    setIsToolInfoOpen(false);
  }, [selectedToolId]);

  useEffect(() => {
    const collapseSidebarForSmallWindow = () => {
      if (window.innerWidth < 900) {
        setIsSidebarOpen(false);
      }
    };

    collapseSidebarForSmallWindow();
    window.addEventListener('resize', collapseSidebarForSmallWindow);
    return () => window.removeEventListener('resize', collapseSidebarForSmallWindow);
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save config
  const updateConfig = (newConfig: UserConfig) => {
    setConfig(newConfig);
    saveUserConfig(newConfig);
  };

  const handleToggleFavorite = (toolId: string) => {
    const isFav = config.favorites.includes(toolId);
    const newFavorites = isFav
      ? config.favorites.filter(id => id !== toolId)
      : [...config.favorites, toolId];

    updateConfig({
      ...config,
      favorites: newFavorites,
    });
  };

  const handleResetDefaults = () => {
    updateConfig(DEFAULT_CONFIG);
    applyTheme(DEFAULT_CONFIG.themeId);
  };

  const isEffectiveOffline = !isBrowserOnline;

  // Filter tools based on active category
  const filteredTools = TOOLS_REGISTRY.filter(tool => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'favorites') return config.favorites.includes(tool.id);
    return tool.category === activeCategory;
  });

  const activeTool = selectedToolId ? TOOLS_REGISTRY.find(t => t.id === selectedToolId) || null : null;

  const handleUpdateConfig = (newConfig: UserConfig) => {
    updateConfig(newConfig);
  };

  const handleToggleWidget = (widgetId: string) => {
    const current = config.widgets?.enabledWidgets || ['clock', 'timer', 'crypto', 'notes'];
    const updated = current.includes(widgetId)
      ? current.filter(id => id !== widgetId)
      : [...current, widgetId];
    updateConfig({
      ...config,
      widgets: {
        ...config.widgets,
        enabledWidgets: updated,
      },
      enabledWidgets: updated,
    });
  };

  const handleUpdateQuickNote = (noteText: string) => {
    updateConfig({
      ...config,
      widgets: {
        ...config.widgets,
        quickNote: noteText,
      },
    });
  };

  const handleToggleTask = (taskId: string) => {
    const tasks = config.widgets?.dailyTasks || [];
    const updated = tasks.map(t => (t.id === taskId ? { ...t, done: !t.done } : t));
    updateConfig({
      ...config,
      widgets: {
        ...config.widgets,
        dailyTasks: updated,
      },
    });
  };

  const handleAddTask = (taskText: string) => {
    const tasks = config.widgets?.dailyTasks || [];
    const newTask = {
      id: Date.now().toString(),
      text: taskText,
      done: false,
    };
    updateConfig({
      ...config,
      widgets: {
        ...config.widgets,
        dailyTasks: [...tasks, newTask],
      },
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const tasks = config.widgets?.dailyTasks || [];
    const updated = tasks.filter(t => t.id !== taskId);
    updateConfig({
      ...config,
      widgets: {
        ...config.widgets,
        dailyTasks: updated,
      },
    });
  };

  const getCategoryDisplayName = (cat: ToolCategory) => {
    switch (cat) {
      case 'all': return t('cat_all', 'Všechny nástroje');
      case 'favorites': return t('cat_favorites', 'Oblíbené');
      case 'files': return t('cat_files', 'Soubory & Dokumenty');
      case 'programming': return t('cat_programming', 'Programování & Kód');
      case 'planning': return t('cat_planning', 'Plánování & Produktivita');
      case 'math': return t('cat_math', 'Matematika & Kalkulačky');
      case 'science': return t('cat_science', 'Věda & Chemie');
      case 'finance': return t('cat_finance', 'Finance & Kryptoměny');
      case 'utilities': return t('cat_utilities', 'Utility & Nástroje');
      case 'architecture': return t('cat_architecture', 'Tauri Blueprint');
      default: return t('catalog', 'Katalog');
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans text-slate-100 theme-${config.themeId || 'midnight'} bg-slate-950`}>
      {/* Mobile sidebar backdrop overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        activeCategory={activeCategory}
        onSelectCategory={cat => {
          setActiveCategory(cat);
          setSelectedToolId(null);
          closeSidebarOnMobile();
        }}
        favoritesCount={config.favorites.length}
        onOpenConfig={() => setIsConfigOpen(true)}
        selectedToolId={selectedToolId}
        onBackToOverview={() => { setSelectedToolId(null); closeSidebarOnMobile(); }}
        widgets={config.widgets}
        onToggleWidget={handleToggleWidget}
        onUpdateQuickNote={handleUpdateQuickNote}
        onToggleTask={handleToggleTask}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <Header
          currentCategoryName={getCategoryDisplayName(activeCategory)}
          activeTool={activeTool}
          onBack={() => setSelectedToolId(null)}
          isFavorite={selectedToolId ? config.favorites.includes(selectedToolId) : false}
          onToggleFavorite={() => selectedToolId && handleToggleFavorite(selectedToolId)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenSettings={() => setIsConfigOpen(true)}
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 bg-slate-950/40">
          <div className="max-w-7xl mx-auto">
            {activeCategory === 'architecture' ? (
              <ArchitectureTool />
            ) : activeTool ? (
              <div className="overflow-x-hidden relative">
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => setIsToolInfoOpen(true)}
                    aria-label={t('tool_info_label', 'Informace o nástroji')}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                {isToolInfoOpen && (
                  <div role="dialog" aria-modal="true" className="absolute z-30 right-0 top-10 w-80 p-4 rounded-xl border border-indigo-500/40 bg-slate-900 shadow-2xl">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-white">{getToolCatalogText(activeTool.id, 'title', language, t(`tool_${activeTool.id.replace(/-/g, '_')}_title`, activeTool.title))}</h3>
                      <button type="button" onClick={() => setIsToolInfoOpen(false)} className="text-slate-400 hover:text-white" aria-label="Close">×</button>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{getToolCatalogText(activeTool.id, 'desc', language, t(`tool_${activeTool.id.replace(/-/g, '_')}_desc`, activeTool.shortDesc))}</p>
                  </div>
                )}
                {/* Active Tool Renderer */}
                {React.createElement(activeTool.component, {
                  isOffline: isEffectiveOffline,
                } as unknown as Record<string, unknown>)}
              </div>
            ) : (
              /* Tool Grid View */
              <ToolGrid
                tools={filteredTools}
                favorites={config.favorites}
                onSelectTool={id => setSelectedToolId(id)}
                onToggleFavorite={handleToggleFavorite}
                isOffline={isEffectiveOffline}
                activeCategory={activeCategory}
              />
            )}
          </div>
        </main>
      </div>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        tools={TOOLS_REGISTRY}
        favorites={config.favorites}
        onSelectTool={id => {
          setSelectedToolId(id);
          const tool = TOOLS_REGISTRY.find(t => t.id === id);
          if (tool) setActiveCategory(tool.category);
        }}
        isOffline={isEffectiveOffline}
      />

      {/* Settings & Config Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onResetDefaults={handleResetDefaults}
        onUpdateConfig={handleUpdateConfig}
      />
    </div>
  );
}
