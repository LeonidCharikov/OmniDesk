import React, { useState, useMemo } from 'react';
import { Sun, FlaskConical } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { computeBeerLambert, computePhotonFromWavelengthNm } from '../../utils/scienceMathExt.logic';

function wavelengthToRgbHex(nm: number): string {
  if (nm < 380 || nm > 750) return 'transparent';
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) {
    r = -(nm - 440) / (440 - 380);
    b = 1;
  } else if (nm < 490) {
    g = (nm - 440) / (490 - 440);
    b = 1;
  } else if (nm < 510) {
    g = 1;
    b = -(nm - 510) / (510 - 490);
  } else if (nm < 580) {
    r = (nm - 510) / (580 - 510);
    g = 1;
  } else if (nm < 645) {
    r = 1;
    g = -(nm - 645) / (645 - 580);
  } else {
    r = 1;
  }
  const toHex = (c: number) =>
    Math.round(Math.max(0, Math.min(1, c)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const SPECTRA_PRESETS = [
  { label: 'UV-C (254 nm)', nm: 254 },
  { label: 'Violet (405 nm)', nm: 405 },
  { label: 'Cyan (488 nm)', nm: 488 },
  { label: 'Green Laser (532 nm)', nm: 532 },
  { label: 'Sodium D (589 nm)', nm: 589 },
  { label: 'He-Ne Red (632.8 nm)', nm: 632.8 },
  { label: 'Near-IR (1064 nm)', nm: 1064 },
];

export const SpectroscopyLabTool: React.FC = () => {
  const { t } = useI18n();

  // Beer-Lambert state
  const [epsilon, setEpsilon] = useState('12500');
  const [pathCm, setPathCm] = useState('1.0');
  const [concMolL, setConcMolL] = useState('0.00004');

  // Photon energy state
  const [wavelengthNm, setWavelengthNm] = useState('532');

  const beer = useMemo(
    () => computeBeerLambert(Number(epsilon) || 0, Number(pathCm) || 0, Number(concMolL) || 0),
    [epsilon, pathCm, concMolL]
  );

  const lamNum = Math.max(0.001, Number(wavelengthNm) || 532);
  const photon = useMemo(() => computePhotonFromWavelengthNm(lamNum), [lamNum]);
  const swatchHex = wavelengthToRgbHex(lamNum);
  const isVisible = lamNum >= 380 && lamNum <= 750;

  return (
    <div className="space-y-6">
      {/* Beer-Lambert Law */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('spec_title', 'Spectroscopy & Beer-Lambert Lab')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'spec_subtitle',
                  'Calculate UV-Vis absorbance & transmittance (A = ε·b·c) and convert photon wavelength across frequency, wavenumber, eV, and kJ/mol.'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('spec_beer_heading', 'Beer-Lambert Law (A = ε · b · c)')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('spec_epsilon', 'Molar Absorptivity ε (L·mol⁻¹·cm⁻¹)')}
              </label>
              <input type="number" step="100" value={epsilon} onChange={e => setEpsilon(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('spec_path', 'Cuvette Path Length b (cm)')}</label>
              <input type="number" step="0.1" value={pathCm} onChange={e => setPathCm(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">{t('spec_conc', 'Concentration c (mol/L)')}</label>
              <input type="number" step="0.00001" value={concMolL} onChange={e => setConcMolL(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">{t('spec_absorbance', 'Absorbance (A)')}</div>
              <div className="text-2xl font-bold font-mono text-indigo-300 mt-0.5">{beer.absorbance.toFixed(4)} AU</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {beer.absorbance > 2
                  ? t('spec_high_abs', 'High absorbance (> 2 AU): consider diluting sample for linear detector range.')
                  : t('spec_linear_abs', 'Within standard spectrophotometer linear range.')}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{t('spec_transmittance', 'Transmittance (%T)')}</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{beer.transmittancePct.toFixed(2)}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, beer.transmittancePct))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photon Energy & EM Spectrum */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Sun className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">{t('spec_photon_title', 'Photon Energy & EM Spectrum Converter')}</h3>
              <p className="text-xs text-slate-400">{t('spec_photon_desc', 'E = h·c / λ = h·ν across optical, IR, and UV spectroscopy units.')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SPECTRA_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => setWavelengthNm(String(p.nm))}
                className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-[11px] text-slate-300"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">{t('spec_wavelength', 'Wavelength λ (nm)')}</label>
            <input
              type="number"
              step="1"
              min="0.001"
              value={wavelengthNm}
              onChange={e => setWavelengthNm(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
            />
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border border-slate-700 shrink-0"
              style={{ backgroundColor: isVisible ? swatchHex : undefined }}
            />
            <div>
              <div className="text-[10px] text-slate-400">{t('spec_region', 'EM Spectrum Region')}</div>
              <div className="text-xs font-bold text-white">{photon.region}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">{t('spec_freq', 'Frequency ν')}</div>
            <div className="text-sm font-bold font-mono text-indigo-300 mt-0.5">{photon.freqHz.toExponential(3)} Hz</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">{t('spec_wavenumber', 'Wavenumber ν̃')}</div>
            <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">{photon.wavenumberCm1.toFixed(1)} cm⁻¹</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">{t('spec_ev', 'Photon Energy (eV)')}</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">{photon.energyEv.toFixed(4)} eV</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">{t('spec_kjmol', 'Molar Energy (kJ/mol)')}</div>
            <div className="text-sm font-bold font-mono text-amber-300 mt-0.5">{photon.energyKjMol.toFixed(2)} kJ/mol</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400">{t('spec_joules', 'Photon Energy (J)')}</div>
            <div className="text-sm font-bold font-mono text-slate-300 mt-0.5">{photon.energyJ.toExponential(3)} J</div>
          </div>
        </div>
      </div>
    </div>
  );
};
