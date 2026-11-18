import React, { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { input, box, Header } from './shared';

/* ─────────────────────────────────────────────────────────────
   GEOGRAPHIC & GPS CONVERTER
   ───────────────────────────────────────────────────────────── */
export const GeoGpsTool: React.FC = () => {
  const { t } = useI18n();
  const [lat, setLat] = useState(50.0755);
  const [lon, setLon] = useState(14.4378);

  const [lat2, setLat2] = useState(48.8566);
  const [lon2, setLon2] = useState(2.3522);

  const dmsLat = (value: number) => {
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = ((abs - deg - min / 60) * 3600).toFixed(2);
    const dir = value >= 0 ? 'N' : 'S';
    return `${deg}° ${min}' ${sec}" ${dir}`;
  };

  const dmsLon = (value: number) => {
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = ((abs - deg - min / 60) * 3600).toFixed(2);
    const dir = value >= 0 ? 'E' : 'W';
    return `${deg}° ${min}' ${sec}" ${dir}`;
  };

  const distanceKm = useMemo(() => {
    const R = 6371; // km
    const dLat = ((lat2 - lat) * Math.PI) / 180;
    const dLon = ((lon2 - lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  }, [lat, lon, lat2, lon2]);

  return (
    <div className="space-y-5">
      <Header
        title="Geographic & GPS Converter"
        desc={t('geo_gps_desc', 'Convert coordinates between DD and DMS, calculate distance, and open map links.')}
      />
      <div className={box + ' space-y-4'}>
        <h3 className="font-semibold text-white text-sm">{t('point_1_coords', 'Bod 1 (Základní souřadnice)')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            {t('latitude', 'Zeměpisná šířka (Latitude)')}
            <input className={input + ' mt-1'} type="number" step="0.0001" value={lat} onChange={e => setLat(Number(e.target.value))} />
          </label>
          <label className="text-xs text-slate-400">
            {t('longitude', 'Zeměpisná délka (Longitude)')}
            <input className={input + ' mt-1'} type="number" step="0.0001" value={lon} onChange={e => setLon(Number(e.target.value))} />
          </label>
        </div>

        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 text-xs">
          <div>
            <strong className="text-slate-300">{t('dms_format', 'DMS formát:')} </strong>
            <span className="font-mono text-emerald-400">{dmsLat(lat)}, {dmsLon(lon)}</span>
          </div>
          <div>
            <strong className="text-slate-300">{t('decimal_format', 'Desetinný formát:')} </strong>
            <span className="font-mono text-slate-200">{lat.toFixed(6)}, {lon.toFixed(6)}</span>
          </div>
          <div className="pt-2">
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t('open_in_osm', 'Zobrazit na OpenStreetMap')}
            </a>
          </div>
        </div>

        <h3 className="font-semibold text-white text-sm pt-2 border-t border-slate-800">
          {t('dist_point_2_haversine', 'Vzdálenost k bodu 2 (Haversine kalkulátor)')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            {t('point_2_lat', 'Bod 2 - Šířka')}
            <input className={input + ' mt-1'} type="number" step="0.0001" value={lat2} onChange={e => setLat2(Number(e.target.value))} />
          </label>
          <label className="text-xs text-slate-400">
            {t('point_2_lng', 'Bod 2 - Délka')}
            <input className={input + ' mt-1'} type="number" step="0.0001" value={lon2} onChange={e => setLon2(Number(e.target.value))} />
          </label>
        </div>

        <div className="p-3 bg-indigo-950/20 rounded-lg border border-indigo-800/40 text-xs">
          {t('air_distance_between_points', 'Vzdušná vzdálenost mezi oběma body:')}{' '}
          <strong className="text-indigo-300 text-sm font-mono">{distanceKm} km</strong> (
          {(Number(distanceKm) * 0.621371).toFixed(2)} {t('miles_unit', 'mil')})
        </div>
      </div>
    </div>
  );
};
