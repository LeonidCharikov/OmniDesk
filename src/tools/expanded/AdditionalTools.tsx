import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { Download, FileUp, Plus, Trash2, Play, Send, Copy, Search, RotateCw } from 'lucide-react';
import { saveBinaryWithDialog, saveTextWithDialog } from '../../services/fileSystemService';
import { useI18n } from '../../i18n/context';

const button = 'px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors';
const secondary = 'px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors';
const input = 'w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-200';
const panel = 'p-4 rounded-xl bg-slate-900/50 border border-slate-800';

function FilePicker({ id, label, fileName, accept, multiple, onChange }: { id: string; label: string; fileName?: string; accept: string; multiple?: boolean; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
  return <div className="space-y-2"><span className="block text-xs font-medium text-slate-300">{label}</span><div className="flex flex-wrap items-center gap-2"><label htmlFor={id} className={button + ' inline-flex items-center gap-2 cursor-pointer'}><FileUp className="w-4 h-4" />{label}</label>{fileName && <span className="text-xs text-slate-400 truncate max-w-full">{fileName}</span>}</div><input id={id} className="sr-only" type="file" accept={accept} multiple={multiple} onChange={onChange} /></div>;
}

function ToolHeader({ title, description }: { title: string; description: string }) {
  const { t } = useI18n();
  const translations: Record<string, [string, string]> = {
    'PDF Toolkit': ['pdf_toolkit_title', 'PDF nástroje'],
    'OCR skener': ['ocr_scanner_title', 'OCR skener'],
    'Image Editor': ['image_editor_title', 'Editor obrázků'],
    'Markdown Preview & Export': ['markdown_preview_title', 'Náhled a export Markdownu'],
    'To-do / Kanban': ['kanban_title', 'Úkoly / Kanban'],
    'Poznámky': ['notes_title', 'Poznámky'],
    'SQL Playground': ['sql_playground_title', 'SQL hřiště'],
    'API Tester': ['api_tester_title', 'Tester API'],
    'Git nástroje': ['git_tools_title', 'Git nástroje'],
    'UML Diagram Editor': ['diagram_editor_title', 'Editor UML diagramů'],
  };
  const descriptions: Record<string, string> = {
    'PDF Toolkit': 'Lokálně slučujte soubory PDF nebo otočte stránky vybraného dokumentu.',
    'OCR skener': 'Extrahujte text z obrázku lokálně bez odesílání souboru na server.',
    'Image Editor': 'Změňte velikost, komprimujte, zobrazte náhled a exportujte obrázek jako JPEG.',
    'Markdown Preview & Export': 'Živý náhled Markdownu s exportem do HTML.',
    'To-do / Kanban': 'Jednoduchá tabule úkolů se třemi sloupci.',
    'Poznámky': 'Více lokálních poznámek s vyhledáváním a automatickým ukládáním.',
    'SQL Playground': 'Lokální dotazování JSON dat syntaxí SELECT ... FROM data.',
    'API Tester': 'Odesílejte HTTP požadavky a prohlížejte si odpovědi.',
    'Git nástroje': 'Analyzujte vložený Git log nebo diff bez úprav repozitáře.',
    'UML Diagram Editor': 'Vytvářejte UML uzly, upravujte texty, propojujte je šipkami a exportujte SVG.',
  };
  const [key, fallback] = translations[title] || ['', title];
  return <div className={panel}><h2 className="text-lg font-semibold text-white">{key ? t(key, fallback) : title}</h2><p className="mt-1 text-sm text-slate-400">{key ? t(`${key}_desc`, descriptions[title] || description) : description}</p></div>;
}

export const PdfToolkitTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'merge' | 'rotate'>('merge');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const merge = async () => {
    if (!files.length) return;
    setBusy(true); setMessage('');
    try {
      const output = await PDFDocument.create();
      for (const file of files) {
        const source = await PDFDocument.load(await file.arrayBuffer());
        const pages = await output.copyPages(source, source.getPageIndices());
        pages.forEach(page => output.addPage(page));
      }
      const bytes = await output.save();
      const result = await saveBinaryWithDialog('merged.pdf', new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), 'application/pdf', [{ name: 'PDF (*.pdf)', extensions: ['pdf'] }], 'Save merged PDF');
      setMessage(result.success ? t('pdf_merged', `Sloučeno ${files.length} souborů PDF.`) : result.canceled ? t('save_canceled', 'Ukládání zrušeno.') : result.error || t('pdf_merge_failed', 'Sloučení PDF se nezdařilo.'));
    } catch (error) { setMessage(error instanceof Error ? error.message : t('pdf_processing_failed', 'PDF se nepodařilo zpracovat.')); }
    finally { setBusy(false); }
  };
  const rotate = async (file: File) => {
    const pdf = await PDFDocument.load(await file.arrayBuffer());
    pdf.getPages().forEach(page => page.setRotation(degrees(90)));
    const bytes = await pdf.save();
    const result = await saveBinaryWithDialog(`${file.name.replace(/\.pdf$/i, '')}-rotated.pdf`, new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), 'application/pdf', [{ name: 'PDF (*.pdf)', extensions: ['pdf'] }], 'Save rotated PDF');
    setMessage(result.success ? t('pdf_rotated', `Otočeno: ${file.name}.`) : result.canceled ? t('save_canceled', 'Ukládání zrušeno.') : result.error || t('pdf_rotate_failed', 'Otočení PDF se nezdařilo.'));
  };
  return <div className="space-y-5"><ToolHeader title="PDF Toolkit" description={t('pdf_toolkit_desc', 'Lokálně slučujte soubory PDF nebo otočte stránky vybraného PDF.')} />
    <div className={panel + ' space-y-3'}><FilePicker id="pdf-toolkit-files" label={t('choose_pdf_files', 'Vybrat soubory PDF')} fileName={files.length ? files.map(file => file.name).join(', ') : undefined} accept=".pdf,application/pdf" multiple onChange={e => setFiles(Array.from(e.target.files || []))} />
      <select className={input} value={mode} onChange={e => setMode(e.target.value as 'merge' | 'rotate')}><option value="merge">{t('merge_selected_pdfs', 'Sloučit vybrané soubory PDF')}</option><option value="rotate">{t('rotate_selected_pdf_pages', 'Otočit stránky vybraného PDF')}</option></select>
      <div className="space-y-2">{files.map((file, i) => <div key={`${file.name}-${i}`} className="flex items-center justify-between text-sm text-slate-300"><span>{file.name}</span></div>)}</div>
      <button className={button} disabled={busy || !files.length} onClick={() => mode === 'merge' ? merge() : rotate(files[0])}>{busy ? t('processing', 'Zpracování…') : mode === 'merge' ? t('merge_pdfs', 'Sloučit PDF') : t('rotate_first_pdf', 'Otočit první PDF')}</button>{message && <p className={`text-xs ${message.includes('Could not') || message.includes('canceled') ? 'text-amber-300' : 'text-emerald-400'}`}>{message}</p>}</div>
  </div>;
};

export const OcrScannerTool: React.FC = () => {
  const { t } = useI18n();
  const [image, setImage] = useState<File | null>(null); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0);
  const scan = async () => {
    if (!image) return; setBusy(true); setText('');
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, { logger: data => { if (typeof data.progress === 'number') setProgress(Math.round(data.progress * 100)); } });
      const result = await worker.recognize(image); setText(result.data.text); await worker.terminate();
    } catch (error) { setText(error instanceof Error ? error.message : 'OCR se nepodařilo dokončit.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5"><ToolHeader title="OCR skener" description={t('ocr_scanner_desc', 'Extrahujte text z obrázku lokálně bez odesílání souboru na server.')} />
    <div className={panel + ' space-y-3'}><FilePicker id="ocr-image-file" label={t('choose_image', 'Vybrat obrázek')} fileName={image?.name} accept="image/*" onChange={e => setImage(e.target.files?.[0] || null)} /><button className={button} disabled={!image || busy} onClick={scan}>{busy ? t('scanning_progress', `Skenování ${progress}%…`) : t('run_ocr', 'Spustit OCR')}</button>
      <textarea className={input + ' min-h-56'} value={text} onChange={e => setText(e.target.value)} placeholder={t('ocr_result_placeholder', 'Výsledek OCR se zobrazí zde')} /><button className={secondary} disabled={!text} onClick={() => navigator.clipboard.writeText(text)}><Copy className="inline w-3.5 h-3.5 mr-1" />{t('copy_text', 'Kopírovat text')}</button></div></div>;
};

export const ImageEditorTool: React.FC = () => {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null); const [width, setWidth] = useState(1200); const [height, setHeight] = useState(800); const [quality, setQuality] = useState(85); const [preview, setPreview] = useState(''); const [originalPreview, setOriginalPreview] = useState('');
  useEffect(() => {
    if (!file) { setOriginalPreview(''); return; }
    const url = URL.createObjectURL(file); setOriginalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const process = async () => {
    if (!file) return; const image = new Image(); const sourceUrl = URL.createObjectURL(file); image.src = sourceUrl; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.drawImage(image, 0, 0, width, height); const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality / 100)); if (!blob) return;
    URL.revokeObjectURL(sourceUrl);
    setPreview(URL.createObjectURL(blob)); await saveBinaryWithDialog(`${file.name.replace(/\.[^.]+$/, '')}-edited.jpg`, blob, 'image/jpeg', [{ name: 'JPEG (*.jpg)', extensions: ['jpg'] }], 'Uložit upravený obrázek');
  };
  return <div className="space-y-5"><ToolHeader title="Image Editor" description={t('image_editor_desc', 'Měňte velikost, komprimujte, zobrazujte náhled a exportujte obrázky jako JPEG.')} /><div className={panel + ' space-y-3'}><FilePicker id="image-editor-file" label={t('choose_image', 'Vybrat obrázek')} fileName={file?.name} accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} />{originalPreview && <img className="max-h-80 max-w-full rounded-lg object-contain" src={originalPreview} alt={t('selected_image_preview', 'Náhled vybraného obrázku')} />}<div className="grid grid-cols-3 gap-3"><label className="text-xs text-slate-400">{t('width', 'Šířka')}<input className={input} type="number" value={width} onChange={e => setWidth(Number(e.target.value))} /></label><label className="text-xs text-slate-400">{t('height', 'Výška')}<input className={input} type="number" value={height} onChange={e => setHeight(Number(e.target.value))} /></label><label className="text-xs text-slate-400">{t('quality', 'Kvalita')}<input className={input} type="number" min="1" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))} /></label></div><button className={button} disabled={!file} onClick={process}>{t('edit_and_save', 'Upravit a uložit')}</button>{preview && <img className="max-h-80 rounded-lg" src={preview} alt={t('edited_image_preview', 'Náhled upraveného obrázku')} />}</div></div>;
};

function markdownToHtml(markdown: string) {
  return markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/\n/g, '<br />');
}
export const MarkdownPreviewTool: React.FC = () => {
  const { t } = useI18n();
  const [markdown, setMarkdown] = useState('# Moje poznámka\n\n**Markdown** náhled funguje okamžitě.');
  const html = useMemo(() => markdownToHtml(markdown), [markdown]);
  return <div className="space-y-5"><ToolHeader title="Markdown Preview & Export" description={t('markdown_preview_desc', 'Živý náhled Markdownu s exportem do HTML.')} /><div className="grid md:grid-cols-2 gap-4"><textarea className={input + ' min-h-96 font-mono'} value={markdown} onChange={e => setMarkdown(e.target.value)} /><div className={panel + ' prose prose-invert max-w-none overflow-auto'} dangerouslySetInnerHTML={{ __html: html }} /></div><button className={button} onClick={() => saveTextWithDialog('document.html', `<!doctype html><meta charset="utf-8"><body>${html}</body>`, [{ name: 'HTML (*.html)', extensions: ['html'] }], t('save_html', 'Uložit HTML'))}>{t('export_html', 'Exportovat HTML')}</button></div>;
};

type BoardTask = { id: number; text: string; column: 'todo' | 'doing' | 'done' };
export const KanbanTool: React.FC = () => {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<BoardTask[]>([]); const [text, setText] = useState('');
  const add = () => { if (text.trim()) { setTasks([...tasks, { id: Date.now(), text: text.trim(), column: 'todo' }]); setText(''); } };
  const move = (id: number, column: BoardTask['column']) => setTasks(tasks.map(task => task.id === id ? { ...task, column } : task));
  return <div className="space-y-5"><ToolHeader title="To-do / Kanban" description={t('kanban_desc', 'Jednoduchá tabule úkolů se třemi sloupci.')} /><div className="flex gap-2"><input className={input} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder={t('new_task', 'Nový úkol…')} /><button className={button} onClick={add}><Plus className="inline w-4 h-4" /> {t('add', 'Přidat')}</button></div><div className="grid md:grid-cols-3 gap-4">{(['todo', 'doing', 'done'] as const).map(column => <div key={column} className={panel + ' min-h-48'}><h3 className="font-semibold text-white mb-3">{column === 'todo' ? t('planned', 'Naplánováno') : column === 'doing' ? t('in_progress', 'Probíhá') : t('done', 'Hotovo')}</h3>{tasks.filter(task => task.column === column).map(task => <div key={task.id} className="mb-2 p-3 rounded-lg bg-slate-800 text-sm flex justify-between gap-2"><span>{task.text}</span><select className="bg-slate-900 text-xs" value={task.column} onChange={e => move(task.id, e.target.value as BoardTask['column'])}><option value="todo">{t('planned', 'Naplánováno')}</option><option value="doing">{t('in_progress', 'Probíhá')}</option><option value="done">{t('done', 'Hotovo')}</option></select></div>)}</div>)}</div></div>;
};

type Note = { id: number; title: string; body: string };
export const NotesTool: React.FC = () => {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>(() => JSON.parse(localStorage.getItem('omnidesk-notes') || '[]')); const [selected, setSelected] = useState<number | null>(notes[0]?.id || null); const [query, setQuery] = useState('');
  const current = notes.find(note => note.id === selected);
  const update = (patch: Partial<Note>) => { const next = notes.map(note => note.id === selected ? { ...note, ...patch } : note); setNotes(next); localStorage.setItem('omnidesk-notes', JSON.stringify(next)); };
  const add = () => { const note = { id: Date.now(), title: t('new_note', 'Nová poznámka'), body: '' }; const next = [...notes, note]; setNotes(next); setSelected(note.id); localStorage.setItem('omnidesk-notes', JSON.stringify(next)); };
  return <div className="space-y-5"><ToolHeader title="Poznámky" description={t('notes_desc', 'Více lokálních poznámek s vyhledáváním a automatickým ukládáním.')} /><div className="grid md:grid-cols-[220px_1fr] gap-4"><div className={panel + ' space-y-2'}><button className={button + ' w-full'} onClick={add}><Plus className="inline w-4 h-4" /> {t('new', 'Nová')}</button><div className="relative"><Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-500" /><input className={input + ' pl-8'} value={query} onChange={e => setQuery(e.target.value)} placeholder={t('search', 'Hledat')} /></div>{notes.filter(note => `${note.title} ${note.body}`.toLowerCase().includes(query.toLowerCase())).map(note => <button key={note.id} className={`w-full text-left p-2 rounded ${note.id === selected ? 'bg-indigo-600/30' : 'hover:bg-slate-800'}`} onClick={() => setSelected(note.id)}>{note.title}</button>)}</div><div className={panel + ' space-y-3'}>{current ? <><input className={input} value={current.title} onChange={e => update({ title: e.target.value })} /><textarea className={input + ' min-h-80'} value={current.body} onChange={e => update({ body: e.target.value })} /></> : <p className="text-slate-400">{t('create_first_note', 'Vytvořte první poznámku.')}</p>}</div></div></div>;
};

export const SqlPlaygroundTool: React.FC = () => {
  const { t } = useI18n();
  const [data, setData] = useState('[{"name":"Alice","age":30},{"name":"Bob","age":25}]'); const [query, setQuery] = useState('SELECT * FROM data'); const [result, setResult] = useState('');
  const run = () => { try { const rows = JSON.parse(data) as Record<string, unknown>[]; const match = query.match(/select\s+(.+?)\s+from\s+data(?:\s+where\s+(.+))?/i); if (!match) throw new Error(t('sql_supported_query', 'Podporováno je SELECT ... FROM data.')); const fields = match[1].trim() === '*' ? null : match[1].split(',').map(field => field.trim()); const filtered = rows.filter(row => { if (!match[2]) return true; const where = match[2].match(/(\w+)\s*=\s*['"]?([^'"]+)['"]?/); return where ? String(row[where[1]]) === where[2] : true; }); setResult(JSON.stringify(fields ? filtered.map(row => Object.fromEntries(fields.filter(field => field in row).map(field => [field, row[field]]))) : filtered, null, 2)); } catch (error) { setResult(error instanceof Error ? error.message : t('invalid_query', 'Neplatný dotaz.')); } };
  return <div className="space-y-5"><ToolHeader title="SQL Playground" description={t('sql_playground_desc', 'Lokální dotazování JSON dat syntaxí SELECT ... FROM data.')} /><div className="grid md:grid-cols-2 gap-4"><textarea className={input + ' min-h-64 font-mono'} value={data} onChange={e => setData(e.target.value)} /><div className="space-y-2"><textarea className={input + ' min-h-24 font-mono'} value={query} onChange={e => setQuery(e.target.value)} /><button className={button} onClick={run}><Play className="inline w-4 h-4" /> {t('run', 'Spustit')}</button><pre className={panel + ' min-h-40 overflow-auto text-xs'}>{result}</pre></div></div></div>;
};

export const ApiTesterTool: React.FC = () => {
  const { t } = useI18n();
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1'); const [method, setMethod] = useState('GET'); const [body, setBody] = useState(''); const [result, setResult] = useState(''); const [busy, setBusy] = useState(false);
  const send = async () => { setBusy(true); try { const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'GET' ? undefined : body }); const text = await response.text(); try { setResult(`${response.status} ${response.statusText}\n\n${JSON.stringify(JSON.parse(text), null, 2)}`); } catch { setResult(`${response.status} ${response.statusText}\n\n${text}`); } } catch (error) { setResult(error instanceof Error ? error.message : t('request_failed', 'Požadavek selhal.')); } finally { setBusy(false); } };
  return <div className="space-y-5"><ToolHeader title="API Tester" description={t('api_tester_desc', 'Odesílání HTTP požadavků a prohlížení odpovědí.')} /><div className={panel + ' space-y-3'}><div className="flex gap-2"><select className={input + ' max-w-28'} value={method} onChange={e => setMethod(e.target.value)}><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select><input className={input} value={url} onChange={e => setUrl(e.target.value)} /> </div>{method !== 'GET' && <textarea className={input} value={body} onChange={e => setBody(e.target.value)} placeholder={t('json_request_body', 'JSON tělo požadavku')} />}<button className={button} disabled={busy} onClick={send}><Send className="inline w-4 h-4" /> {busy ? t('sending', 'Odesílání…') : t('send', 'Odeslat')}</button><pre className={panel + ' min-h-52 overflow-auto text-xs whitespace-pre-wrap'}>{result}</pre></div></div>;
};

export const GitToolsTool: React.FC = () => {
  const { t } = useI18n();
  const [inputText, setInputText] = useState('commit abc123 (HEAD -> main)\\nAuthor: Alice\\nDate: today\\n\\n    Add feature\\n\\n file.ts | 2 +-\n'); const [filter, setFilter] = useState('');
  const lines = inputText.split('\n').filter(line => line.toLowerCase().includes(filter.toLowerCase()));
  return <div className="space-y-5"><ToolHeader title="Git nástroje" description={t('git_tools_desc', 'Lokální prohlížeč vloženého git logu nebo diffu s filtrováním.')} /><textarea className={input + ' min-h-64 font-mono'} value={inputText} onChange={e => setInputText(e.target.value)} /><div className="flex gap-2"><input className={input} value={filter} onChange={e => setFilter(e.target.value)} placeholder={t('filter_output', 'Filtrovat výstup…')} /><button className={secondary} onClick={() => navigator.clipboard.writeText(lines.join('\n'))}><Copy className="inline w-4 h-4" /> {t('copy', 'Kopírovat')}</button></div><pre className={panel + ' overflow-auto text-xs whitespace-pre-wrap'}>{lines.join('\n')}</pre></div>;
};

export const DiagramEditorTool: React.FC = () => {
  const { t } = useI18n();
  type UmlNode = { id: number; x: number; y: number; text: string; type: 'class' | 'interface' | 'actor' | 'usecase' };
  type UmlEdge = { id: number; from: number; to: number; label: string; dashed: boolean };
  const [nodes, setNodes] = useState<UmlNode[]>([{ id: 1, x: 80, y: 80, text: 'User', type: 'actor' }, { id: 2, x: 330, y: 160, text: 'Order', type: 'class' }]);
  const [edges, setEdges] = useState<UmlEdge[]>([{ id: 1, from: 1, to: 2, label: 'creates', dashed: false }]);
  const [selected, setSelected] = useState(1);
  const [edgeFrom, setEdgeFrom] = useState(1);
  const [edgeTo, setEdgeTo] = useState(2);
  const [edgeLabel, setEdgeLabel] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const selectedNode = nodes.find(node => node.id === selected);
  const add = (type: UmlNode['type']) => { const id = Date.now(); setNodes([...nodes, { id, x: 80 + nodes.length * 45, y: 280, text: type === 'class' ? 'NewClass' : 'NewNode', type }]); setSelected(id); };
  const addEdge = () => { if (edgeFrom === edgeTo) return; setEdges([...edges, { id: Date.now(), from: edgeFrom, to: edgeTo, label: edgeLabel, dashed: false }]); setEdgeLabel(''); };
  const exportSvg = async () => { if (!svgRef.current) return; const source = new XMLSerializer().serializeToString(svgRef.current); await saveTextWithDialog('diagram.svg', source, [{ name: 'SVG (*.svg)', extensions: ['svg'] }], 'Uložit diagram'); };
  return <div className="space-y-5"><ToolHeader title="UML Diagram Editor" description={t('diagram_editor_desc', 'Vytvářejte UML uzly tříd, rozhraní, aktérů a případů užití, upravujte popisky, propojujte je šipkami a exportujte SVG.')} />
    <div className="flex flex-wrap gap-2">{(['class', 'interface', 'actor', 'usecase'] as UmlNode['type'][]).map(type => <button key={type} className={button} onClick={() => add(type)}>{t(`add_${type}`, `Přidat ${type}`)}</button>)}<button className={secondary} onClick={exportSvg}><Download className="inline w-4 h-4" /> {t('export_svg', 'Exportovat SVG')}</button><button className={secondary} onClick={() => { setNodes(nodes.filter(node => node.id !== selected)); setEdges(edges.filter(edge => edge.from !== selected && edge.to !== selected)); }}><Trash2 className="inline w-4 h-4" /> {t('delete_selected', 'Smazat vybraný')}</button></div>
    {selectedNode && <div className={panel + ' grid md:grid-cols-3 gap-2'}><label className="text-xs text-slate-400">{t('selected_label', 'Vybraný popisek')}<input className={input} value={selectedNode.text} onChange={event => setNodes(nodes.map(node => node.id === selected ? { ...node, text: event.target.value } : node))} /></label><label className="text-xs text-slate-400">{t('node_type', 'Typ uzlu')}<select className={input} value={selectedNode.type} onChange={event => setNodes(nodes.map(node => node.id === selected ? { ...node, type: event.target.value as UmlNode['type'] } : node))}><option value="class">{t('class', 'Třída')}</option><option value="interface">{t('interface', 'Rozhraní')}</option><option value="actor">{t('actor', 'Aktér')}</option><option value="usecase">{t('usecase', 'Případ užití')}</option></select></label><div className="text-xs text-slate-400">{t('select_node_hint', 'Kliknutím na uzel jej vyberete a upravíte.')}</div></div>}
    <div className={panel + ' flex flex-wrap gap-2 items-end'}><label className="text-xs text-slate-400">{t('from', 'Od')}<select className={input} value={edgeFrom} onChange={event => setEdgeFrom(Number(event.target.value))}>{nodes.map(node => <option key={node.id} value={node.id}>{node.text}</option>)}</select></label><label className="text-xs text-slate-400">{t('to', 'Do')}<select className={input} value={edgeTo} onChange={event => setEdgeTo(Number(event.target.value))}>{nodes.map(node => <option key={node.id} value={node.id}>{node.text}</option>)}</select></label><input className={input + ' max-w-48'} value={edgeLabel} onChange={event => setEdgeLabel(event.target.value)} placeholder={t('arrow_label', 'Popisek šipky')} /><button className={button} onClick={addEdge}>{t('add_arrow', 'Přidat šipku')}</button></div>
    <svg ref={svgRef} viewBox="0 0 700 450" className="w-full min-h-96 rounded-xl bg-slate-950 border border-slate-800">{edges.map(edge => { const from = nodes.find(node => node.id === edge.from); const to = nodes.find(node => node.id === edge.to); if (!from || !to) return null; return <g key={edge.id}><line x1={from.x + 70} y1={from.y + 30} x2={to.x + 70} y2={to.y + 30} stroke="#94a3b8" strokeDasharray={edge.dashed ? '6 4' : undefined} markerEnd="url(#arrow)" /><text x={(from.x + to.x) / 2 + 70} y={(from.y + to.y) / 2 + 20} fill="#cbd5e1" fontSize="11">{edge.label}</text></g>; })}<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#94a3b8" /></marker></defs>{nodes.map(node => <g key={node.id} onClick={() => setSelected(node.id)} className="cursor-pointer"><rect x={node.x} y={node.y} width="140" height="60" rx={node.type === 'actor' ? 30 : node.type === 'usecase' ? 28 : 4} fill={node.id === selected ? '#4338ca' : '#1e293b'} stroke="#818cf8" /><text x={node.x + 70} y={node.y + 35} textAnchor="middle" fill="white" fontSize="13">{node.text}</text><text x={node.x + 70} y={node.y + 52} textAnchor="middle" fill="#a5b4fc" fontSize="9">&lt;&lt;{node.type}&gt;&gt;</text></g>)}</svg></div>;
};
