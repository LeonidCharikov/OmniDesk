import React, { useEffect, useMemo, useState } from 'react';
import { Download, Copy, Clock, FileText, Table, Code, Printer } from 'lucide-react';
import DOMPurify from 'dompurify';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { printHtmlDocument } from '../../services/printService';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { button, secondary, input, panel, ToolHeader } from './shared';

/* ─────────────────────────────────────────────────────────────
   4. MARKDOWN PREVIEW & EXPORT (Full parser: code, tables, lists, quotes, stats)
   ───────────────────────────────────────────────────────────── */
function fullMarkdownToHtml(markdown: string): string {
  let html = markdown
    // Escape raw HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Code blocks: ```lang\ncode\n```
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="my-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-xs overflow-x-auto"><code>${code.trim()}</code></pre>`;
  });

  // 2. Tables: | col | col | ...
  html = html.replace(/((?:\|[^\n]+\|\r?\n)+)/g, match => {
    const lines = match.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return match;
    // Check if second line is separator
    const isTable = /^\|(?:\s*:?-+:?\s*\|)+$/.test(lines[1]);
    if (!isTable) return match;

    const headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
    const rows = lines.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));

    const headHtml = `<tr>${headers.map(h => `<th class="p-2 border border-slate-700 bg-slate-800 text-left font-semibold text-xs text-slate-200">${h}</th>`).join('')}</tr>`;
    const bodyHtml = rows
      .map(
        row =>
          `<tr>${row.map(cell => `<td class="p-2 border border-slate-800 text-xs text-slate-300">${cell}</td>`).join('')}</tr>`
      )
      .join('');
    return `<div class="my-3 overflow-x-auto"><table class="w-full border-collapse border border-slate-700 text-xs">${headHtml}${bodyHtml}</table></div>`;
  });

  // 3. Headings
  html = html
    .replace(/^##### (.+)$/gm, '<h5 class="text-sm font-semibold text-slate-200 mt-3 mb-1">$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-slate-200 mt-3 mb-1">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-white mt-4 mb-2 border-b border-slate-800 pb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-5 mb-2 border-b border-slate-800 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-extrabold text-white mt-6 mb-3 border-b-2 border-indigo-500 pb-2">$1</h1>');

  // 4. Blockquotes: > quote
  html = html.replace(/^> (.*)$/gm, '<blockquote class="my-2 pl-3 border-l-4 border-indigo-500 italic text-slate-300 bg-slate-900/40 py-1 rounded-r">$1</blockquote>');

  // 5. Horizontal rules: --- or ***
  html = html.replace(/^(?:---|===|\*\*\*)$/gm, '<hr class="my-4 border-slate-800" />');

  // 6. Task lists: - [ ] or - [x]
  html = html.replace(/^- \[x\] (.*)$/gm, '<div class="flex items-center gap-2 text-xs text-emerald-400 my-1"><span class="font-mono">☑</span> <span class="line-through text-slate-400">$1</span></div>');
  html = html.replace(/^- \[ \] (.*)$/gm, '<div class="flex items-center gap-2 text-xs text-slate-300 my-1"><span class="font-mono">☐</span> <span>$1</span></div>');

  // 7. Unordered lists: - item or * item
  html = html.replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc text-slate-300 text-xs">$1</li>');

  // 8. Ordered lists: 1. item
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-300 text-xs">$2</li>');

  // 9. Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px]">$1</code>');

  // 10. Links and Images (protocol-validated to block javascript: / vbscript: URIs)
  const sanitizeMarkdownUrl = (rawUrl: string, allowDataImage = false): string => {
    const trimmed = rawUrl.trim();
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmed)) return trimmed;
    if (allowDataImage && /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(trimmed)) return trimmed;
    return '#';
  };
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img src="${sanitizeMarkdownUrl(src, true)}" alt="${alt}" class="my-2 rounded max-h-64 max-w-full" />`);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${sanitizeMarkdownUrl(href)}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline hover:text-indigo-300">${label}</a>`);

  // 11. Bold, Italic, Strikethrough
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del class="text-slate-500">$1</del>');

  // 12. Paragraphs / Linebreaks
  html = html.replace(/\n\n/g, '<p class="my-2 leading-relaxed"></p>').replace(/\n/g, '<br />');

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
}

export const MarkdownPreviewTool: React.FC = () => {
  const { t } = useI18n();
  const [markdown, setMarkdown] = useState(() =>
    `# ${t('md_sample_heading', 'OmniDesk Toolkit')}\n\n${t('md_sample_desc', 'Kompletní sada lokálních vývojářských a kancelářských utilit.')}\n\n## ${t('md_sample_features', 'Hlavní funkce')}\n\n- ${t('md_sample_f1', 'Rychlé spouštění bez závislosti na cloudu')}\n- ${t('md_sample_f2', 'Podpora offline režimu')}\n- ${t('md_sample_f3', 'Šifrování a zpracování dat v paměti')}\n\n### ${t('md_sample_table_title', 'Přehled podporovaných formátů')}\n\n| Format | Input | Output |\n| :--- | :--- | :--- |\n| PDF | Yes | Yes |\n| JSON | Yes | Yes |\n| SVG | Yes | Yes |\n\n> "${t('md_sample_quote', 'Jednoduchost je základem spolehlivého softwaru.')}"\n\n\`\`\`typescript\nconst message = "${t('md_sample_code_msg', 'Vítejte v OmniDesk!')}";\nconsole.log(message);\n\`\`\`\n`
  );

  useEffect(() => {
    const piped = consumePendingToolPipe('markdown-preview');
    if (!piped) return;
    if (piped.kind === 'text' && typeof piped.text === 'string') {
      setMarkdown(piped.text);
    } else if (piped.kind === 'file' && piped.file) {
      piped.file.text().then(txt => setMarkdown(txt));
    }
  }, []);

  const html = useMemo(() => fullMarkdownToHtml(markdown), [markdown]);

  const stats = useMemo(() => {
    const chars = markdown.length;
    const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
    const lines = markdown.split('\n').length;
    const readTimeMinutes = Math.max(1, Math.ceil(words / 200));
    return { chars, words, lines, readTimeMinutes };
  }, [markdown]);

  const insertTemplate = (type: 'readme' | 'notes' | 'table') => {
    if (type === 'readme') {
      setMarkdown(
        `# ${t('tmpl_proj_title', 'Název projektu')}\n\n${t('tmpl_proj_desc', 'Krátký popis účelu projektu.')}\n\n## ${t('tmpl_proj_install', 'Instalace')}\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## ${t('tmpl_proj_license', 'Licence')}\n\nMIT`
      );
    } else if (type === 'notes') {
      setMarkdown(
        `# ${t('tmpl_meeting_title', 'Zápis ze schůzky')}\n\n**${t('tmpl_date', 'Datum:')}** ${new Date().toLocaleDateString()}\n**${t('tmpl_attendees', 'Účastníci:')}** Alice, Bob, Martin\n\n## Agenda\n\n1. ${t('tmpl_agenda_1', 'Shrnutí stavu projektu')}\n2. ${t('tmpl_agenda_2', 'Rozdělení úkolů na další sprint')}\n\n## ${t('tmpl_tasks', 'Úkoly')}\n\n- [ ] ${t('tmpl_task_1', 'Připravit podklady pro klienta')}\n- [ ] ${t('tmpl_task_2', 'Zkontrolovat nasazení na server')}`
      );
    } else {
      setMarkdown(
        `# ${t('tmpl_comp_table', 'Srovnávací tabulka')}\n\n| ${t('tmpl_col_item', 'Položka')} | ${t('tmpl_col_a', 'Varianta A')} | ${t('tmpl_col_b', 'Varianta B')} |\n| :--- | :--- | :--- |\n| ${t('tmpl_row_price', 'Cena')} | 490 | 790 |\n| ${t('tmpl_row_warranty', 'Záruka')} | 2 ${t('tmpl_years', 'roky')} | 5 ${t('tmpl_years_gen', 'let')} |\n| ${t('tmpl_row_avail', 'Dostupnost')} | ${t('tmpl_in_stock', 'Skladem')} | 3 ${t('tmpl_days', 'dny')} |`
      );
    }
  };

  return (
    <div className="space-y-5">
      <ToolHeader title="Markdown Preview & Export" description={t('markdown_preview_desc', 'Full-featured live Markdown preview with tables, code blocks, and HTML export.')} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button className={secondary} onClick={() => insertTemplate('readme')}>
            <FileText className="w-3.5 h-3.5 inline mr-1" /> {t('template_readme', 'Šablona README')}
          </button>
          <button className={secondary} onClick={() => insertTemplate('notes')}>
            <Clock className="w-3.5 h-3.5 inline mr-1" /> {t('template_notes', 'Šablona Poznámky')}
          </button>
          <button className={secondary} onClick={() => insertTemplate('table')}>
            <Table className="w-3.5 h-3.5 inline mr-1" /> {t('template_table', 'Šablona Tabulka')}
          </button>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {stats.words} {t('words_count_label', 'slov')} &bull; {stats.chars} {t('chars_count_label', 'znaků')} &bull; ~{stats.readTimeMinutes} {t('min_reading', 'min čtení')}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <textarea
          className={input + ' min-h-[460px] font-mono text-xs leading-relaxed'}
          value={markdown}
          onChange={e => setMarkdown(e.target.value)}
          placeholder={t('write_markdown', 'Zde pište Markdown text…')}
        />
        <div
          className={panel + ' min-h-[460px] overflow-auto text-slate-200 bg-slate-950/80 border-slate-800 p-5'}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={button}
          onClick={() =>
            saveTextWithDialog(
              'document.html',
              `<!doctype html><html><head><meta charset="utf-8"><title>Export</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;line-height:1.6;color:#1e293b}pre{background:#0f172a;color:#818cf8;padding:16px;border-radius:8px;overflow-x:auto}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #cbd5e1;padding:8px 12px;text-align:left}th{background:#f1f5f9}blockquote{border-left:4px solid #6366f1;padding-left:12px;color:#475569;margin:16px 0}</style></head><body>${html}</body></html>`,
              [{ name: 'HTML (*.html)', extensions: ['html'] }],
              t('save_html', 'Uložit HTML')
            )
          }
        >
          <Download className="inline w-3.5 h-3.5 mr-1" />
          {t('export_html', 'Exportovat HTML')}
        </button>
        <button
          className={secondary}
          onClick={() =>
            void printHtmlDocument(html, {
              title: t('md_sample_heading', 'Markdown Document'),
              extraCss:
                'h1,h2,h3,h4,h5,p,li,div,strong,em{color:#0f172a!important}blockquote{background:#f8fafc!important;color:#334155!important;border-left:4px solid #6366f1!important;padding:8px 12px!important}pre{background:#f8fafc!important;color:#0f172a!important;border:1px solid #cbd5e1!important;padding:12px!important;border-radius:6px!important}code{background:#f1f5f9!important;color:#1e293b!important}th{background:#f1f5f9!important;color:#0f172a!important;border-color:#cbd5e1!important}td{color:#0f172a!important;border-color:#cbd5e1!important}li{margin-left:18px!important}',
            })
          }
          title={t('print_btn', 'Print')}
        >
          <Printer className="inline w-3.5 h-3.5 mr-1 text-indigo-400" />
          {t('print_btn', 'Print')}
        </button>
        <button className={secondary} onClick={() => navigator.clipboard.writeText(html)}>
          <Copy className="inline w-3.5 h-3.5 mr-1" />
          {t('copy_html', 'Kopírovat HTML')}
        </button>
        <button className={secondary} onClick={() => navigator.clipboard.writeText(markdown)}>
          <Copy className="inline w-3.5 h-3.5 mr-1" />
          {t('copy_markdown', 'Kopírovat Markdown')}
        </button>
      </div>
    </div>
  );
};
