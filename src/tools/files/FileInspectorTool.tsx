import React, { useState } from 'react';
import { Binary, Hash, Copy, Check } from 'lucide-react';
import { useI18n } from '../../i18n/context';

export const FileInspectorTool: React.FC = () => {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [sha256, setSha256] = useState<string>('');
  const [hexDump, setHexDump] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const buffer = await f.arrayBuffer();
    // SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    setSha256(hashHex);

    // Hex dump of first 128 bytes
    const previewBytes = new Uint8Array(buffer.slice(0, 128));
    const lines: string[] = [];
    for (let i = 0; i < previewBytes.length; i += 16) {
      const slice = previewBytes.slice(i, i + 16);
      const hex = Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = Array.from(slice).map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
      lines.push(`${i.toString(16).padStart(4, '0')}  ${hex.padEnd(48, ' ')}  |${ascii}|`);
    }
    setHexDump(lines);
  };

  const copyHash = () => {
    navigator.clipboard.writeText(sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800">
        <h2 className="text-lg font-semibold text-white">
          {t('tool_file_inspector_title', 'Inspektor Souborů & Hash')}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {t('file_inspector_desc', 'Okamžitý výpočet kontrolních součtů (SHA-256), binární hex dump a analýza hlaviček bez odesílání na síť.')}
        </p>
      </div>

      <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-colors text-center bg-slate-900/20">
        <input
          type="file"
          onChange={handleFile}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center pointer-events-none">
          <Binary className="w-8 h-8 text-indigo-400 mb-2" />
          <p className="text-sm font-medium text-slate-200">
            {t('select_any_file_to_inspect', 'Vyberte libovolný soubor k prozkoumání')}
          </p>
        </div>
      </div>

      {file && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-500 block">{t('file_name', 'Název souboru')}</span>
              <span className="text-sm font-medium text-slate-200 truncate block">{file.name}</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-500 block">{t('file_size', 'Velikost')}</span>
              <span className="text-sm font-medium font-mono text-slate-200">
                {(file.size / 1024).toFixed(2)} KB ({file.size.toLocaleString()} B)
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-500 block">{t('mime_type', 'MIME typ')}</span>
              <span className="text-sm font-medium text-slate-200">{file.type || 'application/octet-stream'}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-400" />
                {t('sha256_hash', 'Kryptografický otisk SHA-256')}
              </span>
              <button
                onClick={copyHash}
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('copied', 'Zkopírováno') : t('copy_hash', 'Kopírovat hash')}
              </button>
            </div>
            <div className="p-2.5 rounded bg-slate-950 font-mono text-xs text-indigo-300 break-all select-all border border-slate-800">
              {sha256}
            </div>
          </div>

          {hexDump.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {t('hex_dump_preview', 'Hexadecimální náhled hlavičky (prvních 128 bajtů)')}
              </span>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                <pre>{hexDump.join('\n')}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
