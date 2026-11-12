import React, { useState, useMemo, useId } from 'react';
import { Sun, Navigation, Compass } from 'lucide-react';
import { useI18n } from '../../i18n/context';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function toJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function getMoonPhase(jd: number): { ageDays: number; illumination: number; phaseKey: string } {
  const synodicMonth = 29.53058867;
  const daysSinceNew = jd - 2451550.1;
  const cycles = daysSinceNew / synodicMonth;
  const frac = cycles - Math.floor(cycles);
  const ageDays = frac * synodicMonth;
  const illumination = ((1 - Math.cos(frac * 2 * Math.PI)) / 2) * 100;

  let phaseKey = 'moon_new';
  if (frac < 0.03 || frac > 0.97) phaseKey = 'moon_new';
  else if (frac < 0.22) phaseKey = 'moon_waxing_crescent';
  else if (frac < 0.28) phaseKey = 'moon_first_quarter';
  else if (frac < 0.47) phaseKey = 'moon_waxing_gibbous';
  else if (frac < 0.53) phaseKey = 'moon_full';
  else if (frac < 0.72) phaseKey = 'moon_waning_gibbous';
  else if (frac < 0.78) phaseKey = 'moon_last_quarter';
  else phaseKey = 'moon_waning_crescent';

  return { ageDays, illumination, phaseKey };
}

function formatUtcMinutes(totalMinutes: number): string {
  const mNorm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(mNorm / 60).toString().padStart(2, '0');
  const mm = (mNorm % 60).toString().padStart(2, '0');
  return `${hh}:${mm} UTC`;
}

function computeSolarTimes(dateStr: string, lat: number, lon: number, tzOffsetHours: number) {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [year, month, day] = parts;
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const startOfYear = new Date(Date.UTC(year, 0, 0));
  const dayOfYear = Math.floor((utcDate.getTime() - startOfYear.getTime()) / 86400000);

  // NOAA solar equations
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const solarNoonUtc = 720 - 4 * lon - eqTime;

  const calcHourAngle = (zenithDeg: number): number | null => {
    const cosHa =
      Math.cos(zenithDeg * RAD) / (Math.cos(lat * RAD) * Math.cos(decl)) -
      Math.tan(lat * RAD) * Math.tan(decl);
    if (cosHa > 1 || cosHa < -1) return null;
    return Math.acos(cosHa) * DEG;
  };

  const haSunrise = calcHourAngle(90.833);
  const haGolden = calcHourAngle(84);

  const offsetMin = tzOffsetHours * 60;
  const formatLocal = (utcMin: number) => {
    const local = ((Math.round(utcMin + offsetMin) % 1440) + 1440) % 1440;
    const h = Math.floor(local / 60).toString().padStart(2, '0');
    const m = (local % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const jd = toJulianDate(utcDate);
  const mjd = jd - 2400000.5;
  const moon = getMoonPhase(jd);

  if (haSunrise === null) {
    return {
      jd,
      mjd,
      moon,
      solarNoonLocal: formatLocal(solarNoonUtc),
      solarNoonUtc: formatUtcMinutes(solarNoonUtc),
      sunriseLocal: null,
      sunsetLocal: null,
      dayLengthMin: Math.cos(lat * RAD) * Math.cos(decl) >= 0 ? 1440 : 0,
      goldenMorning: null,
      goldenEvening: null,
      declDeg: decl * DEG,
    };
  }

  const sunriseUtc = solarNoonUtc - 4 * haSunrise;
  const sunsetUtc = solarNoonUtc + 4 * haSunrise;

  return {
    jd,
    mjd,
    moon,
    solarNoonLocal: formatLocal(solarNoonUtc),
    solarNoonUtc: formatUtcMinutes(solarNoonUtc),
    sunriseLocal: formatLocal(sunriseUtc),
    sunsetLocal: formatLocal(sunsetUtc),
    dayLengthMin: 8 * haSunrise,
    goldenMorning: haGolden !== null ? formatLocal(solarNoonUtc - 4 * haGolden) : null,
    goldenEvening: haGolden !== null ? formatLocal(solarNoonUtc + 4 * haGolden) : null,
    declDeg: decl * DEG,
  };
}

function haversineAndBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371.0088;
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distKm = R * c;

  const y = Math.sin(dLon) * Math.cos(lat2 * RAD);
  const x =
    Math.cos(lat1 * RAD) * Math.sin(lat2 * RAD) -
    Math.sin(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.cos(dLon);
  const bearing = ((Math.atan2(y, x) * DEG) + 360) % 360;

  return { distKm, distMi: distKm * 0.621371, distNm: distKm * 0.539957, bearing };
}

export const SolarEphemerisTool: React.FC = () => {
  const { t } = useI18n();
  const dateId = useId();
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const localTz = useMemo(() => -new Date().getTimezoneOffset() / 60, []);

  const [dateStr, setDateStr] = useState(todayIso);
  const [lat, setLat] = useState('50.0755');
  const [lon, setLon] = useState('14.4378');
  const [tzOffset, setTzOffset] = useState(String(localTz));

  const [lat2, setLat2] = useState('40.7128');
  const [lon2, setLon2] = useState('-74.0060');

  const ephemeris = useMemo(
    () => computeSolarTimes(dateStr, Number(lat) || 0, Number(lon) || 0, Number(tzOffset) || 0),
    [dateStr, lat, lon, tzOffset]
  );

  const geodesic = useMemo(
    () =>
      haversineAndBearing(
        Number(lat) || 0,
        Number(lon) || 0,
        Number(lat2) || 0,
        Number(lon2) || 0
      ),
    [lat, lon, lat2, lon2]
  );

  const formatDayLength = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Sun className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('solar_title', 'Solar, Moon & Geodesic Ephemeris')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'solar_subtitle',
                  'Sunrise, solar noon, sunset, golden hour, Julian date, lunar phase, and great-circle Haversine distance.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: t('solar_prague', 'Prague'), la: '50.0755', lo: '14.4378', tz: '1' },
              { label: t('solar_london', 'London'), la: '51.5074', lo: '-0.1278', tz: '0' },
              { label: t('solar_tokyo', 'Tokyo'), la: '35.6762', lo: '139.6503', tz: '9' },
            ].map(city => (
              <button
                key={city.label}
                type="button"
                onClick={() => {
                  setLat(city.la);
                  setLon(city.lo);
                  setTzOffset(city.tz);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
              >
                {city.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor={dateId} className="block text-xs text-slate-400 mb-1">
              {t('solar_date', 'Date')}
            </label>
            <input
              id={dateId}
              type="date"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('solar_lat', 'Latitude (°)')}
            </label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={e => setLat(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('solar_lon', 'Longitude (°)')}
            </label>
            <input
              type="number"
              step="0.0001"
              value={lon}
              onChange={e => setLon(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {t('solar_tz', 'UTC Offset (h)')}
            </label>
            <input
              type="number"
              step="0.5"
              value={tzOffset}
              onChange={e => setTzOffset(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
        </div>

        {ephemeris && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              {
                label: t('solar_sunrise', 'Sunrise'),
                val: ephemeris.sunriseLocal ?? t('solar_polar', 'Polar day/night'),
                accent: 'text-amber-300',
              },
              {
                label: t('solar_noon', 'Solar Noon'),
                val: ephemeris.solarNoonLocal,
                accent: 'text-yellow-300',
              },
              {
                label: t('solar_sunset', 'Sunset'),
                val: ephemeris.sunsetLocal ?? t('solar_polar', 'Polar day/night'),
                accent: 'text-orange-300',
              },
              {
                label: t('solar_day_length', 'Daylight Duration'),
                val: formatDayLength(ephemeris.dayLengthMin),
                accent: 'text-emerald-300',
              },
              {
                label: t('solar_golden_am', 'Morning Golden Hour End'),
                val: ephemeris.goldenMorning ?? '--',
                accent: 'text-slate-200',
              },
              {
                label: t('solar_golden_pm', 'Evening Golden Hour Start'),
                val: ephemeris.goldenEvening ?? '--',
                accent: 'text-slate-200',
              },
              {
                label: t('solar_moon_phase', 'Lunar Phase'),
                val: `${t(ephemeris.moon.phaseKey, ephemeris.moon.phaseKey)} (${ephemeris.moon.illumination.toFixed(0)}%)`,
                accent: 'text-indigo-300',
              },
              {
                label: t('solar_julian', 'Julian Date (JD / MJD)'),
                val: `${ephemeris.jd.toFixed(1)} / ${ephemeris.mjd.toFixed(1)}`,
                accent: 'text-sky-300',
              },
            ].map(card => (
              <div key={card.label} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">{card.label}</div>
                <div className={`text-sm font-bold font-mono mt-1 ${card.accent}`}>{card.val}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Geodesic Distance & Bearing */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Navigation className="w-4 h-4 text-indigo-400" />
          <span>{t('solar_geodesic_title', 'Great-Circle Distance & Initial Bearing (Haversine)')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('solar_dest_lat', 'Destination Lat (°)')}
              </label>
              <input
                type="number"
                step="0.0001"
                value={lat2}
                onChange={e => setLat2(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('solar_dest_lon', 'Destination Lon (°)')}
              </label>
              <input
                type="number"
                step="0.0001"
                value={lon2}
                onChange={e => setLon2(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('solar_dist_km', 'Distance (km)')}</div>
              <div className="text-base font-bold font-mono text-emerald-400">
                {geodesic.distKm.toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('solar_dist_mi', 'Miles / NM')}</div>
              <div className="text-sm font-bold font-mono text-slate-200">
                {geodesic.distMi.toFixed(1)} mi · {geodesic.distNm.toFixed(1)} nm
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Compass className="w-3 h-3" />
                {t('solar_bearing', 'Bearing')}
              </div>
              <div className="text-base font-bold font-mono text-indigo-300">
                {geodesic.bearing.toFixed(1)}°
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
