import React from 'react';
import { SupportedLanguage } from '../../i18n/context';

interface LanguageFlagIconProps {
  code: SupportedLanguage;
  className?: string;
}

export const LanguageFlagIcon: React.FC<LanguageFlagIconProps> = ({
  code,
  className = 'w-4 h-3 rounded-[2px] shrink-0',
}) => {
  switch (code) {
    case 'cs':
      return (
        <svg
          viewBox="0 0 24 16"
          aria-hidden="true"
          className={`${className} ring-1 ring-slate-400/35 overflow-hidden`}
        >
          <rect width="24" height="8" y="0" fill="#ffffff" />
          <rect width="24" height="8" y="8" fill="#d7141a" />
          <polygon points="0,0 12,8 0,16" fill="#11457e" />
        </svg>
      );
    case 'de':
      return (
        <svg
          viewBox="0 0 24 16"
          aria-hidden="true"
          className={`${className} ring-1 ring-slate-400/35 overflow-hidden`}
        >
          <rect width="24" height="5.34" y="0" fill="#111827" />
          <rect width="24" height="5.34" y="5.33" fill="#dd0000" />
          <rect width="24" height="5.34" y="10.66" fill="#ffce00" />
        </svg>
      );
    case 'es':
      return (
        <svg
          viewBox="0 0 24 16"
          aria-hidden="true"
          className={`${className} ring-1 ring-slate-400/35 overflow-hidden`}
        >
          <rect width="24" height="4" y="0" fill="#aa151b" />
          <rect width="24" height="8" y="4" fill="#f1bf00" />
          <rect width="24" height="4" y="12" fill="#aa151b" />
        </svg>
      );
    case 'ru':
      return (
        <svg
          viewBox="0 0 24 16"
          aria-hidden="true"
          className={`${className} ring-1 ring-slate-400/35 overflow-hidden`}
        >
          <rect width="24" height="5.34" y="0" fill="#ffffff" />
          <rect width="24" height="5.34" y="5.33" fill="#0039a6" />
          <rect width="24" height="5.34" y="10.66" fill="#d52b1e" />
        </svg>
      );
    case 'en':
    default:
      return (
        <svg
          viewBox="0 0 24 16"
          aria-hidden="true"
          className={`${className} ring-1 ring-slate-400/35 overflow-hidden`}
        >
          <rect width="24" height="16" fill="#012169" />
          <path d="M0,0 L24,16 M24,0 L0,16" stroke="#ffffff" strokeWidth="3" />
          <path d="M0,0 L24,16 M24,0 L0,16" stroke="#c8102e" strokeWidth="1.5" />
          <path d="M12,0 L12,16 M0,8 L24,8" stroke="#ffffff" strokeWidth="4.8" />
          <path d="M12,0 L12,16 M0,8 L24,8" stroke="#c8102e" strokeWidth="2.8" />
        </svg>
      );
  }
};
