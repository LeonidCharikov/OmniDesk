import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { ThemeId, UserConfig } from '../../../types/tool';
import { useI18n } from '../../../i18n/context';
import { THEMES } from '../../../services/themes';
import { toastService } from '../../../services/toastService';
import { WORKSPACE_PRESETS, applyWorkspacePreset } from '../../../services/workspacePresetsService';

interface ThemesSettingsTabProps {
  config: UserConfig;
  runningInTauri: boolean;
  onUpdateConfig: (newConfig: UserConfig) => void;
}

export const ThemesSettingsTab: React.FC<ThemesSettingsTabProps> = ({
  config,
  runningInTauri,
  onUpdateConfig,
}) => {
  const { t } = useI18n();
  const currentThemeId = config.themeId || 'midnight';

  const handleSelectTheme = (themeId: ThemeId) => {
    onUpdateConfig({
      ...config,
      themeId,
      theme: themeId === 'light' ? 'light' : 'dark',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">
          {t('choose_color_theme', 'Choose Application Theme')}
        </h3>
        <p className="text-xs text-slate-400">
          {t('theme_description', 'Customize contrast, tint, and overall aesthetics of the OmniDesk workspace.')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {THEMES.map(th => {
          const isSelected = currentThemeId === th.id;
          return (
            <div
              key={th.id}
              onClick={() => handleSelectTheme(th.id)}
              className={`cursor-pointer p-3.5 rounded-xl border transition-all relative group flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-950/20'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white">
                  {t(th.nameKey, th.defaultName)}
                </span>
                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>

              <div
                className="w-full h-14 rounded-lg border p-2 flex flex-col justify-between"
                style={{
                  backgroundColor: th.previewBg,
                  borderColor: th.previewBorder,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: th.previewAccent }}
                  />
                  <div
                    className="h-1.5 w-12 rounded"
                    style={{ backgroundColor: th.previewBorder }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="h-1.5 w-6 rounded"
                    style={{ backgroundColor: th.previewAccent }}
                  />
                  <div
                    className="h-1.5 w-16 rounded"
                    style={{ backgroundColor: th.previewBorder }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {runningInTauri && (
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <div>
              <h4 className="text-xs font-semibold text-white">
                {t('workspace_presets_title', 'Workspace Starter Presets')}
              </h4>
              <p className="text-[11px] text-slate-400">
                {t('workspace_presets_desc', 'Configure pinned favorites and sidebar widgets for your workflow in one click.')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {WORKSPACE_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onUpdateConfig(applyWorkspacePreset(config, preset.id));
                  toastService.show({
                    type: 'success',
                    title: t('workspace_preset_applied', 'Applied "{name}" preset', {
                      name: t(preset.nameKey, preset.defaultName),
                    }),
                  });
                }}
                className="p-3 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 text-left transition-colors"
              >
                <span className="text-xs font-semibold text-white block">
                  {t(preset.nameKey, preset.defaultName)}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                  {t(preset.descKey, preset.defaultDesc)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
