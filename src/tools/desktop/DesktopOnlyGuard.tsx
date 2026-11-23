import React from 'react';
import { MonitorCog, ShieldAlert, ExternalLink } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { OMNIDESK_GITHUB_URL } from '../../services/fileSystemService';

interface DesktopOnlyGuardProps {
  title: string;
  description: string;
}

export const DesktopOnlyGuard: React.FC<DesktopOnlyGuardProps> = ({ title, description }) => {
  const { t } = useI18n();

  return (
    <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
          <MonitorCog className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              {t('desktop_only_badge', 'Desktop Only')}
            </span>
          </div>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200 leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          {t(
            'desktop_only_guard_hint',
            'Web browsers block OS-level sockets, process control, input automation, and power-management APIs. Launch the native OmniDesk Desktop app (Windows, macOS, or Linux) to use this tool.'
          )}
        </p>
      </div>

      <a
        href={`${OMNIDESK_GITHUB_URL}/releases`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
      >
        <span>{t('desktop_only_download_cta', 'Download OmniDesk Desktop Releases')}</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
};
