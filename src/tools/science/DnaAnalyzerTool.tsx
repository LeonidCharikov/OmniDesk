import React, { useState, useMemo, useId } from 'react';
import { Dna, Copy, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n/context';

const COMPLEMENT_DNA: Record<string, string> = {
  A: 'T',
  T: 'A',
  G: 'C',
  C: 'G',
  N: 'N',
  R: 'Y',
  Y: 'R',
  S: 'S',
  W: 'W',
  K: 'M',
  M: 'K',
  B: 'V',
  V: 'B',
  D: 'H',
  H: 'D',
};

const COMPLEMENT_RNA: Record<string, string> = {
  A: 'U',
  U: 'A',
  G: 'C',
  C: 'G',
  N: 'N',
};

const CODON_TABLE: Record<string, string> = {
  TTT: 'F', TTC: 'F', TTA: 'L', TTG: 'L',
  CTT: 'L', CTC: 'L', CTA: 'L', CTG: 'L',
  ATT: 'I', ATC: 'I', ATA: 'I', ATG: 'M',
  GTT: 'V', GTC: 'V', GTA: 'V', GTG: 'V',
  TCT: 'S', TCC: 'S', TCA: 'S', TCG: 'S',
  CCT: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
  ACT: 'T', ACC: 'T', ACA: 'T', ACG: 'T',
  GCT: 'A', GCC: 'A', GCA: 'A', GCG: 'A',
  TAT: 'Y', TAC: 'Y', TAA: '*', TAG: '*',
  CAT: 'H', CAC: 'H', CAA: 'Q', CAG: 'Q',
  AAT: 'N', AAC: 'N', AAA: 'K', AAG: 'K',
  GAT: 'D', GAC: 'D', GAA: 'E', GAG: 'E',
  TGT: 'C', TGC: 'C', TGA: '*', TGG: 'W',
  CGT: 'R', CGC: 'R', CGA: 'R', CGG: 'R',
  AGT: 'S', AGC: 'S', AGA: 'R', AGG: 'R',
  GGT: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
};

const AA_WEIGHTS: Record<string, number> = {
  A: 89.09, R: 174.2, N: 132.12, D: 133.1, C: 121.16,
  Q: 146.15, E: 147.13, G: 75.07, H: 155.16, I: 131.17,
  L: 131.17, K: 146.19, M: 149.21, F: 165.19, P: 115.13,
  S: 105.09, T: 119.12, W: 204.23, Y: 181.19, V: 117.15,
};

function translateDnaFrame(dna: string, offset: number): string {
  let aa = '';
  for (let i = offset; i + 2 < dna.length; i += 3) {
    const codon = dna.slice(i, i + 3);
    aa += CODON_TABLE[codon] ?? 'X';
  }
  return aa;
}

export const DnaAnalyzerTool: React.FC = () => {
  const { t } = useI18n();
  const seqId = useId();

  const [rawInput, setRawInput] = useState(
    '>Sample_Gene_Fragment\nATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG'
  );
  const [seqMode, setSeqMode] = useState<'dna' | 'rna'>('dna');
  const [saltMm, setSaltMm] = useState('50');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const analysis = useMemo(() => {
    const lines = rawInput.split(/\r?\n/);
    const filtered = lines.filter(l => !l.trim().startsWith('>')).join('');
    const cleaned = filtered.toUpperCase().replace(/[^A-Z]/g, '');

    if (!cleaned) {
      return { empty: true as const };
    }

    const validSet = seqMode === 'dna' ? /^[ATGCNRYSWKMBVDH]+$/ : /^[AUGCN]+$/;
    const hasInvalid = !validSet.test(cleaned);
    const dnaForCodons = seqMode === 'rna' ? cleaned.replace(/U/g, 'T') : cleaned;

    let countA = 0;
    let countT = 0;
    let countU = 0;
    let countG = 0;
    let countC = 0;
    let countOther = 0;

    for (const ch of cleaned) {
      if (ch === 'A') countA++;
      else if (ch === 'T') countT++;
      else if (ch === 'U') countU++;
      else if (ch === 'G') countG++;
      else if (ch === 'C') countC++;
      else countOther++;
    }

    const len = cleaned.length;
    const gcPercent = ((countG + countC) / len) * 100;
    const atPercent = ((countA + countT + countU) / len) * 100;

    const compMap = seqMode === 'dna' ? COMPLEMENT_DNA : COMPLEMENT_RNA;
    const complement = cleaned
      .split('')
      .map(c => compMap[c] ?? 'N')
      .join('');
    const reverseComplement = complement.split('').reverse().join('');
    const mrna = seqMode === 'dna' ? cleaned.replace(/T/g, 'U') : cleaned;
    const cdna = seqMode === 'rna' ? cleaned.replace(/U/g, 'T') : cleaned;

    // Molecular weight (ssDNA / ssRNA approximate Da)
    const mw =
      seqMode === 'dna'
        ? countA * 313.21 + countT * 304.2 + countC * 289.18 + countG * 329.21 + 79.0
        : countA * 329.21 + countU * 306.17 + countC * 305.18 + countG * 345.21 + 159.0;

    // Wallace and salt-adjusted Tm
    const naMm = Math.max(1, Number(saltMm) || 50);
    const tmWallace =
      len < 14
        ? 2 * (countA + countT + countU) + 4 * (countG + countC)
        : 64.9 + (41 * (countG + countC - 16.4)) / len;
    const tmSalt =
      81.5 +
      16.6 * Math.log10(naMm / 1000) +
      0.41 * gcPercent -
      675 / len;

    // 3 forward frames
    const frame1 = translateDnaFrame(dnaForCodons, 0);
    const frame2 = translateDnaFrame(dnaForCodons, 1);
    const frame3 = translateDnaFrame(dnaForCodons, 2);

    // Peptide mass for frame 1 up to first stop
    const firstOrf = frame1.split('*')[0];
    let proteinMw = 0;
    if (firstOrf.length > 0) {
      for (const aa of firstOrf) {
        proteinMw += AA_WEIGHTS[aa] ?? 110;
      }
      proteinMw -= (firstOrf.length - 1) * 18.015;
    }

    return {
      empty: false as const,
      cleaned,
      hasInvalid,
      len,
      countA,
      countT,
      countU,
      countG,
      countC,
      countOther,
      gcPercent,
      atPercent,
      complement,
      reverseComplement,
      mrna,
      cdna,
      mw,
      tmWallace,
      tmSalt,
      frame1,
      frame2,
      frame3,
      proteinMw,
    };
  }, [rawInput, seqMode, saltMm]);

  const copyValue = async (key: string, val: string) => {
    await navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Dna className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t('dna_title', 'DNA / RNA & Protein Sequence Analyzer')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(
                  'dna_subtitle',
                  'Complement, reverse complement, mRNA transcription, 3-frame translation, GC% and melting temperature.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['dna', 'rna'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSeqMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-colors ${
                    seqMode === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setRawInput('>GFP_Start\nATGAGTAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTTGTTGAATTA')
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
            >
              {t('dna_load_sample', 'Sample GFP')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <label htmlFor={seqId} className="block text-xs font-medium text-slate-400">
              {t('dna_input_label', 'Sequence (plain bases or FASTA)')}
            </label>
            <textarea
              id={seqId}
              rows={4}
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              placeholder={t('dna_placeholder', 'Paste DNA/RNA bases or >FASTA sequence...')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">
                {t('dna_salt_conc', 'Na⁺ Salt Concentration (mM)')}
              </label>
              <input
                type="number"
                min={1}
                max={2000}
                value={saltMm}
                onChange={e => setSaltMm(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-slate-200"
              />
            </div>

            {!analysis.empty && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('dna_length', 'Length')}</span>
                  <span className="font-mono text-white">{analysis.len} nt</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('dna_gc_content', 'GC Content')}</span>
                  <span className="font-mono text-emerald-400">{analysis.gcPercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('dna_tm_salt', 'Tm (Salt-adj.)')}</span>
                  <span className="font-mono text-indigo-300">{analysis.tmSalt.toFixed(1)} °C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('dna_mw', 'Mol. Weight')}</span>
                  <span className="font-mono text-slate-200">{(analysis.mw / 1000).toFixed(2)} kDa</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {!analysis.empty && analysis.hasInvalid && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {t('dna_invalid_chars', 'Non-standard IUPAC characters detected; codon translation may show X.')}
            </span>
          </div>
        )}
      </div>

      {!analysis.empty && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'A', val: analysis.countA, color: 'text-emerald-400' },
              {
                label: seqMode === 'dna' ? 'T' : 'U',
                val: seqMode === 'dna' ? analysis.countT : analysis.countU,
                color: 'text-rose-400',
              },
              { label: 'G', val: analysis.countG, color: 'text-amber-400' },
              { label: 'C', val: analysis.countC, color: 'text-sky-400' },
              {
                label: t('dna_tm_wallace', 'Tm (Wallace)'),
                val: `${analysis.tmWallace.toFixed(1)} °C`,
                color: 'text-indigo-300',
              },
            ].map(item => (
              <div key={item.label} className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <div className="text-[11px] uppercase text-slate-500">{item.label}</div>
                <div className={`text-lg font-bold font-mono mt-0.5 ${item.color}`}>{item.val}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              {
                key: 'comp',
                title: t('dna_complement', "Complement (3' -> 5')"),
                value: analysis.complement,
              },
              {
                key: 'revcomp',
                title: t('dna_rev_complement', "Reverse Complement (5' -> 3')"),
                value: analysis.reverseComplement,
              },
              {
                key: 'trans',
                title:
                  seqMode === 'dna'
                    ? t('dna_mrna', 'mRNA Transcript (U)')
                    : t('dna_cdna', 'cDNA Equivalent (T)'),
                value: seqMode === 'dna' ? analysis.mrna : analysis.cdna,
              },
              {
                key: 'frames',
                title: t('dna_reading_frames', 'Translation Reading Frames (+1 / +2 / +3)'),
                value: `+1: ${analysis.frame1}\n+2: ${analysis.frame2}\n+3: ${analysis.frame3}`,
              },
            ].map(block => (
              <div
                key={block.key}
                className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">{block.title}</span>
                  <button
                    type="button"
                    onClick={() => copyValue(block.key, block.value)}
                    className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                  >
                    {copiedKey === block.key ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {t('copy', 'Copy')}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-200 whitespace-pre-wrap break-all max-h-36 overflow-auto">
                  {block.value}
                </pre>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
