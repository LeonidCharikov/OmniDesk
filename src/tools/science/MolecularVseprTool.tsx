import React, { useMemo, useState } from 'react';
import { Atom } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { FUNCTIONAL_GROUPS, VSEPR_TABLE } from '../../utils/scienceSuite.logic';

export const MolecularVseprTool: React.FC = () => {
  const { t } = useI18n();
  const [bonding, setBonding] = useState(4);
  const [lone, setLone] = useState(0);
  const [groupFilter, setGroupFilter] = useState('');

  const match = useMemo(
    () => VSEPR_TABLE.find(g => g.bonding === bonding && g.lone === lone) || null,
    [bonding, lone]
  );

  const filteredGroups = useMemo(() => {
    const q = groupFilter.trim().toLowerCase();
    if (!q) return FUNCTIONAL_GROUPS;
    return FUNCTIONAL_GROUPS.filter(
      g => g.name.toLowerCase().includes(q) || g.formula.toLowerCase().includes(q) || g.example.toLowerCase().includes(q)
    );
  }, [groupFilter]);

  // Compute SVG ligand + lone-pair positions around central atom (130, 110)
  const diagramNodes = useMemo(() => {
    const total = bonding + lone;
    const cx = 130;
    const cy = 110;
    const r = 68;
    const nodes: Array<{ x: number; y: number; isLone: boolean }> = [];
    for (let i = 0; i < total; i++) {
      const angle = (2 * Math.PI * i) / Math.max(1, total) - Math.PI / 2;
      nodes.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), isLone: i >= bonding });
    }
    return { cx, cy, nodes };
  }, [bonding, lone]);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Atom className="w-5 h-5 text-indigo-400" />
          {t('tool_molecular_vsepr_title', 'Molecular Geometry & VSEPR Explorer')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('tool_molecular_vsepr_desc', 'Predict VSEPR shapes, hybridization, bond angles, polarity, and browse organic functional groups.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="text-xs text-slate-400">
              {t('vsepr_bonding_pairs', 'Bonding Domains (X)')}: <span className="font-mono text-indigo-300 font-bold">{bonding}</span>
              <input type="range" min={2} max={6} value={bonding} onChange={e => setBonding(Number(e.target.value))} className="mt-2 w-full accent-indigo-500" />
            </label>
            <label className="text-xs text-slate-400">
              {t('vsepr_lone_pairs', 'Lone Electron Pairs (E)')}: <span className="font-mono text-amber-300 font-bold">{lone}</span>
              <input type="range" min={0} max={3} value={lone} onChange={e => setLone(Number(e.target.value))} className="mt-2 w-full accent-amber-500" />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {VSEPR_TABLE.map(item => (
              <button
                key={`${item.bonding}-${item.lone}`}
                type="button"
                onClick={() => {
                  setBonding(item.bonding);
                  setLone(item.lone);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono ${
                  bonding === item.bonding && lone === item.lone
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-indigo-500/50'
                }`}
              >
                AX{item.bonding}{item.lone > 0 ? `E${item.lone}` : ''}
              </button>
            ))}
          </div>

          {match ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('vsepr_mol_geom', 'Molecular Geometry')}</span>
                <span className="text-base font-bold text-indigo-300">{match.molecularGeometry}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('vsepr_elec_geom', 'Electron Geometry')}</span>
                <span className="text-base font-bold text-white">{match.electronGeometry}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('vsepr_hybrid', 'Hybridization')}</span>
                <span className="text-lg font-bold font-mono text-emerald-300">{match.hybridization}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('vsepr_angles', 'Ideal Bond Angles')}</span>
                <span className="text-base font-bold font-mono text-amber-300">{match.bondAngles}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('vsepr_polarity', 'Symmetry / Polarity')}</span>
                <span className="text-sm font-semibold text-slate-200">
                  {match.polarUsually ? t('vsepr_polar', 'Usually Polar') : t('vsepr_nonpolar', 'Symmetric / Non-polar')}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 block">{t('vsepr_examples', 'Examples')}</span>
                <span className="text-sm font-mono text-sky-300">{match.examples.join(', ')}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
              {t('vsepr_unsupported', 'Select a valid steric number combination (SN 2–6).')}
            </div>
          )}
        </div>

        {/* SVG VSEPR Schematic */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 self-start">
            AX<sub>{bonding}</sub>{lone > 0 ? <>E<sub>{lone}</sub></> : null} {t('vsepr_schematic', 'Schematic')}
          </span>
          <svg viewBox="0 0 260 220" className="w-full h-56 bg-slate-950 rounded-xl border border-slate-800 my-2">
            {diagramNodes.nodes.map((n, i) => (
              <g key={i}>
                {!n.isLone ? (
                  <>
                    <line x1={diagramNodes.cx} y1={diagramNodes.cy} x2={n.x} y2={n.y} stroke="#6366f1" strokeWidth="3" />
                    <circle cx={n.x} cy={n.y} r="13" fill="#10b981" stroke="#0f172a" strokeWidth="2" />
                    <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#fff" fontSize="11" fontFamily="monospace" fontWeight="bold">X</text>
                  </>
                ) : (
                  <>
                    <line x1={diagramNodes.cx} y1={diagramNodes.cy} x2={n.x} y2={n.y} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth="2" />
                    <circle cx={n.x} cy={n.y} r="13" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="1.5" />
                    <text x={n.x} y={n.y + 4} textAnchor="middle" fill="#fbbf24" fontSize="12" fontFamily="monospace">••</text>
                  </>
                )}
              </g>
            ))}
            <circle cx={diagramNodes.cx} cy={diagramNodes.cy} r="18" fill="#6366f1" stroke="#fff" strokeWidth="2" />
            <text x={diagramNodes.cx} y={diagramNodes.cy + 4} textAnchor="middle" fill="#fff" fontSize="13" fontFamily="monospace" fontWeight="bold">A</text>
          </svg>
          <div className="flex items-center justify-around w-full text-[11px] font-mono text-slate-400">
            <span className="text-emerald-300">● X ({t('vsepr_bonded', 'Bonded')})</span>
            <span className="text-amber-300">•• E ({t('vsepr_lone', 'Lone pair')})</span>
          </div>
        </div>
      </div>

      {/* Functional Groups Quick Reference */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t('vsepr_func_groups', 'Organic Functional Groups Reference')}
          </h3>
          <input
            type="text"
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            placeholder={t('search_placeholder', 'Search...')}
            className="w-56 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredGroups.map(g => (
            <div key={g.name} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">{g.name}</span>
                <span className="text-xs font-mono text-indigo-300 font-bold">{g.formula}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {g.example} · <span className="text-emerald-300">{g.polarity}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
