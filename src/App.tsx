import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToolGrid } from './components/layout/ToolGrid';
import { CommandPalette, ConfigTabId } from './components/layout/CommandPalette';
import { ConfigModal, ConfigTabType } from './components/ui/ConfigModal';
import { ToastContainer } from './components/ui/ToastContainer';
import { ShortcutsHelpModal } from './components/ui/ShortcutsHelpModal';
import { SmartDropModal } from './components/ui/SmartDropModal';
import { TOOLS_REGISTRY } from './tools/registry';
import { ThemeId, ToolCategory, UserConfig, WidgetCustomization } from './types/tool';
import { loadUserConfig, saveUserConfig, DEFAULT_CONFIG } from './services/storage';
import { applyTheme, isLightTheme } from './services/themes';
import { useI18n } from './i18n/context';
import { Info, FileUp } from 'lucide-react';
import { getToolCatalogText } from './i18n/toolCatalog';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { DEFAULT_SHORTCUTS, isTypingTarget, matchesShortcutCombo } from './services/shortcutsService';
import { clearPendingToolPipe, setPendingToolPipe } from './services/toolPipeService';
import { trimDesktopMemory } from './services/desktopToolsService';
import { toastService } from './services/toastService';
import {
  invokeRustCommand,
  isTauri,
  openExternalUrl,
  registerTauriDropListener,
} from './services/fileSystemService';
import {
  checkForDesktopUpdate,
  DesktopUpdateCheckResult,
  DesktopUpdateProgress,
  disposeDesktopUpdateHandle,
  GITHUB_RELEASES_LATEST_URL,
  installDesktopUpdate,
} from './services/updaterService';
import { lazyWithRetry } from './utils/chunkRecovery';
import type {
  McpConnectedToolCapability,
  McpConnectionStatus,
  McpLogEntry,
  OmniDeskMcpClient,
} from './services/mcpClient';

const ArchitectureTool = lazyWithRetry(
  () => import('./tools/architecture/ArchitectureTool'),
  'ArchitectureTool'
);

const VALID_CATEGORIES = new Set<ToolCategory>([
  'all',
  'basic',
  'favorites',
  'files',
  'programming',
  'planning',
  'math',
  'chemistry',
  'science',
  'finance',
  'design',
  'health',
  'utilities',
  'gaming',
  'desktop',
  'architecture',
]);

function readLocationState(): { category: ToolCategory; toolId: string | null } {
  if (typeof window === 'undefined') return { category: 'all', toolId: null };
  const rawHash = window.location.hash.replace(/^#/, '');
  if (!rawHash) return { category: 'all', toolId: null };
  const params = new URLSearchParams(rawHash);
  const toolParam = params.get('tool');
  const catParam = params.get('cat') as ToolCategory | null;
  const inDesktop = isTauri();

  if (toolParam) {
    const found = TOOLS_REGISTRY.find(t => t.id === toolParam);
    if (found && (!found.desktopOnly || inDesktop)) {
      const resolvedCat =
        catParam && VALID_CATEGORIES.has(catParam) && (catParam !== 'desktop' || inDesktop)
          ? catParam
          : found.category;
      return {
        category: resolvedCat,
        toolId: found.id,
      };
    }
  }

  if (catParam && VALID_CATEGORIES.has(catParam) && (catParam !== 'desktop' || inDesktop)) {
    return { category: catParam, toolId: null };
  }

  return { category: 'all', toolId: null };
}

export default function App() {
  const [config, setConfig] = useState<UserConfig>(loadUserConfig);
  const initialNav = React.useMemo(readLocationState, []);
  const [activeCategory, setActiveCategory] = useState<ToolCategory>(initialNav.category);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(initialNav.toolId);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configInitialTab, setConfigInitialTab] = useState<ConfigTabType | undefined>(undefined);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);
  const [isBrowserOnline, setIsBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isToolInfoOpen, setIsToolInfoOpen] = useState(false);
  const runningInTauri = isTauri();
  const availableTools = React.useMemo(
    () => TOOLS_REGISTRY.filter(tool => !tool.desktopOnly || runningInTauri),
    [runningInTauri]
  );
  const [mcpStatus, setMcpStatus] = useState<McpConnectionStatus>('disconnected');
  const [mcpError, setMcpError] = useState<string | undefined>(undefined);
  const [mcpLogs, setMcpLogs] = useState<McpLogEntry[]>([]);
  const [desktopUpdateResult, setDesktopUpdateResult] = useState<DesktopUpdateCheckResult | null>(null);
  const [isInstallingDesktopUpdate, setIsInstallingDesktopUpdate] = useState(false);
  const [desktopUpdateProgress, setDesktopUpdateProgress] = useState<DesktopUpdateProgress | null>(null);
  const selectedToolIdRef = useRef(selectedToolId);
  selectedToolIdRef.current = selectedToolId;
  const didCheckUpdateRef = useRef(false);

  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);

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

  // Global customizable keyboard shortcuts (built-ins + custom user tool shortcuts)
  useEffect(() => {
    const shortcuts = { ...DEFAULT_SHORTCUTS, ...(config.shortcuts || {}) };
    const customBindings = config.customToolShortcuts || [];

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      if (matchesShortcutCombo(e, shortcuts.openSearch)) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        return;
      }

      if (matchesShortcutCombo(e, shortcuts.openSettings)) {
        e.preventDefault();
        setConfigInitialTab(undefined);
        setIsConfigOpen(prev => !prev);
        return;
      }

      if (matchesShortcutCombo(e, shortcuts.toggleSidebar)) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (matchesShortcutCombo(e, shortcuts.goBack)) {
        e.preventDefault();
        if (droppedFile) {
          setDroppedFile(null);
        } else if (isShortcutsHelpOpen) {
          setIsShortcutsHelpOpen(false);
        } else if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (isConfigOpen) {
          setIsConfigOpen(false);
        } else {
          setSelectedToolId(null);
        }
        return;
      }

      if (matchesShortcutCombo(e, shortcuts.openShortcutsHelp)) {
        if (isTypingTarget(e.target) || isConfigOpen) return;
        e.preventDefault();
        setIsShortcutsHelpOpen(prev => !prev);
        return;
      }

      // Skip custom tool shortcuts while a modal is open
      if (isConfigOpen || isSearchOpen || isShortcutsHelpOpen || droppedFile) return;

      for (const binding of customBindings) {
        if (!matchesShortcutCombo(e, binding.combo)) continue;
        const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
        if (!hasModifier && isTypingTarget(e.target)) continue;

        const targetTool = availableTools.find(tool => tool.id === binding.toolId);
        if (targetTool) {
          e.preventDefault();
          setActiveCategory(targetTool.category);
          setSelectedToolId(targetTool.id);
          setConfig(prev => {
            const nextRecent = [targetTool.id, ...(prev.recentToolIds || []).filter(id => id !== targetTool.id)].slice(0, 8);
            const updated = { ...prev, recentToolIds: nextRecent };
            saveUserConfig(updated);
            return updated;
          });
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    availableTools,
    config.shortcuts,
    config.customToolShortcuts,
    isConfigOpen,
    isSearchOpen,
    isShortcutsHelpOpen,
    droppedFile,
    toggleSidebar,
  ]);

  // Sync URL hash with current category / active tool
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.set('cat', activeCategory);
    if (selectedToolId) params.set('tool', selectedToolId);
    const nextHash = params.toString() ? `#${params.toString()}` : '';
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash || window.location.pathname + window.location.search);
    }
  }, [activeCategory, selectedToolId]);

  // Reclaim stale tool handoffs and trim desktop working set when switching tools
  const prevToolIdRef = useRef<string | null>(selectedToolId);
  useEffect(() => {
    const prevToolId = prevToolIdRef.current;
    prevToolIdRef.current = selectedToolId;
    if (!prevToolId || prevToolId === selectedToolId) return;

    if (selectedToolId === null) {
      clearPendingToolPipe();
    }

    if (!isTauri()) return;
    const shouldClearTelemetry = prevToolId === 'system-monitor' || selectedToolId === null;
    const timer = window.setTimeout(() => {
      void trimDesktopMemory(shouldClearTelemetry);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [selectedToolId]);

  // Periodically trim desktop working set after 45s of user inactivity to prevent idle RAM creep
  useEffect(() => {
    if (!isTauri()) return;
    let idleTimer: number | null = null;
    const scheduleIdleTrim = () => {
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
      }
      idleTimer = window.setTimeout(() => {
        idleTimer = null;
        void trimDesktopMemory(false);
      }, 45_000);
    };

    scheduleIdleTrim();
    window.addEventListener('pointerdown', scheduleIdleTrim, { passive: true });
    window.addEventListener('keydown', scheduleIdleTrim, { passive: true });
    return () => {
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      window.removeEventListener('pointerdown', scheduleIdleTrim);
      window.removeEventListener('keydown', scheduleIdleTrim);
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const next = readLocationState();
      setActiveCategory(next.category);
      setSelectedToolId(next.toolId);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
  const updateConfig = useCallback((newConfig: UserConfig) => {
    setConfig(newConfig);
    saveUserConfig(newConfig);
  }, []);

  const handleSelectTool = useCallback(
    (toolId: string) => {
      setSelectedToolId(toolId);
      setConfig(prev => {
        const nextRecent = [toolId, ...(prev.recentToolIds || []).filter(id => id !== toolId)].slice(0, 8);
        const updated = { ...prev, recentToolIds: nextRecent };
        saveUserConfig(updated);
        return updated;
      });
    },
    []
  );

  // Sync config when modified externally (e.g., via MCP daily task updates)
  useEffect(() => {
    const handleConfigUpdated = (event: Event) => {
      const detail = (event as CustomEvent<UserConfig>).detail;
      if (detail) {
        setConfig(detail);
      }
    };
    const handleOpenToolEvent = (event: Event) => {
      const toolId = (event as CustomEvent<{ toolId?: string }>).detail?.toolId;
      if (!toolId) return;
      const target = availableTools.find(tool => tool.id === toolId);
      if (target) {
        setActiveCategory(target.category);
        handleSelectTool(target.id);
      }
    };
    const handleOpenSettingsEvent = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: ConfigTabType }>).detail?.tab;
      setConfigInitialTab(tab);
      setIsConfigOpen(true);
    };
    window.addEventListener('omnidesk-config-updated', handleConfigUpdated);
    window.addEventListener('omnidesk-open-tool', handleOpenToolEvent);
    window.addEventListener('omnidesk-open-settings', handleOpenSettingsEvent);
    return () => {
      window.removeEventListener('omnidesk-config-updated', handleConfigUpdated);
      window.removeEventListener('omnidesk-open-tool', handleOpenToolEvent);
      window.removeEventListener('omnidesk-open-settings', handleOpenSettingsEvent);
    };
  }, [availableTools, handleSelectTool]);

  // Global drag-and-drop file router (ignores events already handled by an active tool)
  useEffect(() => {
    const hasFiles = (e: DragEvent): boolean =>
      Boolean(e.dataTransfer?.types && Array.from(e.dataTransfer.types).includes('Files'));

    const handleDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragCounterRef.current += 1;
      setIsDraggingFile(true);
    };

    const handleDragOver = (e: DragEvent) => {
      if (e.defaultPrevented || !hasFiles(e)) return;
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDraggingFile(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
      if (e.defaultPrevented) return;
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        setDroppedFile(files[0]);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    const unregisterTauriDrop = registerTauriDropListener(files => {
      if (files.length === 0) return;
      const activeId = selectedToolIdRef.current;
      if (activeId && (activeId === 'multi-converter' || activeId === 'image-editor')) {
        return;
      }
      setDroppedFile(files[0]);
    });

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      unregisterTauriDrop();
    };
  }, []);

  // Tauri Desktop Integration: close-to-tray preference + CLI file association startup handoff
  useEffect(() => {
    if (!isTauri()) return;
    invokeRustCommand('set_close_to_tray', {
      enabled: Boolean(config.desktop?.closeToTray),
    }).catch(() => {});
  }, [config.desktop?.closeToTray]);

  useEffect(() => {
    if (!isTauri()) return;
    invokeRustCommand<{ name: string; bytes: number[] } | null>('take_opened_cli_file')
      .then(result => {
        if (result && Array.isArray(result.bytes) && result.bytes.length > 0) {
          const u8 = new Uint8Array(result.bytes);
          setDroppedFile(new File([u8], result.name));
        }
      })
      .catch(() => {});
  }, []);

  // Ensure any external <a href="http..." target="_blank"> opens in the OS default browser when running in Tauri
  useEffect(() => {
    if (!runningInTauri) return;
    const handleDocumentLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!target) return;
      const href = target.getAttribute('href')?.trim() || '';
      if (!/^https?:\/\//i.test(href)) return;
      const isBlankTarget = target.getAttribute('target') === '_blank';
      let isExternalOrigin = false;
      try {
        isExternalOrigin = new URL(href, window.location.href).origin !== window.location.origin;
      } catch {
        isExternalOrigin = true;
      }
      if (isBlankTarget || isExternalOrigin) {
        event.preventDefault();
        void openExternalUrl(href);
      }
    };
    document.addEventListener('click', handleDocumentLinkClick);
    return () => document.removeEventListener('click', handleDocumentLinkClick);
  }, [runningInTauri]);

  const tRef = useRef(t);
  tRef.current = t;

  // Once-per-session desktop auto-update check on app open (Desktop / Tauri only)
  useEffect(() => {
    if (!runningInTauri || didCheckUpdateRef.current) return;
    let cancelled = false;
    const timerId = window.setTimeout(() => {
      if (cancelled) return;
      didCheckUpdateRef.current = true;
      void checkForDesktopUpdate().then(res => {
        if (cancelled) {
          void disposeDesktopUpdateHandle(res.updateHandle);
          return;
        }
        setDesktopUpdateResult(res);
        if (res.status === 'available' && res.availableVersion) {
          toastService.show({
            type: 'info',
            title: tRef.current('update_available_toast', 'Update v{version} available', {
              version: res.availableVersion,
            }),
            message: tRef.current(
              'update_available_toast_desc',
              'Click the download icon in the top bar or open Settings -> Updates to update.'
            ),
            durationMs: 7500,
          });
        }
      });
    }, 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [runningInTauri]);

  const handleTriggerMainScreenUpdate = useCallback(async () => {
    if (!runningInTauri || !desktopUpdateResult || desktopUpdateResult.status !== 'available' || isInstallingDesktopUpdate) {
      return;
    }

    if (desktopUpdateResult.updateHandle) {
      setIsInstallingDesktopUpdate(true);
      setDesktopUpdateProgress({ downloadedBytes: 0, percent: 0 });
      try {
        await installDesktopUpdate(desktopUpdateResult.updateHandle, progress => {
          setDesktopUpdateProgress(progress);
        });
      } catch (err) {
        setIsInstallingDesktopUpdate(false);
        setDesktopUpdateProgress(null);
        const fallbackUrl =
          desktopUpdateResult.installerUrl || desktopUpdateResult.releaseUrl || GITHUB_RELEASES_LATEST_URL;
        void openExternalUrl(fallbackUrl);
        toastService.show({
          type: 'error',
          title: t('updates_error_title', 'Unable to check for updates'),
          message: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    const downloadUrl =
      desktopUpdateResult.installerUrl || desktopUpdateResult.releaseUrl || GITHUB_RELEASES_LATEST_URL;
    await openExternalUrl(downloadUrl);
  }, [runningInTauri, desktopUpdateResult, isInstallingDesktopUpdate, t]);

  // Manage MCP Bridge client lifecycle (Desktop / Tauri only — never initialized in web version)
  const mcpClientRef = useRef<OmniDeskMcpClient | null>(null);
  const [mcpClientReady, setMcpClientReady] = useState(false);

  useEffect(() => {
    if (!runningInTauri) return;
    let disposed = false;
    let unbindStatus: (() => void) | undefined;
    let unbindLog: (() => void) | undefined;

    void import('./services/mcpClient').then(({ OmniDeskMcpClient: ClientClass }) => {
      if (disposed) return;
      const client = new ClientClass({
        accessMode: config.mcp?.accessMode ?? 'readonly',
        getAvailableTools: () =>
          TOOLS_REGISTRY.map(tool => ({
            id: tool.id,
            title: tool.title,
            category: tool.category,
            shortDesc: tool.shortDesc,
          })),
        onOpenTool: (toolId: string) => {
          const target = TOOLS_REGISTRY.find(tool => tool.id === toolId);
          if (target) {
            setActiveCategory(target.category);
            handleSelectTool(target.id);
          }
        },
      });
      mcpClientRef.current = client;
      unbindStatus = client.onStatusChange((status, err) => {
        setMcpStatus(status);
        setMcpError(err);
      });
      unbindLog = client.onLog(setMcpLogs);
      setMcpClientReady(true);
    });

    return () => {
      disposed = true;
      unbindStatus?.();
      unbindLog?.();
      if (mcpClientRef.current) {
        void mcpClientRef.current.disconnect();
        mcpClientRef.current = null;
      }
      setMcpClientReady(false);
    };
  }, [runningInTauri, handleSelectTool]);

  const handleClearMcpLogs = useCallback(() => {
    mcpClientRef.current?.clearLogs();
  }, []);

  const handleReconnectMcp = useCallback(() => {
    if (!runningInTauri) return;
    const client = mcpClientRef.current;
    const mcpCfg = config.mcp;
    if (!client || !mcpCfg?.enabled) return;
    void import('./services/mcpClient').then(({ createTransportFromConfig }) => {
      const transport = createTransportFromConfig(mcpCfg);
      void client.connect(transport, { autoReconnect: mcpCfg.transport === 'websocket' }).catch(() => {
        // Status listener already receives connection error
      });
    });
  }, [runningInTauri, config.mcp]);

  useEffect(() => {
    if (!runningInTauri || !mcpClientReady) return;
    const client = mcpClientRef.current;
    if (!client) return;
    const mcpCfg = config.mcp;
    client.setAccessMode(mcpCfg?.accessMode ?? 'readonly');

    if (!mcpCfg?.enabled) {
      void client.disconnect();
      return;
    }

    let cancelled = false;
    void import('./services/mcpClient').then(({ createTransportFromConfig }) => {
      if (cancelled || mcpClientRef.current !== client) return;
      const transport = createTransportFromConfig(mcpCfg);
      void client.connect(transport, { autoReconnect: mcpCfg.transport === 'websocket' }).catch(() => {
        // Status listener already receives connection error
      });
    });

    return () => {
      cancelled = true;
      void client.disconnect();
    };
  }, [
    runningInTauri,
    mcpClientReady,
    config.mcp?.enabled,
    config.mcp?.transport,
    config.mcp?.wsUrl,
    config.mcp?.authToken,
    config.mcp?.accessMode,
  ]);

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

  const mcpConnectedCapabilities: McpConnectedToolCapability[] = React.useMemo(() => {
    if (!runningInTauri || !mcpClientReady) return [];
    const client = mcpClientRef.current;
    if (!client) return [];
    client.setAccessMode(config.mcp?.accessMode ?? 'readonly');
    return client.getConnectedToolCapabilities();
    // Recompute whenever connection status or permission level changes
  }, [runningInTauri, mcpClientReady, mcpStatus, config.mcp?.accessMode, config.mcp?.enabled]);

  const isEffectiveOffline = !isBrowserOnline || Boolean(config.simulatedOffline);

  // Filter tools based on active category
  const filteredTools = availableTools.filter(tool => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'basic') return Boolean(tool.isBasic);
    if (activeCategory === 'favorites') return config.favorites.includes(tool.id);
    return tool.category === activeCategory;
  });

  const activeTool = selectedToolId ? availableTools.find(t => t.id === selectedToolId) || null : null;
  const visibleFavoritesCount = config.favorites.filter(id =>
    availableTools.some(tool => tool.id === id)
  ).length;

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

  const handleUpdateWidgetCustomization = (customization: Partial<WidgetCustomization>) => {
    const updated = {
      ...config.widgets,
      ...customization,
    };
    updateConfig({
      ...config,
      widgets: updated,
      defaultCurrency: customization.selectedFiat || config.defaultCurrency,
    });
  };

  const getCategoryDisplayName = (cat: ToolCategory) => {
    switch (cat) {
      case 'all': return t('cat_all', 'All Tools');
      case 'basic': return t('cat_basic', 'Everyday Basics');
      case 'favorites': return t('cat_favorites', 'Favorites');
      case 'files': return t('cat_files', 'Files & Documents');
      case 'programming': return t('cat_programming', 'Programming & Code');
      case 'planning': return t('cat_planning', 'Planning & Productivity');
      case 'math': return t('cat_math', 'Mathematics & Calculators');
      case 'chemistry': return t('cat_chemistry', 'Chemistry & Biology');
      case 'science': return t('cat_science', 'Physics & Engineering');
      case 'finance': return t('cat_finance', 'Finance & Crypto');
      case 'design': return t('cat_design', 'Design & Colors');
      case 'health': return t('cat_health', 'Health & Wellness');
      case 'utilities': return t('cat_utilities', 'Utilities & Tools');
      case 'gaming': return t('cat_gaming', 'Gaming & Arcade');
      case 'desktop': return t('cat_desktop', 'Desktop & Automation');
      case 'architecture': return t('cat_architecture', 'Tauri & Code');
      default: return t('catalog', 'Catalog');
    }
  };

  const toolLoadingFallback = (
    <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded-lg bg-slate-800" />
      <div className="h-4 w-80 rounded bg-slate-800/80" />
      <div className="h-48 w-full rounded-xl bg-slate-950/70 border border-slate-800/60" />
    </div>
  );

  return (
    <div className={`flex h-[100dvh] w-full max-w-full overflow-hidden font-sans text-slate-100 theme-${config.themeId || 'midnight'} bg-slate-950`}>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeCategory={activeCategory}
        onSelectCategory={cat => {
          setActiveCategory(cat);
          setSelectedToolId(null);
          closeSidebarOnMobile();
        }}
        favoritesCount={visibleFavoritesCount}
        onOpenConfig={() => setIsConfigOpen(true)}
        selectedToolId={selectedToolId}
        onBackToOverview={() => { setSelectedToolId(null); closeSidebarOnMobile(); }}
        widgets={config.widgets}
        onToggleWidget={handleToggleWidget}
        onUpdateQuickNote={handleUpdateQuickNote}
        onToggleTask={handleToggleTask}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
        onUpdateWidgetCustomization={handleUpdateWidgetCustomization}
        defaultCurrency={config.defaultCurrency || config.widgets?.selectedFiat || 'CZK'}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        availableUpdateVersion={
          desktopUpdateResult?.status === 'available' ? desktopUpdateResult.availableVersion : undefined
        }
        isInstallingUpdate={isInstallingDesktopUpdate}
        updateProgressPercent={desktopUpdateProgress?.percent}
        onTriggerUpdate={() => void handleTriggerMainScreenUpdate()}
      />

      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        <Header
          currentCategoryName={getCategoryDisplayName(activeCategory)}
          activeTool={activeTool}
          onBack={() => setSelectedToolId(null)}
          isFavorite={selectedToolId ? config.favorites.includes(selectedToolId) : false}
          onToggleFavorite={() => selectedToolId && handleToggleFavorite(selectedToolId)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenSettings={() => {
            setConfigInitialTab(undefined);
            setIsConfigOpen(true);
          }}
          onOpenShortcutsHelp={() => setIsShortcutsHelpOpen(true)}
          searchShortcutLabel={config.shortcuts?.openSearch || DEFAULT_SHORTCUTS.openSearch}
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          isOffline={isEffectiveOffline}
          availableUpdateVersion={
            desktopUpdateResult?.status === 'available' ? desktopUpdateResult.availableVersion : undefined
          }
          isInstallingUpdate={isInstallingDesktopUpdate}
          updateProgressPercent={desktopUpdateProgress?.percent}
          onTriggerUpdate={() => void handleTriggerMainScreenUpdate()}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 bg-slate-950/40 relative">
          <div className="max-w-7xl mx-auto">
            {activeCategory === 'architecture' ? (
              <ErrorBoundary key="architecture">
                <Suspense fallback={toolLoadingFallback}>
                  <ArchitectureTool />
                </Suspense>
              </ErrorBoundary>
            ) : activeTool ? (
              <div className="relative min-w-0">
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => setIsToolInfoOpen(true)}
                    aria-label={t('tool_info_label', 'Tool info')}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 bg-slate-900/60 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                {isToolInfoOpen && (
                  <div role="dialog" aria-modal="true" className="absolute z-30 right-0 top-10 w-80 max-w-[calc(100vw-2rem)] p-4 rounded-xl border border-indigo-500/40 bg-slate-900 shadow-2xl">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-white">{getToolCatalogText(activeTool.id, 'title', language, t(`tool_${activeTool.id.replace(/-/g, '_')}_title`, activeTool.title))}</h3>
                      <button type="button" onClick={() => setIsToolInfoOpen(false)} className="text-slate-400 hover:text-white" aria-label={t('close', 'Close')}>×</button>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{getToolCatalogText(activeTool.id, 'desc', language, t(`tool_${activeTool.id.replace(/-/g, '_')}_desc`, activeTool.shortDesc))}</p>
                  </div>
                )}
                <ErrorBoundary key={activeTool.id}>
                  <Suspense fallback={toolLoadingFallback}>
                    {React.createElement(activeTool.component, {
                      isOffline: isEffectiveOffline,
                      currency: config.defaultCurrency || config.widgets?.selectedFiat || 'CZK',
                    } as unknown as Record<string, unknown>)}
                  </Suspense>
                </ErrorBoundary>
              </div>
            ) : (
              <ToolGrid
                tools={filteredTools}
                favorites={config.favorites}
                recentToolIds={config.recentToolIds || []}
                onSelectTool={handleSelectTool}
                onToggleFavorite={handleToggleFavorite}
                isOffline={isEffectiveOffline}
                activeCategory={activeCategory}
              />
            )}
          </div>
        </main>
      </div>

      {isDraggingFile && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-slate-950/70 backdrop-blur-xs border-2 border-dashed border-indigo-400/70 m-3 rounded-2xl">
          <div className="px-6 py-4 rounded-2xl bg-slate-900 border border-indigo-500/50 shadow-2xl flex items-center gap-3 text-slate-100">
            <FileUp className="w-5 h-5 text-indigo-400 shrink-0" />
            <span className="text-sm font-semibold">
              {t('smart_drop_overlay', 'Drop file anywhere to open in OmniDesk')}
            </span>
          </div>
        </div>
      )}

      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        tools={availableTools}
        favorites={config.favorites}
        recentToolIds={config.recentToolIds || []}
        customToolShortcuts={config.customToolShortcuts || []}
        onSelectTool={id => {
          handleSelectTool(id);
          const tool = availableTools.find(t => t.id === id);
          if (tool) setActiveCategory(tool.category);
        }}
        onOpenSettingsTab={(tab: ConfigTabId) => {
          setConfigInitialTab(tab);
          setIsConfigOpen(true);
        }}
        onSelectTheme={(themeId: ThemeId) => {
          updateConfig({
            ...config,
            themeId,
            theme: isLightTheme(themeId) ? 'light' : 'dark',
          });
          toastService.show({
            type: 'success',
            title: t('toast_theme_switched', 'Theme updated'),
          });
        }}
        isOffline={isEffectiveOffline}
      />

      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => {
          setIsConfigOpen(false);
          setConfigInitialTab(undefined);
        }}
        config={config}
        initialTab={configInitialTab}
        onResetDefaults={handleResetDefaults}
        onUpdateConfig={handleUpdateConfig}
        mcpStatus={mcpStatus}
        mcpError={mcpError}
        mcpLogs={mcpLogs}
        mcpConnectedCapabilities={mcpConnectedCapabilities}
        onClearMcpLogs={handleClearMcpLogs}
        onReconnectMcp={handleReconnectMcp}
        externalUpdateResult={desktopUpdateResult}
        onExternalUpdateResultChange={setDesktopUpdateResult}
      />

      <ShortcutsHelpModal
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
        shortcuts={config.shortcuts || DEFAULT_SHORTCUTS}
        customToolShortcuts={config.customToolShortcuts || []}
        onCustomize={() => {
          setConfigInitialTab('shortcuts');
          setIsConfigOpen(true);
        }}
      />

      <SmartDropModal
        file={droppedFile}
        onClose={() => setDroppedFile(null)}
        onLaunchWithFile={(toolId, file) => {
          setPendingToolPipe(toolId, { kind: 'file', file });
          setDroppedFile(null);
          const target = availableTools.find(item => item.id === toolId);
          if (target) {
            setActiveCategory(target.category);
            handleSelectTool(target.id);
          }
          toastService.show({
            type: 'success',
            title: t('smart_drop_opened_toast', 'Opened {file}', { file: file.name }),
          });
        }}
      />

      <ToastContainer />
    </div>
  );
}
