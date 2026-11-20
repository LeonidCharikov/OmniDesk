import React, { useMemo, useState } from 'react';
import { ExternalLink, Copy, ArrowLeftRight, Compass } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  bearingToCompass,
  computeHaversineKm,
  computeInitialBearing,
  computeMidpoint,
  ddToDms,
  formatDms,
  parseDmsPair,
} from '../../utils/toolUpgrades.logic';
import { input, box, btn, secondary, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   GEOGRAPHIC & GPS CONVERTER (Bidirectional DD <-> DMS, Bearing,
   Midpoint, Haversine km/mi/NM, City Presets, Geo URI)
   ───────────────────────────────────────────────────────────── */
const CITY_PRESETS = [
  { name: 'Prague', lat: 50.0755, lon: 14.4378 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', lat: 40.7128, lon: -74.006 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
];

export const GeoGpsTool: React.FC = () => {
  const { t } = useI18n();
  const [lat, setLat] = useState(50.0755);
  const [lon, setLon] = useState(14.4378);
  const [lat2, setLat2] = useState(48.8566);
  const [lon2, setLon2] = useState(2.3522);
  const [dmsInput, setDmsInput] = useState('');
  const [dmsError, setDmsError] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const dmsPoint1 = useMemo(
    () => `${formatDms(ddToDms(lat, 'lat'))}, ${formatDms(ddToDms(lon, 'lon'))}`,
    [lat, lon]
  );

  const geoMetrics = useMemo(() => {
    const km = computeHaversineKm(lat, lon, lat2, lon2);
    const miles = km * 0.621371;
    const nauticalMiles = km * 0.539957;
    const bearing = computeInitialBearing(lat, lon, lat2, lon2);
    const compass = bearingToCompass(bearing);
    const midpoint = computeMidpoint(lat, lon, lat2, lon2);
    return { km, miles, nauticalMiles, bearing, compass, midpoint };
  }, [lat, lon, lat2, lon2]);

  const applyDmsInput = () => {
    setDmsError('');
    const parsed = parseDmsPair(dmsInput);
    if (!parsed) {
      setDmsError(t('geo_dms_parse_err', 'Could not parse DMS. Example: 50° 4\' 31.8" N, 14° 26\' 16.1" E'));
      return;
    }
    setLat(parsed.lat);
    setLon(parsed.lon);
  };

  const swapPoints = () => {
    setLat(lat2);
    setLon(lon2);
    setLat2(lat);
    setLon2(lon);
  };

  const copyText = (key: string, value: string) => {
    void navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-5">
      <Header
        title="Geographic & GPS Converter"
        desc={t('geo_gps_desc', 'Bidirectional DD ↔ DMS converter, Haversine distance (km/mi/NM), compass bearing, midpoint, and map links.')}
      />

      <div className={box + ' space-y-4'}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-white text-sm">{t('point_1_coords', 'Point 1 (Primary Coordinates)')}</h3>
          <div className="flex flex-wrap gap-1.5">
            {CITY_PRESETS.map(c => (
              <button
                key={c.name}
                type="button"
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                onClick={() => {
                  setLat(c.lat);
                  setLon(c.lon);
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            {t('latitude', 'Latitude (DD)')}
            <input
              className={input + ' mt-1 font-mono'}
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              value={lat}
              onChange={e => setLat(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('longitude', 'Longitude (DD)')}
            <input
              className={input + ' mt-1 font-mono'}
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              value={lon}
              onChange={e => setLon(Number(e.target.value))}
            />
          </label>
        </div>

        {/* DMS -> DD parser */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 block">{t('geo_parse_dms_label', 'Parse DMS → Decimal Degrees:')}</label>
          <div className="flex gap-2">
            <input
              className={input + ' font-mono text-xs'}
              value={dmsInput}
              onChange={e => setDmsInput(e.target.value)}
              placeholder={`50° 4' 31.8" N, 14° 26' 16.1" E`}
              onKeyDown={e => e.key === 'Enter' && applyDmsInput()}
            />
            <button type="button" className={btn + ' shrink-0'} onClick={applyDmsInput}>
              {t('geo_apply_dms', 'Convert')}
            </button>
          </div>
          {dmsError && <p className="text-xs text-rose-400">{dmsError}</p>}
        </div>

        {/* Formatted Outputs */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong className="text-slate-300">{t('dms_format', 'DMS:')} </strong>
              <span className="font-mono text-emerald-400">{dmsPoint1}</span>
            </div>
            <button type="button" className="text-indigo-400 hover:text-indigo-300" onClick={() => copyText('dms', dmsPoint1)}>
              <Copy className="w-3.5 h-3.5 inline mr-1" />
              {copiedKey === 'dms' ? t('copied', 'Copied!') : t('copy', 'Copy')}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong className="text-slate-300">{t('decimal_format', 'Decimal:')} </strong>
              <span className="font-mono text-slate-200">{lat.toFixed(6)}, {lon.toFixed(6)}</span>
            </div>
            <button
              type="button"
              className="text-indigo-400 hover:text-indigo-300"
              onClick={() => copyText('dd', `${lat.toFixed(6)}, ${lon.toFixed(6)}`)}
            >
              <Copy className="w-3.5 h-3.5 inline mr-1" />
              {copiedKey === 'dd' ? t('copied', 'Copied!') : t('copy', 'Copy')}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong className="text-slate-300">Geo URI: </strong>
              <span className="font-mono text-slate-400">{`geo:${lat.toFixed(6)},${lon.toFixed(6)}`}</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t('open_in_osm', 'OpenStreetMap')}
              </a>
            </div>
          </div>
        </div>

        {/* Point 2 + Haversine / Bearing / Midpoint */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <h3 className="font-semibold text-white text-sm">
            {t('dist_point_2_haversine', 'Point 2 — Distance, Bearing & Midpoint')}
          </h3>
          <button type="button" className={secondary} onClick={swapPoints}>
            <ArrowLeftRight className="w-3.5 h-3.5 inline mr-1" />
            {t('geo_swap_points', 'Swap points')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            {t('point_2_lat', 'Point 2 — Latitude')}
            <input
              className={input + ' mt-1 font-mono'}
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              value={lat2}
              onChange={e => setLat2(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('point_2_lng', 'Point 2 — Longitude')}
            <input
              className={input + ' mt-1 font-mono'}
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              value={lon2}
              onChange={e => setLon2(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="p-3 bg-indigo-950/20 rounded-lg border border-indigo-800/40 text-xs space-y-1">
            <span className="text-slate-400 block">{t('air_distance_between_points', 'Great-circle distance')}</span>
            <div className="text-base font-bold font-mono text-indigo-300">{geoMetrics.km.toFixed(2)} km</div>
            <div className="text-[11px] font-mono text-slate-400">
              {geoMetrics.miles.toFixed(2)} {t('miles_unit', 'mi')} · {geoMetrics.nauticalMiles.toFixed(2)} NM
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
            <span className="text-slate-400 block">{t('geo_initial_bearing', 'Initial bearing')}</span>
            <div className="text-base font-bold font-mono text-emerald-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              {geoMetrics.bearing.toFixed(1)}° ({geoMetrics.compass})
            </div>
            <div className="text-[11px] text-slate-500">{t('geo_bearing_hint', 'Azimuth from Point 1 → Point 2')}</div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
            <span className="text-slate-400 block">{t('geo_midpoint', 'Geographic midpoint')}</span>
            <div className="text-sm font-bold font-mono text-slate-200">
              {geoMetrics.midpoint.lat.toFixed(4)}, {geoMetrics.midpoint.lon.toFixed(4)}
            </div>
            <button
              type="button"
              className="text-[11px] text-indigo-400 hover:text-indigo-300"
              onClick={() => copyText('mid', `${geoMetrics.midpoint.lat}, ${geoMetrics.midpoint.lon}`)}
            >
              <Copy className="w-3 h-3 inline mr-1" />
              {copiedKey === 'mid' ? t('copied', 'Copied!') : t('copy', 'Copy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
