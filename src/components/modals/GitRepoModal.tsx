import React, { useState } from 'react';
import { 
  GitCommit, 
  X, 
  Copy, 
  Check, 
  FolderGit2, 
  Terminal, 
  HelpCircle,
  ExternalLink
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
    message: 'feat: add i18n Ally support, full Russian UI translations, and comprehensive README',
    date: 'Just now',
    author: 'OmniDesk Developer',
  },
  {
    hash: '92ac99f',
    message: 'feat: add 2D function grapher, LaTeX visualizer, WCAG color palette, and system monitor',
    date: 'Recent',
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
];

export const GitRepoModal: React.FC<GitRepoModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [customRepoUrl, setCustomRepoUrl] = useState<string>('https://github.com/USERNAME/omnidesk.git');

  if (!isOpen) return null;

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const pushCommands = `# 1. ${t('git_cmd_project_root', 'Přejděte do kořene projektu')}:
cd omnidesk

# 2. ${t('git_cmd_add_remote', 'Přidejte svůj vzdálený repozitář (origin)')}:
git remote add origin ${customRepoUrl}

# 3. ${t('git_cmd_push_main', 'Nastavte hlavní větev main a odešlete commity')}:
git branch -M main
git push -u origin main`;

  const localRunCommands = `# 1. ${t('git_cmd_install', 'Nainstalujte balíčky')}:
npm install

# 2. ${t('git_cmd_dev', 'Spuštění v režimu webové aplikace (Vite)')}:
npm run dev

# 3. ${t('git_cmd_tauri_dev', 'Spuštění jako nativní desktopová aplikace (Tauri)')}:
npm run tauri dev

# 4. ${t('git_cmd_tauri_build', 'Sestavení finálního instalačního souboru (.exe / .dmg / .deb / .AppImage)')}:
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
                {t('git_modal_title', 'Git Repozitář & Jak jej publikovat')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('git_branch', 'Větev:')} <span className="font-mono text-indigo-400 font-bold">master / main</span> | {t('git_history_saved', 'Plná historie commitů uložena')}
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
          {/* Explanation */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                {t('git_help_title', 'Kde se nachází Git repozitář & jak jej propojit se svým GitHubem?')}
              </span>
            </div>
            <p className="leading-relaxed text-slate-300 text-[11px]">
              {t('git_help_description', 'Repozitář je kompletně inicializován uvnitř vývojového prostředí (se všemi soubory, commity i historií). Pro odeslání kódu na váš GitHub či GitLab vložte URL adresu vašeho repozitáře níže:')}
            </p>
          </div>

          {/* Interactive Remote URL Input */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('git_repo_url_label', 'URL vašeho vytvořeného repozitáře (GitHub / GitLab):')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customRepoUrl}
                onChange={e => setCustomRepoUrl(e.target.value)}
                placeholder="https://github.com/your-username/your-repo.git"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Option 1: Push to GitHub */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                {t('git_push_commands', 'Příkazy pro odeslání (Push do vašeho repozitáře):')}
              </span>
              <button
                onClick={() => copyCode(pushCommands, 'push')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                {copiedSection === 'push' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === 'push' ? t('copied', 'Zkopírováno') : t('copy', 'Kopírovat')}</span>
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
                {t('git_run_commands', 'Spuštění a sestavení na PC (Tauri Desktop):')}
              </span>
              <button
                onClick={() => copyCode(localRunCommands, 'run')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
              >
                {copiedSection === 'run' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === 'run' ? t('copied', 'Zkopírováno') : t('copy', 'Kopírovat')}</span>
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
              {t('git_commit_history', 'Historie commitů v tomto repozitáři')}
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
            OmniDesk Git Repository · Tauri v2 & React
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
          >
            {t('close', 'Zavřít')}
          </button>
        </div>
      </div>
    </div>
  );
};
