import React, { useState, useEffect, useId } from 'react';
import { Globe, Sun, Moon, Search, Clock, Sliders, RotateCcw } from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface CityTimezone {
  city: string;
  country: string;
  zone: string;
  flag: string;
  region: 'europe' | 'americas' | 'asia' | 'pacific' | 'africa';
}

const WORLD_CITIES: CityTimezone[] = [
  // Europe
  { city: 'Praha', country: 'Česká republika', zone: 'Europe/Prague', flag: '🇨🇿', region: 'europe' },
  { city: 'Bratislava', country: 'Slovensko', zone: 'Europe/Bratislava', flag: '🇸🇰', region: 'europe' },
  { city: 'Londýn', country: 'Velká Británie', zone: 'Europe/London', flag: '🇬🇧', region: 'europe' },
  { city: 'Berlín', country: 'Německo', zone: 'Europe/Berlin', flag: '🇩🇪', region: 'europe' },
  { city: 'Paříž', country: 'Francie', zone: 'Europe/Paris', flag: '🇫🇷', region: 'europe' },
  { city: 'Madrid', country: 'Španělsko', zone: 'Europe/Madrid', flag: '🇪🇸', region: 'europe' },
  { city: 'Řím', country: 'Itálie', zone: 'Europe/Rome', flag: '🇮🇹', region: 'europe' },
  { city: 'Varšava', country: 'Polsko', zone: 'Europe/Warsaw', flag: '🇵🇱', region: 'europe' },
  { city: 'Vídeň', country: 'Rakousko', zone: 'Europe/Vienna', flag: '🇦🇹', region: 'europe' },
  { city: 'Curych', country: 'Švýcarsko', zone: 'Europe/Zurich', flag: '🇨🇭', region: 'europe' },
  { city: 'Kyjev', country: 'Ukrajina', zone: 'Europe/Kyiv', flag: '🇺🇦', region: 'europe' },
  { city: 'Moskva', country: 'Rusko', zone: 'Europe/Moscow', flag: '🇷🇺', region: 'europe' },

  // Americas
  { city: 'New York', country: 'USA (EST)', zone: 'America/New_York', flag: '🇺🇸', region: 'americas' },
  { city: 'Chicago', country: 'USA (CST)', zone: 'America/Chicago', flag: '🇺🇸', region: 'americas' },
  { city: 'San Francisco', country: 'USA (PST)', zone: 'America/Los_Angeles', flag: '🇺🇸', region: 'americas' },
  { city: 'Toronto', country: 'Kanada', zone: 'America/Toronto', flag: '🇨🇦', region: 'americas' },
  { city: 'Ciudad de México', country: 'Mexiko', zone: 'America/Mexico_City', flag: '🇲🇽', region: 'americas' },
  { city: 'São Paulo', country: 'Brazílie', zone: 'America/Sao_Paulo', flag: '🇧🇷', region: 'americas' },

  // Asia & Middle East
  { city: 'Tokio', country: 'Japonsko', zone: 'Asia/Tokyo', flag: '🇯🇵', region: 'asia' },
  { city: 'Soul', country: 'Jižní Korea', zone: 'Asia/Seoul', flag: '🇰🇷', region: 'asia' },
  { city: 'Peking', country: 'Čína', zone: 'Asia/Shanghai', flag: '🇨🇳', region: 'asia' },
  { city: 'Singapur', country: 'Singapur', zone: 'Asia/Singapore', flag: '🇸🇬', region: 'asia' },
  { city: 'Bombaj', country: 'Indie', zone: 'Asia/Kolkata', flag: '🇮🇳', region: 'asia' },
  { city: 'Dubaj', country: 'Spojené arabské emiráty', zone: 'Asia/Dubai', flag: '🇦🇪', region: 'asia' },

  // Oceania & Africa
  { city: 'Sydney', country: 'Austrálie', zone: 'Australia/Sydney', flag: '🇦🇺', region: 'pacific' },
  { city: 'Auckland', country: 'Nový Zéland', zone: 'Pacific/Auckland', flag: '🇳🇿', region: 'pacific' },
  { city: 'Káhira', country: 'Egypt', zone: 'Africa/Cairo', flag: '🇪🇬', region: 'africa' },
  { city: 'Johannesburg', country: 'Jihoafrická republika', zone: 'Africa/Johannesburg', flag: '🇿🇦', region: 'africa' },
];

const CITY_NAMES: Record<string, string> = {
  'Europe/Prague': 'Prague',
  'Europe/Bratislava': 'Bratislava',
  'Europe/London': 'London',
  'Europe/Berlin': 'Berlin',
  'Europe/Paris': 'Paris',
  'Europe/Madrid': 'Madrid',
  'Europe/Rome': 'Rome',
  'Europe/Warsaw': 'Warsaw',
  'Europe/Vienna': 'Vienna',
  'Europe/Zurich': 'Zurich',
  'Europe/Kyiv': 'Kyiv',
  'Europe/Moscow': 'Moscow',
  'America/Mexico_City': 'Mexico City',
  'America/Sao_Paulo': 'São Paulo',
  'Asia/Tokyo': 'Tokyo',
  'Asia/Seoul': 'Seoul',
  'Asia/Shanghai': 'Beijing',
  'Asia/Kolkata': 'Mumbai',
  'Asia/Dubai': 'Dubai',
  'Australia/Sydney': 'Sydney',
  'Pacific/Auckland': 'Auckland',
  'Africa/Cairo': 'Cairo',
  'Africa/Johannesburg': 'Johannesburg',
};

const COUNTRY_CODES: Record<string, string> = {
  'Europe/Prague': 'CZ', 'Europe/Bratislava': 'SK', 'Europe/London': 'GB', 'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Warsaw': 'PL',
  'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH', 'Europe/Kyiv': 'UA', 'Europe/Moscow': 'RU',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Los_Angeles': 'US',
  'America/Toronto': 'CA', 'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR',
  'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Singapore': 'SG',
  'Asia/Kolkata': 'IN', 'Asia/Dubai': 'AE', 'Australia/Sydney': 'AU', 'Pacific/Auckland': 'NZ',
  'Africa/Cairo': 'EG', 'Africa/Johannesburg': 'ZA',
};

export const WorldTimezonesTool: React.FC = () => {
  const { t, language } = useI18n();
  const [now, setNow] = useState(new Date());
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const searchInputId = useId();
  const timeSliderId = useId();
  const locale = language === 'cs' ? 'cs-CZ' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : language === 'ru' ? 'ru-RU' : 'en-US';
  const displayNames = new Intl.DisplayNames(locale, { type: 'region' });

  // Tick every second if offset is 0
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute effective date based on slider offset
  const effectiveDate = new Date(now.getTime() + timeOffsetHours * 3600 * 1000);

  const getCityInfo = (zone: string) => {
    try {
      const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : language === 'es' ? 'es-ES' : 'cs-CZ';
      
      const timeStr = new Intl.DateTimeFormat(locale, {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(effectiveDate);

      const dateStr = new Intl.DateTimeFormat(locale, {
        timeZone: zone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(effectiveDate);

      // Extract hours to determine daytime vs nighttime
      const hourPart = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: zone,
          hour: 'numeric',
          hour12: false,
        }).format(effectiveDate)
      );

      const isDay = hourPart >= 6 && hourPart < 20;

      // Local offset relative to Prague / user local
      const localHours = effectiveDate.getHours();
      let diff = hourPart - localHours;
      if (diff > 12) diff -= 24;
      if (diff < -12) diff += 24;
      const diffStr = diff === 0 ? t('same_time', 'Stejný čas') : diff > 0 ? `+${diff}h` : `${diff}h`;

      return { timeStr, dateStr, isDay, diffStr };
    } catch {
      return { timeStr: '--:--:--', dateStr: '', isDay: true, diffStr: '' };
    }
  };

  const filteredCities = WORLD_CITIES.filter(c => {
    const matchesSearch = 
      c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = regionFilter === 'all' || c.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {t('world_timezones_title', 'Světový Čas & Časová Pásma')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {t('world_timezones_desc', 'Světové hodiny pro globální města a interaktivní posuvník pro plánování mezinárodních hovorů a schůzek.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {timeOffsetHours !== 0 && (
            <button
              onClick={() => setTimeOffsetHours(0)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('reset_live_time', 'Návrat k živému času')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Time scrubber slider (Meeting planner) */}
      <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              {t('meeting_planner_slider', 'Interaktivní časový posuvník (Plánování schůzek)')}
            </span>
          </div>
          <span className="font-mono text-xs font-semibold text-indigo-300">
            {timeOffsetHours === 0 
              ? t('live_current_time', 'Aktuální reálný čas')
              : `${timeOffsetHours > 0 ? '+' : ''}${timeOffsetHours} ${t('hours_offset', 'hodin od nynějška')}`}
          </span>
        </div>

        <div className="space-y-1">
          <input
            id={timeSliderId}
            type="range"
            min="-12"
            max="12"
            step="1"
            value={timeOffsetHours}
            onChange={e => setTimeOffsetHours(parseInt(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>-12h</span>
            <span>-6h</span>
            <span className="text-indigo-400 font-bold">{t('now', 'Nyní')} (0)</span>
            <span>+6h</span>
            <span>+12h</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id={searchInputId}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search_city_country', 'Hledat město nebo zemi...')}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Region filter pills */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
          {[
            { id: 'all', label: t('region_all', 'Vše') },
            { id: 'europe', label: t('region_europe', 'Evropa') },
            { id: 'americas', label: t('region_americas', 'Amerika') },
            { id: 'asia', label: t('region_asia', 'Asie') },
            { id: 'pacific', label: t('region_pacific', 'Oceánie') },
            { id: 'africa', label: t('region_africa', 'Afrika') },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setRegionFilter(r.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                regionFilter === r.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredCities.map(c => {
          const info = getCityInfo(c.zone);
          return (
            <div
              key={c.city}
              className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 transition-colors space-y-2 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{c.flag}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      {language === 'cs' ? c.city : CITY_NAMES[c.zone] || c.city}
                    </h3>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                      {COUNTRY_CODES[c.zone] ? displayNames.of(COUNTRY_CODES[c.zone]) : c.country}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {info.diffStr}
                  </span>
                  {info.isDay ? (
                    <span title={t('daytime', 'Den')}>
                      <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    </span>
                  ) : (
                    <span title={t('nighttime', 'Noc')}>
                      <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/60">
                <div className="text-2xl font-mono font-bold text-indigo-300 tabular-nums">
                  {info.timeStr}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {info.dateStr}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
