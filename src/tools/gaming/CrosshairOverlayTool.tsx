import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Check,
  Copy,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  Palette,
  Power,
  RotateCcw,
  Search,
  Shuffle,
  Sliders,
  Trash2,
  Upload,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { isTauri, saveFileWithPicker } from '../../services/fileSystemService';
import { toastService } from '../../services/toastService';
import { DesktopOnlyGuard } from '../desktop/DesktopOnlyGuard';
import {
  getDesktopCrosshairStatus,
  hideDesktopCrosshairOverlay,
  listDesktopCrosshairMonitors,
  openDesktopCrosshairOverlay,
  setDesktopCrosshairHotkey,
  updateDesktopCrosshairOverlay,
} from '../../services/desktopToolsService';
import {
  buildCrosshairSvgMarkup,
  CROSSHAIR_COLOR_SWATCHES,
  CROSSHAIR_HOTKEYS,
  CROSSHAIR_PRESETS,
  CrosshairConfig,
  CrosshairGameTag,
  CrosshairHotkey,
  decodeCrosshairShareCode,
  DEFAULT_CROSSHAIR_CONFIG,
  DesktopMonitorInfo,
  encodeCrosshairShareCode,
  generateRandomCrosshair,
  sanitizeCrosshairConfig,
  SavedCrosshairProfile,
} from './crosshair.logic';
import { CrosshairSvg } from './CrosshairSvg';

const ACTIVE_STORAGE_KEY = 'omnidesk_crosshair_active_v1';
const SAVED_STORAGE_KEY = 'omnidesk_crosshair_saved_v1';
const PREFS_STORAGE_KEY = 'omnidesk_crosshair_prefs_v1';

type StudioTab = 'presets' | 'editor' | 'saved' | 'share';
type PreviewBg = 'dark' | 'sky' | 'foliage' | 'dust' | 'grid';

interface CrosshairPrefs {
  monitorIndex: number;
  hotkey: CrosshairHotkey;
}

const GAME_FILTERS: Array<{ id: 'all' | CrosshairGameTag; label: string }> = [
  { id: 'all', label: 'All Games' },
  { id: 'cs2', label: 'Counter-Strike 2' },
  { id: 'valorant', label: 'Valorant' },
  { id: 'apex', label: 'Apex Legends' },
  { id: 'rust', label: 'Rust' },
  { id: 'fortnite', label: 'Fortnite' },
  { id: 'minecraft', label: 'Minecraft' },
  { id: 'pubg', label: 'PUBG' },
  { id: 'r6', label: 'Rainbow Six Siege' },
];

function loadActiveConfig(): CrosshairConfig {
  try {
    const raw = localStorage.getItem(ACTIVE_STORAGE_KEY);
    if (!raw) return DEFAULT_CROSSHAIR_CONFIG;
    return sanitizeCrosshairConfig(JSON.parse(raw) as Partial<CrosshairConfig>);
  } catch {
    return DEFAULT_CROSSHAIR_CONFIG;
  }
}

function loadSavedProfiles(): SavedCrosshairProfile[] {
  try {
    const raw = localStorage.getItem(SAVED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCrosshairProfile[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(p => p && typeof p.id === 'string' && p.config)
      .map(p => ({
        id: p.id,
        createdAt: Number(p.createdAt) || Date.now(),
        config: sanitizeCrosshairConfig(p.config),
      }));
  } catch {
    return [];
  }
}

function loadPrefs(): CrosshairPrefs {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { monitorIndex: 0, hotkey: 'F8' };
    const parsed = JSON.parse(raw) as Partial<CrosshairPrefs>;
    const hk = CROSSHAIR_HOTKEYS.includes(parsed.hotkey as CrosshairHotkey)
      ? (parsed.hotkey as CrosshairHotkey)
      : 'F8';
    return {
      monitorIndex: Math.max(0, Math.round(Number(parsed.monitorIndex) || 0)),
      hotkey: hk,
    };
  } catch {
    return { monitorIndex: 0, hotkey: 'F8' };
  }
}

export const CrosshairOverlayTool: React.FC = () => {
  const { t } = useI18n();
  const runningInTauri = isTauri();

  const [tab, setTab] = useState<StudioTab>('presets');
  const [config, setConfig] = useState<CrosshairConfig>(loadActiveConfig);
  const [savedProfiles, setSavedProfiles] = useState<SavedCrosshairProfile[]>(loadSavedProfiles);
  const [prefs, setPrefs] = useState<CrosshairPrefs>(loadPrefs);
  const [monitors, setMonitors] = useState<DesktopMonitorInfo[]>([]);
  const [overlayActive, setOverlayActive] = useState(false);
  const [globalHotkeySupported, setGlobalHotkeySupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState<'all' | CrosshairGameTag>('all');
  const [presetSearch, setPresetSearch] = useState('');
  const [previewBg, setPreviewBg] = useState<PreviewBg>('dark');
  const [importText, setImportText] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const syncTimerRef = useRef<number | null>(null);

  const persistConfig = useCallback((next: CrosshairConfig) => {
    try {
      localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
  }, []);

  const persistSaved = useCallback((next: SavedCrosshairProfile[]) => {
    try {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
  }, []);

  const persistPrefs = useCallback((next: CrosshairPrefs) => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
  }, []);

  const updateConfig = useCallback(
    (patch: Partial<CrosshairConfig>) => {
      setConfig(prev => {
        const next = sanitizeCrosshairConfig({ ...prev, ...patch });
        persistConfig(next);
        return next;
      });
    },
    [persistConfig]
  );

  // Sync live preset updates pushed from Desktop MCP Bridge
  useEffect(() => {
    const handleExternalUpdate = () => {
      setConfig(loadActiveConfig());
    };
    window.addEventListener('omnidesk-crosshair-updated', handleExternalUpdate);
    return () => {
      window.removeEventListener('omnidesk-crosshair-updated', handleExternalUpdate);
    };
  }, []);

  // Sync with native Tauri overlay state & monitor inventory
  useEffect(() => {
    if (!runningInTauri) return;
    let disposed = false;
    let unlistenStatus: (() => void) | null = null;

    void listDesktopCrosshairMonitors()
      .then(list => {
        if (!disposed) setMonitors(list);
      })
      .catch(() => {});

    void getDesktopCrosshairStatus()
      .then(st => {
        if (disposed) return;
        setOverlayActive(st.active);
        setGlobalHotkeySupported(st.global_hotkey_supported);
      })
      .catch(() => {});

    void setDesktopCrosshairHotkey(prefs.hotkey).catch(() => {});

    void import('@tauri-apps/api/event')
      .then(async ({ listen }) => {
        if (disposed) return;
        const stop = await listen<{ active?: boolean }>('omnidesk:crosshair-status', ev => {
          if (typeof ev.payload?.active === 'boolean') {
            setOverlayActive(ev.payload.active);
          }
        });
        if (disposed) stop();
        else unlistenStatus = stop;
      })
      .catch(() => {});

    return () => {
      disposed = true;
      unlistenStatus?.();
    };
  }, [runningInTauri, prefs.hotkey]);

  // Live-push config changes to active native overlay window
  useEffect(() => {
    if (!runningInTauri) return;
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = window.setTimeout(() => {
      void updateDesktopCrosshairOverlay({
        configJson: JSON.stringify(config),
        monitorIndex: prefs.monitorIndex,
        offsetX: config.offsetX,
        offsetY: config.offsetY,
      }).catch(() => {});
    }, 20);

    return () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, [runningInTauri, config, prefs.monitorIndex]);

  const handleToggleOverlay = useCallback(async () => {
    if (!runningInTauri || busy) return;
    setBusy(true);
    setOverlayError(null);
    const withTimeout = <T,>(promise: Promise<T>, ms = 10_000): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          reject(new Error('Crosshair overlay command timed out. Please retry.'));
        }, ms);
        promise.then(
          val => {
            window.clearTimeout(timer);
            resolve(val);
          },
          err => {
            window.clearTimeout(timer);
            reject(err);
          }
        );
      });

    try {
      if (overlayActive) {
        const st = await withTimeout(hideDesktopCrosshairOverlay());
        setOverlayActive(st.active);
        toastService.show({
          type: 'info',
          title: t('xh_overlay_hidden_toast', 'Crosshair overlay hidden'),
        });
      } else {
        const st = await withTimeout(
          openDesktopCrosshairOverlay({
            configJson: JSON.stringify(config),
            monitorIndex: prefs.monitorIndex,
            offsetX: config.offsetX,
            offsetY: config.offsetY,
          })
        );
        setOverlayActive(st.active);
        toastService.show({
          type: 'success',
          title: t('xh_overlay_active_toast', 'Crosshair overlay active ({hotkey} to toggle)', {
            hotkey: prefs.hotkey,
          }),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setOverlayError(msg);
      toastService.show({
        type: 'error',
        title: msg,
      });
    } finally {
      setBusy(false);
    }
  }, [runningInTauri, busy, overlayActive, config, prefs.monitorIndex, prefs.hotkey, t]);

  const handleBringToFront = useCallback(async () => {
    if (!runningInTauri || busy || !overlayActive) return;
    setBusy(true);
    setOverlayError(null);
    try {
      const st = await openDesktopCrosshairOverlay({
        configJson: JSON.stringify(config),
        monitorIndex: prefs.monitorIndex,
        offsetX: config.offsetX,
        offsetY: config.offsetY,
      });
      setOverlayActive(st.active);
      toastService.show({
        type: 'success',
        title: t('xh_raised_toast', 'Crosshair re-centered & brought to front'),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setOverlayError(msg);
      toastService.show({ type: 'error', title: msg });
    } finally {
      setBusy(false);
    }
  }, [runningInTauri, busy, overlayActive, config, prefs.monitorIndex, t]);

  // In-window hotkey fallback (only when OS global hotkey is unavailable, preventing double-toggle)
  useEffect(() => {
    if (!runningInTauri || globalHotkeySupported) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === prefs.hotkey) {
        e.preventDefault();
        void handleToggleOverlay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [runningInTauri, globalHotkeySupported, prefs.hotkey, handleToggleOverlay]);

  const filteredPresets = useMemo(() => {
    const q = presetSearch.trim().toLowerCase();
    return CROSSHAIR_PRESETS.filter(p => {
      if (gameFilter !== 'all' && p.game !== gameFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.game.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q)
      );
    });
  }, [gameFilter, presetSearch]);

  const shareCode = useMemo(() => encodeCrosshairShareCode(config), [config]);

  const handleSaveProfile = () => {
    const profile: SavedCrosshairProfile = {
      id: `xh-${Date.now()}`,
      createdAt: Date.now(),
      config: { ...config },
    };
    const next = [profile, ...savedProfiles].slice(0, 40);
    setSavedProfiles(next);
    persistSaved(next);
    toastService.show({
      type: 'success',
      title: t('xh_saved_toast', 'Saved "{name}" to profiles', { name: config.name }),
    });
  };

  const handleDeleteProfile = (id: string) => {
    const next = savedProfiles.filter(p => p.id !== id);
    setSavedProfiles(next);
    persistSaved(next);
  };

  const handleRandomize = () => {
    const next = generateRandomCrosshair();
    setConfig(next);
    persistConfig(next);
  };

  const handleCopyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1600);
      toastService.show({
        type: 'success',
        title: t('xh_code_copied_toast', 'Crosshair share code copied'),
      });
    } catch {
      toastService.show({ type: 'error', title: t('xh_copy_failed', 'Could not copy to clipboard') });
    }
  };

  const handleImportCode = () => {
    const decoded = decodeCrosshairShareCode(importText);
    if (!decoded) {
      toastService.show({
        type: 'error',
        title: t('xh_import_invalid', 'Invalid crosshair code or JSON'),
      });
      return;
    }
    setConfig(decoded);
    persistConfig(decoded);
    setImportText('');
    toastService.show({
      type: 'success',
      title: t('xh_import_success', 'Imported crosshair "{name}"', { name: decoded.name }),
    });
  };

  const handleExportSvg = async () => {
    const svg = buildCrosshairSvgMarkup(config, 256);
    await saveFileWithPicker({
      content: svg,
      suggestedName: `${config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'crosshair'}.svg`,
      mimeType: 'image/svg+xml;charset=utf-8',
      filters: [{ name: 'SVG Image', extensions: ['svg'] }],
    });
  };

  const handleExportPng = async () => {
    const svg = buildCrosshairSvgMarkup(config, 256);
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to render crosshair image'));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const pngBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
        if (pngBlob) {
          await saveFileWithPicker({
            content: pngBlob,
            suggestedName: `${config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'crosshair'}.png`,
            mimeType: 'image/png',
            filters: [{ name: 'PNG Image', extensions: ['png'] }],
          });
        }
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  if (!runningInTauri) {
    return (
      <DesktopOnlyGuard
        title={t('tool_crosshair_overlay_title', 'Crosshair Overlay Studio')}
        description={t(
          'tool_crosshair_overlay_desc',
          'Always-on-top click-through desktop gaming crosshair overlay with game presets, live visual editor, monitor picker, and global hotkey toggle.'
        )}
      />
    );
  }

  const previewStageStyle: React.CSSProperties =
    previewBg === 'sky'
      ? { background: 'linear-gradient(180deg, #7dd3fc 0%, #e0f2fe 65%, #cbd5e1 100%)' }
      : previewBg === 'foliage'
        ? { background: 'radial-gradient(circle at 30% 30%, #3f6212 0%, #1a2e05 60%, #14532d 100%)' }
        : previewBg === 'dust'
          ? { background: 'linear-gradient(160deg, #d6b27c 0%, #a88352 55%, #5c462c 100%)' }
          : previewBg === 'grid'
            ? {
                backgroundColor: '#1e293b',
                backgroundImage:
                  'linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }
            : { background: 'radial-gradient(circle at 50% 45%, #1e293b 0%, #090d16 75%)' };

  return (
    <div className="space-y-5">
      {/* Top Bar: Title + Monitor + Hotkey + Primary Overlay Toggle */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-semibold text-white">
              {t('tool_crosshair_overlay_title', 'Crosshair Overlay Studio')}
            </h2>
            <span className="text-xs font-mono text-slate-400">
              · {t('desktop_only_badge', 'Desktop Only')}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-md border ${
                overlayActive
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/70 border-slate-700 text-slate-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  overlayActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              {overlayActive
                ? t('xh_status_live', 'LIVE ON SCREEN')
                : t('xh_status_preview', 'PREVIEW ONLY')}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {t(
              'xh_subtitle',
              'Transparent, always-on-top, click-through crosshair overlay for borderless-windowed games.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {monitors.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={prefs.monitorIndex}
                onChange={e => {
                  const idx = Number(e.target.value) || 0;
                  const next = { ...prefs, monitorIndex: idx };
                  setPrefs(next);
                  persistPrefs(next);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {monitors.map(m => (
                  <option key={m.index} value={m.index}>
                    {m.name} ({m.width}×{m.height}
                    {m.is_primary ? ' · Primary' : ''})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {t('xh_hotkey_label', 'Hotkey:')}
            </span>
            <select
              value={prefs.hotkey}
              onChange={e => {
                const hk = e.target.value as CrosshairHotkey;
                const next = { ...prefs, hotkey: hk };
                setPrefs(next);
                persistPrefs(next);
                void setDesktopCrosshairHotkey(hk).catch(() => {});
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
            >
              {CROSSHAIR_HOTKEYS.map(hk => (
                <option key={hk} value={hk}>
                  {hk}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleToggleOverlay()}
            className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 ${
              overlayActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : overlayActive ? (
              <Eye className="w-4 h-4" />
            ) : (
              <Power className="w-4 h-4" />
            )}
            <span>
              {overlayActive
                ? t('xh_overlay_on_btn', 'Overlay Active ({hotkey})', { hotkey: prefs.hotkey })
                : t('xh_overlay_off_btn', 'Enable Overlay ({hotkey})', { hotkey: prefs.hotkey })}
            </span>
          </button>
        </div>
      </div>

      {overlayError && (
        <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="font-medium">{t('error', 'Error')}:</span>
          <span className="truncate">{overlayError}</span>
        </div>
      )}

      {/* Main Split: Live Stage (Left 5) + Studio Workspace (Right 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Live Tactical Preview + Quick Actions */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{config.name}</h3>
                <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                  {t('xh_offset_readout', 'Offset: {x}px, {y}px · Scale {scale}x', {
                    x: config.offsetX,
                    y: config.offsetY,
                    scale: config.scale.toFixed(2),
                  })}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleRandomize}
                  title={t('xh_randomize_btn', 'Randomize')}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/50 transition-colors"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  title={t('xh_save_profile_btn', 'Save profile')}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/50 transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfig(DEFAULT_CROSSHAIR_CONFIG);
                    persistConfig(DEFAULT_CROSSHAIR_CONFIG);
                  }}
                  title={t('xh_reset_btn', 'Reset')}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Stage */}
            <div
              className="relative h-64 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center od-fixed-dark-stage"
              style={previewStageStyle}
            >
              {/* Faint center reference hairlines */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-white/10 pointer-events-none" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/10 pointer-events-none" />
              <div
                style={{
                  transform: `translate(${Math.max(-90, Math.min(90, config.offsetX))}px, ${Math.max(
                    -90,
                    Math.min(90, config.offsetY)
                  )}px)`,
                }}
              >
                <CrosshairSvg config={config} size={180} />
              </div>

              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-black/55 text-slate-200 backdrop-blur-xs">
                  {overlayActive
                    ? t('xh_status_live', 'LIVE ON SCREEN')
                    : t('xh_status_preview', 'PREVIEW ONLY')}
                </span>
                {overlayActive && (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleBringToFront()}
                      title={t('xh_raise_title', 'Re-center and force overlay back on top')}
                      className="px-2 py-0.5 rounded bg-black/65 text-sky-300 hover:text-white inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('xh_raise_btn', 'Re-raise')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleToggleOverlay()}
                      className="px-2 py-0.5 rounded bg-black/65 text-rose-300 hover:text-white inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>{t('xh_hide_btn', 'Hide')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Background Surface Switcher */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400">
                {t('xh_preview_bg', 'Test surface:')}
              </span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                {(
                  [
                    { id: 'dark' as PreviewBg, label: t('xh_bg_dark', 'Dark') },
                    { id: 'sky' as PreviewBg, label: t('xh_bg_sky', 'Sky') },
                    { id: 'foliage' as PreviewBg, label: t('xh_bg_foliage', 'Foliage') },
                    { id: 'dust' as PreviewBg, label: t('xh_bg_dust', 'Sand') },
                    { id: 'grid' as PreviewBg, label: t('xh_bg_grid', 'Grid') },
                  ] as const
                ).map(bg => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setPreviewBg(bg.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                      previewBg === bg.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              <p>
                {globalHotkeySupported
                  ? t(
                      'xh_borderless_hint',
                      'Tip: Run games in Borderless Windowed mode for guaranteed overlay visibility. Global hotkey {hotkey} toggles the overlay even while minimized to tray.',
                      { hotkey: prefs.hotkey }
                    )
                  : t(
                      'xh_borderless_hint_window',
                      'Tip: Run games in Borderless Windowed mode for guaranteed overlay visibility.'
                    )}
              </p>
              <p className="text-slate-500">
                {t(
                  'xh_fullscreen_note',
                  'Auto-topmost & resolution re-centering keep the overlay visible over Borderless & Windows Flip-Model Fullscreen games. Legacy Exclusive Fullscreen bypasses desktop overlays by OS design (no DLL injection is used, keeping anti-cheat safe).'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Tabs (Presets, Editor, Saved, Share/Export) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800 overflow-x-auto">
            {(
              [
                { id: 'presets' as StudioTab, label: t('xh_tab_presets', 'Presets'), icon: <Crosshair className="w-3.5 h-3.5" /> },
                { id: 'editor' as StudioTab, label: t('xh_tab_editor', 'Editor'), icon: <Sliders className="w-3.5 h-3.5" /> },
                {
                  id: 'saved' as StudioTab,
                  label: `${t('xh_tab_saved', 'Saved')} (${savedProfiles.length})`,
                  icon: <Bookmark className="w-3.5 h-3.5" />,
                },
                { id: 'share' as StudioTab, label: t('xh_tab_share', 'Share & Export'), icon: <Upload className="w-3.5 h-3.5" /> },
              ] as const
            ).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                  tab === item.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: PRESETS */}
          {tab === 'presets' && (
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={presetSearch}
                    onChange={e => setPresetSearch(e.target.value)}
                    placeholder={t('xh_search_presets', 'Search presets or game...')}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  value={gameFilter}
                  onChange={e => setGameFilter(e.target.value as 'all' | CrosshairGameTag)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {GAME_FILTERS.map(gf => (
                    <option key={gf.id} value={gf.id}>
                      {gf.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {filteredPresets.map(preset => {
                  const isSelected = config.name === preset.config.name && config.color === preset.config.color;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setConfig(preset.config);
                        persistConfig(preset.config);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="h-20 rounded-lg od-fixed-dark-stage flex items-center justify-center border border-slate-800/80">
                        <CrosshairSvg config={preset.config} size={76} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{preset.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {GAME_FILTERS.find(g => g.id === preset.game)?.label || preset.game}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: EDITOR */}
          {tab === 'editor' && (
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5 max-h-[540px] overflow-y-auto pr-2">
              {/* Name + Primary Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400">{t('xh_profile_name', 'Crosshair Name')}</label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={e => updateConfig({ name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t('xh_primary_color', 'Primary Color')}</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {CROSSHAIR_COLOR_SWATCHES.map(hex => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => updateConfig({ color: hex, dotColor: hex })}
                        className={`w-6 h-6 rounded-md border transition-transform ${
                          config.color.toLowerCase() === hex.toLowerCase()
                            ? 'border-white scale-110'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                        aria-label={hex}
                      />
                    ))}
                    <input
                      type="color"
                      value={config.color}
                      onChange={e => updateConfig({ color: e.target.value })}
                      className="w-7 h-6 rounded bg-transparent border border-slate-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Lines Section */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showLines}
                      onChange={e => updateConfig({ showLines: e.target.checked })}
                      className="accent-indigo-500"
                    />
                    <span>{t('xh_section_lines', 'Crosshair Lines')}</span>
                  </label>
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.tStyle}
                        disabled={!config.showLines}
                        onChange={e => updateConfig({ tStyle: e.target.checked })}
                        className="accent-indigo-500"
                      />
                      <span>{t('xh_t_style', 'T-Style')}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.diagonal}
                        disabled={!config.showLines}
                        onChange={e => updateConfig({ diagonal: e.target.checked })}
                        className="accent-indigo-500"
                      />
                      <span>{t('xh_diagonal_x', 'Diagonal X')}</span>
                    </label>
                  </div>
                </div>

                {config.showLines && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <SliderControl
                      label={t('xh_line_length', 'Length')}
                      value={config.lineLength}
                      min={1}
                      max={40}
                      step={1}
                      unit="px"
                      onChange={v => updateConfig({ lineLength: v })}
                    />
                    <SliderControl
                      label={t('xh_line_thickness', 'Thickness')}
                      value={config.lineThickness}
                      min={1}
                      max={10}
                      step={0.5}
                      unit="px"
                      onChange={v => updateConfig({ lineThickness: v })}
                    />
                    <SliderControl
                      label={t('xh_line_gap', 'Center Gap')}
                      value={config.lineGap}
                      min={0}
                      max={30}
                      step={1}
                      unit="px"
                      onChange={v => updateConfig({ lineGap: v })}
                    />
                  </div>
                )}
              </div>

              {/* Center Dot & Ring */}
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showDot}
                        onChange={e => updateConfig({ showDot: e.target.checked })}
                        className="accent-indigo-500"
                      />
                      <span>{t('xh_section_dot', 'Center Dot')}</span>
                    </label>
                    <input
                      type="color"
                      value={config.dotColor}
                      disabled={!config.showDot}
                      onChange={e => updateConfig({ dotColor: e.target.value })}
                      className="w-6 h-5 rounded bg-transparent border border-slate-700 cursor-pointer disabled:opacity-40"
                    />
                  </div>
                  {config.showDot && (
                    <SliderControl
                      label={t('xh_dot_size', 'Dot Diameter')}
                      value={config.dotSize}
                      min={1}
                      max={12}
                      step={0.5}
                      unit="px"
                      onChange={v => updateConfig({ dotSize: v })}
                    />
                  )}
                </div>

                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showRing}
                      onChange={e => updateConfig({ showRing: e.target.checked })}
                      className="accent-indigo-500"
                    />
                    <span>{t('xh_section_ring', 'Outer Ring / Optic')}</span>
                  </label>
                  {config.showRing && (
                    <div className="grid grid-cols-2 gap-2">
                      <SliderControl
                        label={t('xh_ring_radius', 'Radius')}
                        value={config.ringRadius}
                        min={4}
                        max={48}
                        step={1}
                        unit="px"
                        onChange={v => updateConfig({ ringRadius: v })}
                      />
                      <SliderControl
                        label={t('xh_ring_thickness', 'Stroke')}
                        value={config.ringThickness}
                        min={1}
                        max={6}
                        step={0.5}
                        unit="px"
                        onChange={v => updateConfig({ ringThickness: v })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Outline + Opacity + Scale + Offset */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showOutline}
                      onChange={e => updateConfig({ showOutline: e.target.checked })}
                      className="accent-indigo-500"
                    />
                    <span>{t('xh_section_outline', 'Contrast Outline')}</span>
                  </label>
                  <input
                    type="color"
                    value={config.outlineColor}
                    disabled={!config.showOutline}
                    onChange={e => updateConfig({ outlineColor: e.target.value })}
                    className="w-6 h-5 rounded bg-transparent border border-slate-700 cursor-pointer disabled:opacity-40"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {config.showOutline && (
                    <SliderControl
                      label={t('xh_outline_thickness', 'Outline Width')}
                      value={config.outlineThickness}
                      min={0.5}
                      max={4}
                      step={0.5}
                      unit="px"
                      onChange={v => updateConfig({ outlineThickness: v })}
                    />
                  )}
                  <SliderControl
                    label={t('xh_opacity', 'Opacity')}
                    value={Math.round(config.opacity * 100)}
                    min={15}
                    max={100}
                    step={5}
                    unit="%"
                    onChange={v => updateConfig({ opacity: v / 100 })}
                  />
                  <SliderControl
                    label={t('xh_scale', 'Overall Scale')}
                    value={config.scale}
                    min={0.5}
                    max={2.5}
                    step={0.05}
                    unit="x"
                    onChange={v => updateConfig({ scale: v })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <SliderControl
                      label={t('xh_offset_x', 'Offset X')}
                      value={config.offsetX}
                      min={-100}
                      max={100}
                      step={1}
                      unit="px"
                      onChange={v => updateConfig({ offsetX: v })}
                    />
                    <SliderControl
                      label={t('xh_offset_y', 'Offset Y')}
                      value={config.offsetY}
                      min={-100}
                      max={100}
                      step={1}
                      unit="px"
                      onChange={v => updateConfig({ offsetY: v })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAVED PROFILES */}
          {tab === 'saved' && (
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {t('xh_saved_hint', 'Save your custom designs locally for instant switching.')}
                </p>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{t('xh_save_current', 'Save Current')}</span>
                </button>
              </div>

              {savedProfiles.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500">
                  {t('xh_saved_empty', 'No saved crosshair profiles yet. Customize a crosshair and click Save Current.')}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {savedProfiles.map(prof => (
                    <div
                      key={prof.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setConfig(prof.config);
                          persistConfig(prof.config);
                        }}
                        className="h-20 rounded-lg od-fixed-dark-stage flex items-center justify-center border border-slate-800/80 hover:border-indigo-500/50 transition-colors"
                      >
                        <CrosshairSvg config={prof.config} size={72} />
                      </button>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium text-white truncate">{prof.config.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(prof.id)}
                          aria-label={t('delete', 'Delete')}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SHARE & EXPORT */}
          {tab === 'share' && (
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {t('xh_share_code_label', 'Shareable Crosshair Code')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareCode}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCopyShareCode()}
                    className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? t('copied', 'Copied') : t('copy', 'Copy')}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-slate-800/80">
                <label className="text-xs font-medium text-slate-300">
                  {t('xh_import_code_label', 'Import Crosshair Code (ODX-... or JSON)')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="ODX-..."
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleImportCode}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shrink-0"
                  >
                    {t('xh_import_btn', 'Import')}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleExportSvg()}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('xh_export_svg', 'Export SVG')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportPng()}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('xh_export_png', 'Export PNG (256×256)')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-200 tabular-nums">
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full accent-indigo-500 cursor-pointer"
    />
  </div>
);
