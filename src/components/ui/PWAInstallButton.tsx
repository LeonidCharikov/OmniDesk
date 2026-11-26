import React from 'react';
import { Download } from 'lucide-react';
import { useI18n } from '../../i18n/context';

const GITHUB_RELEASES_URL = 'https://github.com/LeonidCharikov/OmniDesk/releases';

export const PWAInstallButton: React.FC = () => {
  const { t } = useI18n();

  return (
    <a
      href={GITHUB_RELEASES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2 md:px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
      title={t('install_app_title', 'Download OmniDesk Desktop from GitHub Releases')}
      aria-label={t('install_app', 'Install App')}
    >
      <Download className="w-3.5 h-3.5 shrink-0" />
      <span className="hidden md:inline whitespace-nowrap">{t('install_app', 'Install App')}</span>
    </a>
  );
};
