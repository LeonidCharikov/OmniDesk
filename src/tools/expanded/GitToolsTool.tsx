import React, { useMemo, useState } from 'react';
import { Copy, GitBranch, GitCommit, GitPullRequest, Search } from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { button, secondary, input, panel, ToolHeader } from './shared';

/* ─────────────────────────────────────────────────────────────
   GIT TOOLS (Conventional Commit Builder with char gauge & footers,
   Diff & Log Analyzer with file stats & filters, Searchable Cheatsheet)
   ───────────────────────────────────────────────────────────── */
export const GitToolsTool: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'commit' | 'diff' | 'cheatsheet'>('commit');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Commit Builder State
  const [commitType, setCommitType] = useState('feat');
  const [scope, setScope] = useState('');
  const [description, setDescription] = useState('upgrade developer tools and SQL playground engine');
  const [body, setBody] = useState('');
  const [issueRef, setIssueRef] = useState('');
  const [breaking, setBreaking] = useState(false);
  const [breakingDesc, setBreakingDesc] = useState('');

  const commitHeader = useMemo(() => {
    const scopePart = scope.trim() ? `(${scope.trim()})` : '';
    const breakingBang = breaking ? '!' : '';
    return `${commitType}${scopePart}${breakingBang}: ${description.trim()}`;
  }, [commitType, scope, description, breaking]);

  const fullCommitMessage = useMemo(() => {
    const parts = [commitHeader];
    if (body.trim()) parts.push(body.trim());
    const footers: string[] = [];
    if (breaking) {
      footers.push(
        `BREAKING CHANGE: ${breakingDesc.trim() || t('breaking_change_text', 'Requires updating dependent APIs or dependencies.')}`
      );
    }
    if (issueRef.trim()) {
      footers.push(issueRef.trim().startsWith('#') ? `Closes ${issueRef.trim()}` : issueRef.trim());
    }
    if (footers.length) parts.push(footers.join('\n'));
    return parts.join('\n\n');
  }, [commitHeader, body, breaking, breakingDesc, issueRef, t]);

  // 2. Diff viewer state
  const [diffText, setDiffText] = useState(
    'diff --git a/src/App.tsx b/src/App.tsx\nindex 8f9b2c1..3a1f89e 100644\n--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -15,7 +15,9 @@ import { Toolbar } from "./Toolbar";\n const App = () => {\n-  const [count, setCount] = useState(0);\n+  const [count, setCount] = useState(10);\n+  const [active, setActive] = useState(true);\n   return <div>App</div>;\n };\n'
  );
  const [diffFilter, setDiffFilter] = useState('');
  const [diffMode, setDiffMode] = useState<'all' | 'added' | 'removed'>('all');

  const diffStats = useMemo(() => {
    const lines = diffText.split('\n');
    let files = 0;
    let added = 0;
    let removed = 0;
    for (const line of lines) {
      if (line.startsWith('diff --git ')) files++;
      else if (line.startsWith('+') && !line.startsWith('+++')) added++;
      else if (line.startsWith('-') && !line.startsWith('---')) removed++;
    }
    return { files: Math.max(files, diffText.trim() ? 1 : 0), added, removed };
  }, [diffText]);

  const coloredDiffLines = useMemo(() => {
    return diffText
      .split('\n')
      .map((line, idx) => ({ id: idx + 1, line }))
      .filter(({ line }) => {
        if (diffMode === 'added' && !(line.startsWith('+') && !line.startsWith('+++'))) return false;
        if (diffMode === 'removed' && !(line.startsWith('-') && !line.startsWith('---'))) return false;
        if (diffFilter && !line.toLowerCase().includes(diffFilter.toLowerCase())) return false;
        return true;
      })
      .map(({ id, line }) => {
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
        return { id, line, style };
      });
  }, [diffText, diffFilter, diffMode]);

  // 3. Searchable Command Cheatsheet
  const [cheatSearch, setCheatSearch] = useState('');
  const cheatsheetCommands = useMemo(
    () => [
      { category: 'Branch', title: t('git_cmd_branch', 'Create and switch to a new branch'), cmd: 'git switch -c feature/my-new-tool' },
      { category: 'Branch', title: t('git_cmd_delete_branch', 'Delete merged local branch'), cmd: 'git branch -d feature/old-branch' },
      { category: 'Stash', title: t('git_cmd_stash', 'Stash and restore uncommitted changes'), cmd: 'git stash push -m "wip" && git stash pop' },
      { category: 'Undo', title: t('git_cmd_reset', 'Undo the last local commit (keep changes)'), cmd: 'git reset --soft HEAD~1' },
      { category: 'Undo', title: t('git_cmd_amend', 'Rewrite the last commit message'), cmd: 'git commit --amend -m "updated commit message"' },
      { category: 'Undo', title: t('git_cmd_restore_file', 'Discard local changes in a single file'), cmd: 'git restore path/to/file.ts' },
      { category: 'Cleanup', title: t('git_cmd_clean', 'Preview & remove untracked files'), cmd: 'git clean -fdn && git clean -fd' },
      { category: 'History', title: t('git_cmd_log', 'View compact commit graph history'), cmd: 'git log --oneline --graph --decorate --all -n 20' },
      { category: 'History', title: t('git_cmd_blame', 'Show commit history for a specific file'), cmd: 'git log -p -n 5 -- path/to/file.ts' },
      { category: 'Sync', title: t('git_cmd_rebase', 'Rebase current branch onto latest main'), cmd: 'git fetch origin && git rebase origin/main' },
    ],
    [t]
  );

  const filteredCheats = useMemo(() => {
    const q = cheatSearch.trim().toLowerCase();
    if (!q) return cheatsheetCommands;
    return cheatsheetCommands.filter(
      c => c.title.toLowerCase().includes(q) || c.cmd.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }, [cheatsheetCommands, cheatSearch]);

  const copyText = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  };

  const headerLen = commitHeader.length;
  const headerLenColor = headerLen > 72 ? 'text-rose-400' : headerLen > 50 ? 'text-amber-300' : 'text-emerald-400';

  return (
    <div className="space-y-5">
      <ToolHeader
        title="Git Tools"
        description={t('git_tools_desc', 'Build conventional commits with length checks, analyze & filter diffs, and search common Git commands.')}
      />
      <div className={panel + ' space-y-4'}>
        <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
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
              <label className="text-xs text-slate-400">
                {t('git_issue_ref', 'Issue / PR Reference (optional):')}
                <input className={input + ' mt-1'} value={issueRef} onChange={e => setIssueRef(e.target.value)} placeholder="#123" />
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{t('subject_label', 'Short description (subject):')}</span>
                <span className={`font-mono ${headerLenColor}`}>
                  {headerLen} / 72 {t('chars', 'chars')}
                </span>
              </div>
              <input className={input} value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <label className="text-xs text-slate-400 block">
              {t('body_label', 'Detailed message (body):')}
              <textarea className={input + ' mt-1 min-h-20 font-mono text-xs'} value={body} onChange={e => setBody(e.target.value)} placeholder={t('body_placeholder', 'Explain the motivation for this change…')} />
            </label>

            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-xs text-rose-300 cursor-pointer">
                <input type="checkbox" checked={breaking} onChange={e => setBreaking(e.target.checked)} className="rounded text-rose-600 bg-slate-950" />
                {t('breaking_change_label', 'Breaking Change (!)')}
              </label>
              {breaking && (
                <input
                  className={input + ' text-xs'}
                  value={breakingDesc}
                  onChange={e => setBreakingDesc(e.target.value)}
                  placeholder={t('git_breaking_desc_placeholder', 'Describe migration steps for breaking change…')}
                />
              )}
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
                <span className="text-slate-400">{t('result_commit_msg', 'Generated Commit Message:')}</span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={secondary} onClick={() => copyText('msg', fullCommitMessage)}>
                    <Copy className="w-3.5 h-3.5 inline mr-1" />
                    {copiedKey === 'msg' ? t('copied', 'Copied!') : t('copy_message', 'Copy message')}
                  </button>
                  <button
                    type="button"
                    className={button}
                    onClick={() => copyText('cmd', `git commit -m ${JSON.stringify(fullCommitMessage)}`)}
                  >
                    <Copy className="w-3.5 h-3.5 inline mr-1" />
                    {copiedKey === 'cmd' ? t('copied', 'Copied!') : t('copy_git_cmd', 'Copy git command')}
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2 font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  {diffStats.files} {t('git_diff_files', 'file(s)')}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
                  +{diffStats.added}
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300">
                  -{diffStats.removed}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['all', 'added', 'removed'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDiffMode(m)}
                    className={`px-2 py-1 rounded text-xs ${
                      diffMode === m ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {m === 'all'
                      ? t('git_filter_all', 'All')
                      : m === 'added'
                        ? t('git_filter_added', '+ Added')
                        : t('git_filter_removed', '- Removed')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                className={input + ' text-xs flex-1 min-w-48'}
                value={diffFilter}
                onChange={e => setDiffFilter(e.target.value)}
                placeholder={t('diff_filter_placeholder', 'Filter diff lines…')}
              />
              <button
                type="button"
                className={secondary}
                onClick={() => copyText('diff', coloredDiffLines.map(x => x.line).join('\n'))}
              >
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                {copiedKey === 'diff' ? t('copied', 'Copied!') : t('copy', 'Copy')}
              </button>
              <SendToToolButton
                sourceToolId="git-tools"
                kind="text"
                getText={() => coloredDiffLines.map(x => x.line).join('\n')}
              />
            </div>

            <div className={panel + ' min-h-48 max-h-96 overflow-auto font-mono text-xs space-y-0.5 leading-relaxed bg-slate-950'}>
              {coloredDiffLines.map(item => (
                <div key={item.id} className={`flex gap-3 ${item.style}`}>
                  <span className="text-slate-600 select-none w-7 text-right shrink-0">{item.id}</span>
                  <span className="whitespace-pre-wrap break-all">{item.line || ' '}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cheatsheet' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className={input + ' pl-8 text-xs'}
                value={cheatSearch}
                onChange={e => setCheatSearch(e.target.value)}
                placeholder={t('git_search_cheatsheet', 'Search Git commands (stash, rebase, undo, log)…')}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {filteredCheats.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-white">{item.title}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{item.category}</span>
                    </div>
                    <pre className="font-mono text-[11px] text-indigo-300 bg-slate-900/60 p-1.5 rounded mt-1 break-all">
                      {item.cmd}
                    </pre>
                  </div>
                  <div className="pt-2">
                    <button type="button" className={secondary} onClick={() => copyText(`cheat-${idx}`, item.cmd)}>
                      <Copy className="w-3 h-3 inline mr-1" />
                      {copiedKey === `cheat-${idx}` ? t('copied', 'Copied!') : t('copy_command', 'Copy command')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
