import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, Plus, RotateCcw, Trash2, AlertCircle } from 'lucide-react';
import {
  BuiltinShortcutActionId,
  CustomToolShortcut,
  ShortcutBindings,
} from '../../types/tool';
import {
  BUILTIN_SHORTCUT_ACTIONS,
  DEFAULT_SHORTCUTS,
  findShortcutConflict,
  normalizeKeyEventToCombo,
} from '../../services/shortcutsService';
import { TOOLS_REGISTRY } from '../../tools/registry';
import { useI18n } from '../../i18n/context';
import { getToolCatalogText } from '../../i18n/toolCatalog';
import { toastService } from '../../services/toastService';
import { isTauri } from '../../services/fileSystemService';

interface ShortcutsSettingsPanelProps {
  shortcuts: ShortcutBindings;
  customToolShortcuts: CustomToolShortcut[];
  onChangeShortcuts: (next: ShortcutBindings) => void;
  onChangeCustomToolShortcuts: (next: CustomToolShortcut[]) => void;
}

export const ShortcutsSettingsPanel: React.FC<ShortcutsSettingsPanelProps> = ({
  shortcuts,
  customToolShortcuts,
  onChangeShortcuts,
  onChangeCustomToolShortcuts,
}) => {
  const { t, language } = useI18n();
  const runningInTauri = isTauri();
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [newToolId, setNewToolId] = useState<string>(TOOLS_REGISTRY[0]?.id || 'calendar');
  const [newToolCombo, setNewToolCombo] = useState<string>('');
  const [recordingNewTool, setRecordingNewTool] = useState<boolean>(false);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  const sortedTools = useMemo(() => {
    return TOOLS_REGISTRY.filter(tool => !tool.desktopOnly || runningInTauri).sort((a, b) => {
      const aTitle = getToolCatalogText(a.id, 'title', language, a.title);
      const bTitle = getToolCatalogText(b.id, 'title', language, b.title);
      return aTitle.localeCompare(bTitle);
    });
  }, [language, runningInTauri]);

  useEffect(() => {
    if (!recordingId && !recordingNewTool) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingId(null);
        setRecordingNewTool(false);
        return;
      }

      const combo = normalizeKeyEventToCombo(e);
      if (!combo) return;

      const conflict = findShortcutConflict(
        combo,
        shortcuts,
        customToolShortcuts,
        recordingId || undefined
      );

      if (conflict) {
        setConflictMsg(
          t('shortcut_conflict_error', 'Shortcut "{combo}" is already assigned.', { combo })
        );
        return;
      }

      setConflictMsg(null);

      if (recordingNewTool) {
        setNewToolCombo(combo);
        setRecordingNewTool(false);
        return;
      }

      if (recordingId) {
        const isBuiltin = BUILTIN_SHORTCUT_ACTIONS.some(a => a.id === recordingId);
        if (isBuiltin) {
          onChangeShortcuts({
            ...shortcuts,
            [recordingId as BuiltinShortcutActionId]: combo,
          });
        } else {
          onChangeCustomToolShortcuts(
            customToolShortcuts.map(item =>
              item.id === recordingId ? { ...item, combo } : item
            )
          );
        }
        setRecordingId(null);
        toastService.show({
          type: 'success',
          title: t('shortcut_saved_toast', 'Shortcut updated'),
          message: combo,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    recordingId,
    recordingNewTool,
    shortcuts,
    customToolShortcuts,
    onChangeShortcuts,
    onChangeCustomToolShortcuts,
    t,
  ]);

  const handleAddCustomShortcut = () => {
    if (!newToolId || !newToolCombo) return;
    const conflict = findShortcutConflict(newToolCombo, shortcuts, customToolShortcuts);
    if (conflict) {
      setConflictMsg(
        t('shortcut_conflict_error', 'Shortcut "{combo}" is already assigned.', {
          combo: newToolCombo,
        })
      );
      return;
    }

    const created: CustomToolShortcut = {
      id: `custom-${Date.now()}`,
      toolId: newToolId,
      combo: newToolCombo,
    };
    onChangeCustomToolShortcuts([...customToolShortcuts, created]);
    setNewToolCombo('');
    setConflictMsg(null);
    toastService.show({
      type: 'success',
      title: t('shortcut_added_toast', 'Custom shortcut created'),
      message: newToolCombo,
    });
  };

  const handleResetAll = () => {
    onChangeShortcuts({ ...DEFAULT_SHORTCUTS });
    onChangeCustomToolShortcuts([]);
    setConflictMsg(null);
    setRecordingId(null);
    setRecordingNewTool(false);
    toastService.show({
      type: 'info',
      title: t('shortcuts_reset_done', 'All shortcuts restored to defaults'),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {t('shortcuts_settings_title', 'Keyboard Shortcuts')}
          </h3>
          <p className="text-xs text-slate-400">
            {t(
              'shortcuts_settings_desc',
              'Customize built-in navigation keybindings or create your own shortcuts to launch any tool instantly.'
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('shortcuts_reset_all_btn', 'Reset All')}</span>
        </button>
      </div>

      {conflictMsg && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{conflictMsg}</span>
        </div>
      )}

      {/* Built-in Actions */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-300 block">
          {t('shortcuts_builtin_heading', 'Workspace Navigation')}
        </span>
        <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/50">
          {BUILTIN_SHORTCUT_ACTIONS.map(action => {
            const currentCombo = shortcuts[action.id] || action.defaultCombo;
            const isRecording = recordingId === action.id;
            const isModified = currentCombo !== action.defaultCombo;
            return (
              <div
                key={action.id}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <span className="font-medium text-slate-200">
                  {t(action.labelKey, action.defaultLabel)}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <kbd className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 font-mono text-[11px] text-indigo-300">
                    {isRecording ? t('shortcut_press_keys', 'Press keys...') : currentCombo}
                  </kbd>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordingNewTool(false);
                      setRecordingId(isRecording ? null : action.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap ${
                      isRecording
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                    }`}
                  >
                    {isRecording
                      ? t('cancel', 'Cancel')
                      : t('shortcut_change_btn', 'Change')}
                  </button>
                  {isModified && (
                    <button
                      type="button"
                      onClick={() =>
                        onChangeShortcuts({ ...shortcuts, [action.id]: action.defaultCombo })
                      }
                      title={t('reset', 'Reset')}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Tool Shortcut */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-semibold text-white">
            {t('shortcuts_add_custom_title', 'Create Custom Tool Shortcut')}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <select
            value={newToolId}
            onChange={e => setNewToolId(e.target.value)}
            aria-label={t('shortcuts_select_tool_label', 'Target Tool')}
            className="sm:col-span-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            {sortedTools.map(tool => (
              <option key={tool.id} value={tool.id}>
                {getToolCatalogText(tool.id, 'title', language, tool.title)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setRecordingId(null);
              setRecordingNewTool(prev => !prev);
            }}
            className={`px-3 py-2 rounded-lg border text-xs font-mono text-left transition-colors truncate ${
              recordingNewTool
                ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            {recordingNewTool
              ? t('shortcut_press_keys', 'Press keys...')
              : newToolCombo || t('shortcut_record_placeholder', 'Click to record key combo...')}
          </button>

          <button
            type="button"
            disabled={!newToolCombo}
            onClick={handleAddCustomShortcut}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('shortcut_add_btn', 'Add Shortcut')}</span>
          </button>
        </div>

        {/* Custom Shortcuts List */}
        {customToolShortcuts.length > 0 && (
          <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-900/40 mt-2">
            {customToolShortcuts.map(binding => {
              const tool = TOOLS_REGISTRY.find(item => item.id === binding.toolId);
              const title = tool
                ? getToolCatalogText(tool.id, 'title', language, tool.title)
                : binding.toolId;
              const isRecording = recordingId === binding.id;
              return (
                <div
                  key={binding.id}
                  className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-slate-200 block truncate">{title}</span>
                    <span className="text-[10px] font-mono text-slate-500">{binding.toolId}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <kbd className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-[11px] text-emerald-300">
                      {isRecording ? t('shortcut_press_keys', 'Press keys...') : binding.combo}
                    </kbd>
                    <button
                      type="button"
                      onClick={() => {
                        setRecordingNewTool(false);
                        setRecordingId(isRecording ? null : binding.id);
                      }}
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200 transition-colors"
                    >
                      {isRecording ? t('cancel', 'Cancel') : t('shortcut_change_btn', 'Change')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeCustomToolShortcuts(
                          customToolShortcuts.filter(item => item.id !== binding.id)
                        )
                      }
                      aria-label={t('delete', 'Delete')}
                      className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
