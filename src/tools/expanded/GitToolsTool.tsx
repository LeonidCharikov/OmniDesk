import React, { useMemo, useState } from 'react';
import { Copy, GitBranch, GitCommit, GitPullRequest } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { button, secondary, input, panel, ToolHeader } from './shared';

/* ─────────────────────────────────────────────────────────────
   9. GIT TOOLS (Conventional Commit Builder, Syntax Diff Colorizer, Cheatsheet)
   ───────────────────────────────────────────────────────────── */
export const GitToolsTool: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'commit' | 'diff' | 'cheatsheet'>('commit');

  // 1. Commit Builder State
  const [commitType, setCommitType] = useState('feat');
  const [scope, setScope] = useState('');
  const [description, setDescription] = useState('add image editor enhancements and formatters');
  const [body, setBody] = useState('');
  const [breaking, setBreaking] = useState(false);

  const fullCommitMessage = useMemo(() => {
    const scopePart = scope.trim() ? `(${scope.trim()})` : '';
    const breakingBang = breaking ? '!' : '';
    const header = `${commitType}${scopePart}${breakingBang}: ${description.trim()}`;
    const parts = [header];
    if (body.trim()) parts.push(body.trim());
    if (breaking) parts.push(`BREAKING CHANGE: ${t('breaking_change_text', 'Requires updating dependent APIs or dependencies.')}`);
    return parts.join('\n\n');
  }, [commitType, scope, description, body, breaking, t]);

  // 2. Diff viewer state
  const [diffText, setDiffText] = useState(
    'diff --git a/src/App.tsx b/src/App.tsx\nindex 8f9b2c1..3a1f89e 100644\n--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -15,7 +15,9 @@ import { Toolbar } from "./Toolbar";\n const App = () => {\n-  const [count, setCount] = useState(0);\n+  const [count, setCount] = useState(10);\n+  const [active, setActive] = useState(true);\n   return <div>App</div>;\n };\n'
  );
  const [diffFilter, setDiffFilter] = useState('');

  const coloredDiffLines = useMemo(() => {
    return diffText
      .split('\n')
      .filter(line => (diffFilter ? line.toLowerCase().includes(diffFilter.toLowerCase()) : true))
      .map((line, idx) => {
        let style = 'text-slate-300';
        if (line.startsWith('+') && !line.startsWith('+++')) {
          style = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 pl-2';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          style = 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 pl-2';
        } else if (line.startsWith('@@')) {
          style = 'text-cyan-400 font-bold bg-cyan-950/20 py-0.5';
        } else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) {
          style = 'text-slate-500 font-semibold';
        }
        return { id: idx, line, style };
      });
  }, [diffText, diffFilter]);

  // 3. Command Cheatsheet
  const cheatsheetCommands = [
    { title: t('git_cmd_branch', 'Create and switch to a new branch'), cmd: 'git checkout -b feature/my-new-tool' },
    { title: t('git_cmd_stash', 'Stash and restore uncommitted changes'), cmd: 'git stash save "wip" && git stash pop' },
    { title: t('git_cmd_reset', 'Undo the last local commit (keep changes)'), cmd: 'git reset --soft HEAD~1' },
    { title: t('git_cmd_amend', 'Rewrite the last commit message'), cmd: 'git commit --amend -m "updated commit message"' },
    { title: t('git_cmd_clean', 'Remove untracked files and directories'), cmd: 'git clean -fd' },
    { title: t('git_cmd_log', 'View compact commit graph history'), cmd: 'git log --oneline --graph --decorate --all' },
  ];

  return (
    <div className="space-y-5">
      <ToolHeader
        title="Git Tools"
        description={t('git_tools_desc', 'Build conventional commits, highlight diffs, and copy common Git commands.')}
      />
      <div className={panel + ' space-y-4'}>
        <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'commit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('commit')}
          >
            <GitCommit className="w-3.5 h-3.5 inline mr-1" />
            {t('conventional_commits_builder', 'Conventional Commits Builder')}
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'diff' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('diff')}
          >
            <GitPullRequest className="w-3.5 h-3.5 inline mr-1" />
            {t('diff_highlighter_title', 'Diff & Log Highlighter')}
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'cheatsheet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('cheatsheet')}
          >
            <GitBranch className="w-3.5 h-3.5 inline mr-1" />
            {t('git_cheatsheet_title', 'Git Cheatsheet')}
          </button>
        </div>

        {activeTab === 'commit' && (
          <div className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <label className="text-xs text-slate-400">
                {t('commit_type_label', 'Commit type:')}
                <select className={input + ' mt-1'} value={commitType} onChange={e => setCommitType(e.target.value)}>
                  <option value="feat">{t('commit_feat', 'feat (new feature)')}</option>
                  <option value="fix">{t('commit_fix', 'fix (bug fix)')}</option>
                  <option value="docs">{t('commit_docs', 'docs (documentation)')}</option>
                  <option value="style">{t('commit_style', 'style (formatting)')}</option>
                  <option value="refactor">{t('commit_refactor', 'refactor (code restructure)')}</option>
                  <option value="perf">{t('commit_perf', 'perf (performance)')}</option>
                  <option value="test">{t('commit_test', 'test (tests)')}</option>
                  <option value="chore">{t('commit_chore', 'chore (build, dependencies)')}</option>
                </select>
              </label>
              <label className="text-xs text-slate-400">
                {t('scope_label', 'Scope (optional module):')}
                <input className={input + ' mt-1'} value={scope} onChange={e => setScope(e.target.value)} placeholder={t('scope_placeholder', 'e.g., auth, ui, core')} />
              </label>
              <label className="flex items-center gap-2 text-xs text-rose-300 pt-6 cursor-pointer">
                <input type="checkbox" checked={breaking} onChange={e => setBreaking(e.target.checked)} className="rounded text-rose-600 bg-slate-950" />
                {t('breaking_change_label', 'Breaking Change (!)')}
              </label>
            </div>

            <label className="text-xs text-slate-400 block">
              {t('subject_label', 'Short description (subject):')}
              <input className={input + ' mt-1'} value={description} onChange={e => setDescription(e.target.value)} />
            </label>

            <label className="text-xs text-slate-400 block">
              {t('body_label', 'Detailed message (body):')}
              <textarea className={input + ' mt-1 min-h-20 font-mono text-xs'} value={body} onChange={e => setBody(e.target.value)} placeholder={t('body_placeholder', 'Explain the motivation for this change…')} />
            </label>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">{t('result_commit_msg', 'Generated Commit Message:')}</span>
                <div className="flex gap-2">
                  <button className={secondary} onClick={() => navigator.clipboard.writeText(fullCommitMessage)}>
                    <Copy className="w-3.5 h-3.5 inline mr-1" />
                    {t('copy_message', 'Copy message')}
                  </button>
                  <button className={button} onClick={() => navigator.clipboard.writeText(`git commit -m ${JSON.stringify(fullCommitMessage)}`)}>
                    <Copy className="w-3.5 h-3.5 inline mr-1" />
                    {t('copy_git_cmd', 'Copy git command')}
                  </button>
                </div>
              </div>
              <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap">{fullCommitMessage}</pre>
            </div>
          </div>
        )}

        {activeTab === 'diff' && (
          <div className="space-y-3">
            <textarea
              className={input + ' min-h-36 font-mono text-xs leading-relaxed'}
              value={diffText}
              onChange={e => setDiffText(e.target.value)}
              placeholder={t('diff_input_placeholder', 'Paste git diff or git log -p output here…')}
            />
            <div className="flex gap-2">
              <input className={input + ' text-xs'} value={diffFilter} onChange={e => setDiffFilter(e.target.value)} placeholder={t('diff_filter_placeholder', 'Filter diff lines…')} />
              <button className={secondary} onClick={() => navigator.clipboard.writeText(diffText)}>
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                {t('copy', 'Copy')}
              </button>
            </div>
            <div className={panel + ' min-h-48 max-h-96 overflow-auto font-mono text-xs space-y-0.5 leading-relaxed bg-slate-950'}>
              {coloredDiffLines.map(item => (
                <div key={item.id} className={item.style}>
                  {item.line || ' '}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cheatsheet' && (
          <div className="grid md:grid-cols-2 gap-3">
            {cheatsheetCommands.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                  <pre className="font-mono text-[11px] text-indigo-300 bg-slate-900/60 p-1.5 rounded mt-1 break-all">
                    {item.cmd}
                  </pre>
                </div>
                <div className="pt-2">
                  <button className={secondary} onClick={() => navigator.clipboard.writeText(item.cmd)}>
                    <Copy className="w-3 h-3 inline mr-1" /> {t('copy_command', 'Copy command')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
