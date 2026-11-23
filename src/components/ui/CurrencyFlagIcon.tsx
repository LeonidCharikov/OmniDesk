import React from 'react';

interface CurrencyFlagIconProps {
  code: string;
  className?: string;
}

/**
 * Crisp inline SVG flag icons for supported fiat currencies.
 * Avoids OS emoji font gaps (notably Windows / Tauri WebView2, which renders
 * country flag emojis as monochrome 2-letter regional indicators).
 */
export const CurrencyFlagIcon: React.FC<CurrencyFlagIconProps> = ({
  code,
  className = 'w-5 h-3.5 rounded-[2px] shrink-0',
}) => {
  const normalized = (code || '').trim().toUpperCase();
  const svgClass = `${className} ring-1 ring-slate-400/35 overflow-hidden`;

  switch (normalized) {
    case 'CZK':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="8" y="0" fill="#ffffff" />
          <rect width="24" height="8" y="8" fill="#d7141a" />
          <polygon points="0,0 12,8 0,16" fill="#11457e" />
        </svg>
      );

    case 'EUR': {
      const stars = Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const cx = 12 + Math.cos(angle) * 5.2;
        const cy = 8 + Math.sin(angle) * 5.2;
        return { cx, cy };
      });
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#003399" />
          {stars.map((s, idx) => (
            <circle key={idx} cx={s.cx} cy={s.cy} r="0.85" fill="#ffcc00" />
          ))}
        </svg>
      );
    }

    case 'USD':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#ffffff" />
          <rect width="24" height="1.23" y="0" fill="#b22234" />
          <rect width="24" height="1.23" y="2.46" fill="#b22234" />
          <rect width="24" height="1.23" y="4.92" fill="#b22234" />
          <rect width="24" height="1.23" y="7.38" fill="#b22234" />
          <rect width="24" height="1.23" y="9.85" fill="#b22234" />
          <rect width="24" height="1.23" y="12.31" fill="#b22234" />
          <rect width="24" height="1.23" y="14.77" fill="#b22234" />
          <rect width="10.4" height="8.62" fill="#3c3b6e" />
          {[1.6, 3.8, 6.0, 8.2].map(x =>
            [1.6, 3.8, 6.0, 7.6].map(y => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="0.48" fill="#ffffff" />
            ))
          )}
        </svg>
      );

    case 'GBP':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#012169" />
          <path d="M0,0 L24,16 M24,0 L0,16" stroke="#ffffff" strokeWidth="3" />
          <path d="M0,0 L24,16 M24,0 L0,16" stroke="#c8102e" strokeWidth="1.5" />
          <path d="M12,0 L12,16 M0,8 L24,8" stroke="#ffffff" strokeWidth="4.8" />
          <path d="M12,0 L12,16 M0,8 L24,8" stroke="#c8102e" strokeWidth="2.8" />
        </svg>
      );

    case 'CHF':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#d52b1e" />
          <rect x="10.2" y="3.2" width="3.6" height="9.6" fill="#ffffff" />
          <rect x="7.2" y="6.2" width="9.6" height="3.6" fill="#ffffff" />
        </svg>
      );

    case 'PLN':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="8" y="0" fill="#ffffff" />
          <rect width="24" height="8" y="8" fill="#dc143c" />
        </svg>
      );

    case 'JPY':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#ffffff" />
          <circle cx="12" cy="8" r="4.6" fill="#bc002d" />
        </svg>
      );

    case 'CAD':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#ffffff" />
          <rect width="6" height="16" x="0" fill="#d80621" />
          <rect width="6" height="16" x="18" fill="#d80621" />
          <polygon
            points="12,3 13.1,5.7 14.8,5 14.1,7.4 16.2,7.2 14.8,9 15.3,10.2 12.6,9.8 12.6,13 11.4,13 11.4,9.8 8.7,10.2 9.2,9 7.8,7.2 9.9,7.4 9.2,5 10.9,5.7"
            fill="#d80621"
          />
        </svg>
      );

    case 'AUD':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#00008b" />
          {/* Canton Union Jack */}
          <path d="M0,0 L12,8 M12,0 L0,8" stroke="#ffffff" strokeWidth="1.6" />
          <path d="M0,0 L12,8 M12,0 L0,8" stroke="#c8102e" strokeWidth="0.7" />
          <path d="M6,0 L6,8 M0,4 L12,4" stroke="#ffffff" strokeWidth="2.4" />
          <path d="M6,0 L6,8 M0,4 L12,4" stroke="#c8102e" strokeWidth="1.3" />
          {/* Commonwealth & Southern Cross stars */}
          <circle cx="6" cy="12" r="1.4" fill="#ffffff" />
          <circle cx="18" cy="3.5" r="0.9" fill="#ffffff" />
          <circle cx="15.5" cy="7.5" r="0.85" fill="#ffffff" />
          <circle cx="20.5" cy="6.8" r="0.85" fill="#ffffff" />
          <circle cx="18" cy="12.5" r="0.95" fill="#ffffff" />
          <circle cx="19.3" cy="9.5" r="0.55" fill="#ffffff" />
        </svg>
      );

    case 'HUF':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="5.34" y="0" fill="#ce2939" />
          <rect width="24" height="5.34" y="5.33" fill="#ffffff" />
          <rect width="24" height="5.34" y="10.66" fill="#477050" />
        </svg>
      );

    case 'SEK':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#006aa7" />
          <rect x="7" y="0" width="3.2" height="16" fill="#fecc00" />
          <rect x="0" y="6.4" width="24" height="3.2" fill="#fecc00" />
        </svg>
      );

    case 'NOK':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#ba0c2f" />
          <rect x="6.5" y="0" width="4.4" height="16" fill="#ffffff" />
          <rect x="0" y="5.8" width="24" height="4.4" fill="#ffffff" />
          <rect x="7.6" y="0" width="2.2" height="16" fill="#00205b" />
          <rect x="0" y="6.9" width="24" height="2.2" fill="#00205b" />
        </svg>
      );

    case 'DKK':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#c8102e" />
          <rect x="7" y="0" width="2.6" height="16" fill="#ffffff" />
          <rect x="0" y="6.7" width="24" height="2.6" fill="#ffffff" />
        </svg>
      );

    case 'RUB':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="5.34" y="0" fill="#ffffff" />
          <rect width="24" height="5.34" y="5.33" fill="#0039a6" />
          <rect width="24" height="5.34" y="10.66" fill="#d52b1e" />
        </svg>
      );

    case 'CNY':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#de2910" />
          <polygon
            points="4.8,2.3 5.5,4.4 7.7,4.4 5.9,5.7 6.6,7.8 4.8,6.5 3.0,7.8 3.7,5.7 1.9,4.4 4.1,4.4"
            fill="#ffde00"
          />
          <circle cx="9.6" cy="2.6" r="0.8" fill="#ffde00" />
          <circle cx="11.1" cy="4.3" r="0.8" fill="#ffde00" />
          <circle cx="11.1" cy="6.6" r="0.8" fill="#ffde00" />
          <circle cx="9.6" cy="8.3" r="0.8" fill="#ffde00" />
        </svg>
      );

    case 'INR':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="5.34" y="0" fill="#ff9933" />
          <rect width="24" height="5.34" y="5.33" fill="#ffffff" />
          <rect width="24" height="5.34" y="10.66" fill="#138808" />
          <circle cx="12" cy="8" r="1.8" fill="none" stroke="#000080" strokeWidth="0.7" />
        </svg>
      );

    case 'BRL':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#009c3b" />
          <polygon points="12,2 21.5,8 12,14 2.5,8" fill="#ffdf00" />
          <circle cx="12" cy="8" r="3.2" fill="#002776" />
          <path d="M9.1,7.5 Q12,6.4 14.9,8.4" fill="none" stroke="#ffffff" strokeWidth="0.7" />
        </svg>
      );

    case 'KRW':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#ffffff" />
          <circle cx="12" cy="8" r="3.6" fill="#cd2e3a" />
          <path d="M8.4,8 A3.6,3.6 0 0,0 15.6,8 A1.8,1.8 0 0,0 12,8 A1.8,1.8 0 0,1 8.4,8 Z" fill="#0047a0" />
        </svg>
      );

    case 'TRY':
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#e30a17" />
          <circle cx="9.6" cy="8" r="3.8" fill="#ffffff" />
          <circle cx="10.8" cy="8" r="3.0" fill="#e30a17" />
          <circle cx="14.5" cy="8" r="1.15" fill="#ffffff" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 16" aria-hidden="true" className={svgClass}>
          <rect width="24" height="16" fill="#1e293b" />
          <text
            x="12"
            y="10.8"
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fontFamily="monospace"
            fill="#e2e8f0"
          >
            {normalized.slice(0, 3) || '$'}
          </text>
        </svg>
      );
  }
};
