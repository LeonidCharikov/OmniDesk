import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpCircle,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '../../../i18n/context';
import { openExternalUrl } from '../../../services/fileSystemService';
import {
  checkForDesktopUpdate,
  DesktopUpdateCheckResult,
  DesktopUpdateProgress,
  disposeDesktopUpdateHandle,
  getDesktopAppVersion,
  GITHUB_RELEASES_LATEST_URL,
  installDesktopUpdate,
} from '../../../services/updaterService';

interface UpdatesSettingsTabProps {
  externalUpdateResult?: DesktopUpdateCheckResult | null;
  onExternalUpdateResultChange?: (res: DesktopUpdateCheckResult | null) => void;
}

export const UpdatesSettingsTab: React.FC<UpdatesSettingsTabProps> = ({
  externalUpdateResult,
  onExternalUpdateResultChange,
}) => {
  const { t } = useI18n();
  const [appVersion, setAppVersion] = useState<string>('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<DesktopUpdateCheckResult | null>(
    externalUpdateResult ?? null
  );
  const [updateProgress, setUpdateProgress] = useState<DesktopUpdateProgress | null>(null);

  useEffect(() => {
    if (externalUpdateResult) {
      setUpdateResult(externalUpdateResult);
    }
  }, [externalUpdateResult]);

  useEffect(() => {
    let cancelled = false;
    void getDesktopAppVersion().then(version => {
      if (!cancelled) setAppVersion(version);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (isCheckingUpdate || isInstallingUpdate) return;
    setIsCheckingUpdate(true);
    setUpdateProgress(null);
    if (updateResult?.updateHandle && updateResult.updateHandle !== externalUpdateResult?.updateHandle) {
      await disposeDesktopUpdateHandle(updateResult.updateHandle);
    }
    try {
      const res = await checkForDesktopUpdate();
      setUpdateResult(res);
      onExternalUpdateResultChange?.(res);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallDesktopUpdate = async () => {
    if (!updateResult?.updateHandle || isInstallingUpdate) return;
    setIsInstallingUpdate(true);
    setUpdateProgress({ downloadedBytes: 0, percent: 0 });
    try {
      await installDesktopUpdate(updateResult.updateHandle, progress => {
        setUpdateProgress(progress);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setUpdateResult({
        status: 'error',
        currentVersion: appVersion || updateResult.currentVersion,
        error: msg,
      });
      setIsInstallingUpdate(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {t('updates_title', 'Desktop Application Updates')}
          </h3>
          <p className="text-xs text-slate-400">
            {t('updates_desc', 'Check for new OmniDesk desktop versions and install updates cleanly.')}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">{t('updates_current_version', 'Current Version')}:</span>
          <strong className="text-indigo-300">v{appVersion || updateResult?.currentVersion || '...'}</strong>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ArrowUpCircle className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-white block">
                {t('updates_channel_label', 'OmniDesk Desktop Releases')}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {t('updates_channel_desc', 'Checks official releases and preserves all saved notes, settings, and tool data.')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleCheckForUpdates()}
            disabled={isCheckingUpdate || isInstallingUpdate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            <span>
              {isCheckingUpdate
                ? t('updates_checking_btn', 'Checking...')
                : t('updates_check_btn', 'Check for Updates')}
            </span>
          </button>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {t('updates_data_preserved', 'All your settings, notes, calendar events, and tool data remain safely stored across updates.')}
          </span>
        </div>

        {updateResult?.status === 'up-to-date' && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>
              {t('updates_up_to_date', 'OmniDesk v{version} is up to date.', {
                version: updateResult.currentVersion,
              })}
            </span>
          </div>
        )}

        {updateResult?.status === 'error' && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">
                {t('updates_error_title', 'Unable to check for updates')}
              </span>
              <span className="text-rose-300/80 block mt-0.5">{updateResult.error}</span>
            </div>
          </div>
        )}

        {updateResult?.status === 'available' && (
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white block">
                  {t('updates_available_heading', 'New Version Available: v{version}', {
                    version: updateResult.availableVersion || '',
                  })}
                </span>
                {updateResult.date && (
                  <span className="text-[11px] text-slate-400 block">{updateResult.date}</span>
                )}
              </div>
              {updateResult.updateHandle ? (
                <button
                  type="button"
                  onClick={() => void handleInstallDesktopUpdate()}
                  disabled={isInstallingUpdate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isInstallingUpdate
                      ? t('updates_installing_btn', 'Downloading & Installing...')
                      : t('updates_install_btn', 'Download & Install')}
                  </span>
                </button>
              ) : (
                <a
                  href={updateResult.installerUrl || updateResult.releaseUrl || GITHUB_RELEASES_LATEST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => {
                    e.preventDefault();
                    void openExternalUrl(
                      updateResult.installerUrl || updateResult.releaseUrl || GITHUB_RELEASES_LATEST_URL
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('updates_download_release_btn', 'Download Update')}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {updateResult.body && (
              <pre className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto font-sans">
                {updateResult.body}
              </pre>
            )}

            {isInstallingUpdate && updateProgress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300">
                  <span>{t('updates_downloading_label', 'Downloading update package...')}</span>
                  <span>
                    {typeof updateProgress.percent === 'number'
                      ? `${updateProgress.percent}%`
                      : `${(updateProgress.downloadedBytes / (1024 * 1024)).toFixed(1)} MB`}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-150"
                    style={{ width: `${updateProgress.percent ?? 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
