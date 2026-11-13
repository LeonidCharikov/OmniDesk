import React, { useState } from 'react';
import { Download, Monitor, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useI18n } from '../../i18n/context';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { t } = useI18n();
  const [showGuide, setShowGuide] = useState(false);

  // If already running inside standalone window / native desktop app, suppress button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold shadow-sm transition-all hover:scale-[1.02]"
        title={t('install_app_title', 'Install as a standalone desktop or mobile app without launching via terminal')}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('install_app', 'Install App')}</span>
        <span className="sm:hidden">{t('install', 'Install')}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {t('install_standalone_app', 'Install OmniDesk App')}
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                {t('pwa_desc_text', 'OmniDesk is fully optimized to run as a standalone application without needing to open a terminal or IDE.')}
              </p>

              {isIOS ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    {t('ios_instructions_title', 'Steps on iPhone / iPad (Safari):')}
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                    <li>{t('ios_step_1', 'Tap the Share button (square icon with upward arrow) at the bottom bar.')}</li>
                    <li>{t('ios_step_2', 'Scroll down in the menu and select "Add to Home Screen".')}</li>
                    <li>{t('ios_step_3', 'Tap "Add" in the top-right corner.')}</li>
                  </ol>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                    <Monitor className="w-4 h-4" />
                    {t('desktop_instructions_title', 'Steps in Browser (Chrome, Edge, Brave):')}
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-1">
                    <li>{t('desktop_step_1', 'Click the Install icon on the right side of the browser address bar.')}</li>
                    <li>{t('desktop_step_2', 'Or open the browser menu (⋮) → Save and share → "Install OmniDesk".')}</li>
                    <li>{t('desktop_step_3', 'The app will open in a dedicated window without browser toolbars.')}</li>
                  </ol>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowGuide(false)}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
