import React, { useState } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  FolderGit2, 
  Terminal, 
  HelpCircle,
  Download
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

interface GitRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GitCommitInfo {
  hash: string;
  message: string;
  date: string;
  author: string;
}

const RECENT_COMMITS: GitCommitInfo[] = [
  {
    hash: 'Current',
    message: 'feat: add Function Grapher, LaTeX Visualizer, WCAG Color Palette and System Monitor',
    date: 'Just now',
    author: 'OmniDesk Developer',
  },
  {
    hash: 'f583197',
    message: 'feat: replace Ukrainian with Russian, translate tool cards, add custom matrix dimensions and enhance finance/chemistry tools',
    date: 'Recent',
    author: 'OmniDesk Developer',
  },
  {
    hash: '86e9d04',
    message: 'feat: add 5 new tools (password gen, qr code, regex encoder, text diff, pomodoro) and multi-language i18n system',
    date: 'Recent',
    author: 'OmniDesk Developer',
  },
  {
    hash: '75bd554',
    message: 'feat: initial commit for OmniDesk multi-tool platform with Tauri v2',
    date: 'Initial',
    author: 'OmniDesk Developer',
  },
];

export const GitRepoModal: React.FC<GitRepoModalProps> = ({ isOpen, onClose }) => {
  const { currentLanguage } = useI18n();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const pushCommands = `# 1. Vytvořte nový prázdný repozitář na GitHubu (např. 'omnidesk')
# 2. V terminálu přidejte vzdálený repozitář (remote origin):
git remote add origin https://github.com/VASE_JMENO/omnidesk.git

# 3. Přejmenujte větev na main (pokud preferujete):
git branch -M main

# 4. Nahrajte veškerý kód i historii commitů na GitHub:
git push -u origin main`;

  const localRunCommands = `# 1. Klonujte svůj repozitář nebo rozbalte stažený ZIP:
cd omnidesk

# 2. Nainstalujte balíčky:
npm install

# 3. Spuštění v režimu webové aplikace:
npm run dev

# 4. Spuštění jako nativní desktopová aplikace (s oknem Tauri & Rustem):
npm run tauri dev

# 5. Sestavení finálního instalačního souboru (.exe / .dmg / .deb):
npm run tauri build`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {currentLanguage === 'cs' ? 'Kde se nachází Git repozitář & Jak jej exportovat' :
                 currentLanguage === 'ru' ? 'Где находится Git репозиторий и как его экспортировать' :
                 currentLanguage === 'de' ? 'Wo befindet sich das Git-Repository & Export-Anleitung' :
                 currentLanguage === 'es' ? 'Dónde está el repositorio Git y cómo exportarlo' :
                 'Where is the Git Repository & Export Guide'}
              </h3>
              <p className="text-xs text-slate-400">
                Větev: <span className="font-mono text-indigo-400 font-bold">master</span> | Lokální úložiště v kontejneru
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Answer to user's question */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Proč Git repozitář nevidíte přímo u sebe na počítači nebo GitHubu?</span>
            </div>
            <p className="leading-relaxed text-slate-300 text-[11px]">
              Tato aplikace i její Git repozitář běží v <strong>izolovaném vývojovém kontejneru Google AI Studio v cloudu</strong>. Repozitář je kompletně inicializován a všechny změny jsou verzovány ve složce <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-indigo-300">/app/applet/.git</code>.
            </p>
            <p className="leading-relaxed text-slate-400 text-[11px]">
              Repozitář zatím není propojen s vaším osobním GitHub účtem, protože do něj nemá přihlašovací údaje. Níže máte přesný postup, jak jej během minuty propojit s vaším GitHubem nebo stáhnout k sobě.
            </p>
          </div>

          {/* Option 1: Push to GitHub */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                1. Jak nahrát tento Git repozitář na váš GitHub
              </span>
              <button
                onClick={() => copyCode(pushCommands, 'push')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                {copiedSection === 'push' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === 'push' ? 'Zkopírováno' : 'Kopírovat'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-indigo-200 leading-relaxed overflow-x-auto text-[11px]">
              {pushCommands}
            </pre>
          </div>

          {/* Option 2: Run locally with Tauri */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                2. Jak spustit a sestavit aplikaci na svém počítači (Tauri Desktop)
              </span>
              <button
                onClick={() => copyCode(localRunCommands, 'run')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                {copiedSection === 'run' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === 'run' ? 'Zkopírováno' : 'Kopírovat'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-emerald-300 leading-relaxed overflow-x-auto text-[11px]">
              {localRunCommands}
            </pre>
          </div>

          {/* Commits log */}
          <div className="space-y-3">
            <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5 text-slate-400" />
              Aktuální Historie Commitů v tomto Repozitáři
            </span>

            <div className="space-y-2">
              {RECENT_COMMITS.map((c, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="font-medium text-slate-200 truncate text-[11px]">
                      {c.message}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>{c.author}</span>
                      <span>•</span>
                      <span>{c.date}</span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-400 font-bold shrink-0">
                    {c.hash}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            OmniDesk Git Repository v kontejneru Google Cloud Run
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
          >
            Rozumím, zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
