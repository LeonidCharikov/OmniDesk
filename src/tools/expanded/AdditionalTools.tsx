import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import {
  Download,
  FileUp,
  Plus,
  Trash2,
  Play,
  Send,
  Copy,
  Search,
  RotateCw,
  Check,
  AlertCircle,
  Clock,
  Tag,
  ExternalLink,
  X,
  FileText,
  RefreshCw,
  Sliders,
  CheckSquare,
  FlipHorizontal,
  FlipVertical,
  Table,
  Code,
  Sparkles,
  GitBranch,
  GitCommit,
  GitPullRequest,
} from 'lucide-react';
import { saveBinaryWithDialog, saveTextWithDialog } from '../../services/fileSystemService';
import { useI18n } from '../../i18n/context';
import { findToolCatalogIdByTitle, getToolCatalogText } from '../../i18n/toolCatalog';

const button = 'px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const secondary = 'px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const danger = 'px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-medium transition-colors';
const input = 'w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-sm text-slate-200';
const panel = 'p-4 rounded-xl bg-slate-900/50 border border-slate-800';

function FilePicker({
  id,
  label,
  fileName,
  accept,
  multiple,
  onChange,
}: {
  id: string;
  label: string;
  fileName?: string;
  accept: string;
  multiple?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-slate-300">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className={button + ' inline-flex items-center gap-2 cursor-pointer'}>
          <FileUp className="w-4 h-4" />
          {label}
        </label>
        {fileName && <span className="text-xs text-slate-400 truncate max-w-full">{fileName}</span>}
      </div>
      <input id={id} className="sr-only" type="file" accept={accept} multiple={multiple} onChange={onChange} />
    </div>
  );
}

function ToolHeader({ title, description }: { title: string; description: string }) {
  const { t, language } = useI18n();
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
    'Image Editor': 'Změňte velikost, formát, rotaci a filtry obrázku s porovnáním úspory velikosti.',
    'Markdown Preview & Export': 'Plnohodnotný živý náhled Markdownu s tabulkami, bloky kódu a exportem do HTML.',
    'To-do / Kanban': 'Jednoduchá tabule úkolů se třemi sloupci a trvalým ukládáním.',
    'Poznámky': 'Více lokálních poznámek s vyhledáváním a automatickým ukládáním.',
    'SQL Playground': 'Lokální dotazování JSON dat syntaxí SELECT ... FROM data s tabulkovým zobrazením.',
    'API Tester': 'Odesílejte HTTP požadavky s vlastními hlavičkami a kontrolujte stav i odpovědi.',
    'Git nástroje': 'Tvorba konvenčních commitů, zvýrazněný prohlížeč diffů a generátor Git příkazů.',
    'UML Diagram Editor': 'Vytvářejte UML uzly, upravujte texty, propojujte je šipkami a exportujte SVG.',
  };
  const catalogId = findToolCatalogIdByTitle(title);
  const catalogTitle = catalogId ? getToolCatalogText(catalogId, 'title', language, title) : title;
  const catalogDescription = catalogId ? getToolCatalogText(catalogId, 'desc', language, description) : description;
  const [key, fallback] = translations[title] || ['', title];
  return (
    <div className={panel}>
      <h2 className="text-lg font-semibold text-white">{catalogId ? catalogTitle : key ? t(key, fallback) : title}</h2>
      <p className="mt-1 text-sm text-slate-400">
        {catalogId ? catalogDescription : key ? t(`${key}_desc`, descriptions[title] || description) : description}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   1. PDF TOOLKIT (Merge, Rotate with customizable angle, remove files)
   ───────────────────────────────────────────────────────────── */
export const PdfToolkitTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'merge' | 'rotate'>('merge');
  const [files, setFiles] = useState<File[]>([]);
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const merge = async () => {
    if (!files.length) return;
    setBusy(true);
    setMessage('');
    try {
      const output = await PDFDocument.create();
      for (const file of files) {
        const source = await PDFDocument.load(await file.arrayBuffer());
        const pages = await output.copyPages(source, source.getPageIndices());
        pages.forEach(page => output.addPage(page));
      }
      const bytes = await output.save();
      const result = await saveBinaryWithDialog(
        'merged.pdf',
        new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }),
        'application/pdf',
        [{ name: 'PDF (*.pdf)', extensions: ['pdf'] }],
        t('save_merged_pdf', 'Uložit sloučené PDF')
      );
      setMessage(
        result.success
          ? t('pdf_merged', `Úspěšně sloučeno ${files.length} souborů PDF.`)
          : result.canceled
          ? t('save_canceled', 'Ukládání zrušeno.')
          : result.error || t('pdf_merge_failed', 'Sloučení PDF se nezdařilo.')
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('pdf_processing_failed', 'PDF se nepodařilo zpracovat.'));
    } finally {
      setBusy(false);
    }
  };

  const rotate = async () => {
    if (!files.length) return;
    setBusy(true);
    setMessage('');
    try {
      const targetFile = files[0];
      const pdf = await PDFDocument.load(await targetFile.arrayBuffer());
      pdf.getPages().forEach(page => page.setRotation(degrees(rotationAngle)));
      const bytes = await pdf.save();
      const result = await saveBinaryWithDialog(
        `${targetFile.name.replace(/\.pdf$/i, '')}-rotated-${rotationAngle}deg.pdf`,
        new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }),
        'application/pdf',
        [{ name: 'PDF (*.pdf)', extensions: ['pdf'] }],
        t('save_rotated_pdf', 'Uložit otočené PDF')
      );
      setMessage(
        result.success
          ? t('pdf_rotated', `Otočeno o ${rotationAngle}°: ${targetFile.name}.`)
          : result.canceled
          ? t('save_canceled', 'Ukládání zrušeno.')
          : result.error || t('pdf_rotate_failed', 'Otočení PDF se nezdařilo.')
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('pdf_processing_failed', 'Otočení PDF se nezdařilo.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <ToolHeader title="PDF Toolkit" description={t('pdf_toolkit_desc', 'Lokálně slučujte soubory PDF nebo otočte stránky vybraného PDF.')} />
      <div className={panel + ' space-y-4'}>
        <div className="flex flex-wrap gap-2">
          <button className={mode === 'merge' ? button : secondary} onClick={() => setMode('merge')}>
            {t('merge_selected_pdfs', 'Sloučit více PDF')}
          </button>
          <button className={mode === 'rotate' ? button : secondary} onClick={() => setMode('rotate')}>
            {t('rotate_selected_pdf_pages', 'Otočit stránky PDF')}
          </button>
        </div>

        <FilePicker
          id="pdf-toolkit-files"
          label={mode === 'merge' ? t('choose_pdf_files', 'Vybrat soubory PDF k sloučení') : t('choose_pdf_rotate', 'Vybrat soubor PDF k otočení')}
          fileName={files.length ? `${files.length} soubor(y) vybráno` : undefined}
          accept=".pdf,application/pdf"
          multiple={mode === 'merge'}
          onChange={e => {
            const chosen = Array.from(e.target.files || []);
            setFiles(mode === 'merge' ? [...files, ...chosen] : chosen.slice(0, 1));
          }}
        />

        {mode === 'rotate' && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-300 font-medium">{t('rotation_angle', 'Úhel otočení:')}</label>
            <div className="flex gap-2">
              {([90, 180, 270] as const).map(deg => (
                <button
                  key={deg}
                  type="button"
                  className={rotationAngle === deg ? button : secondary}
                  onClick={() => setRotationAngle(deg)}
                >
                  <RotateCw className="w-3.5 h-3.5 inline mr-1" />
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t('selected_files_list', 'Seznam vybraných souborů:')}</span>
              <button type="button" className="text-rose-400 hover:text-rose-300 text-xs" onClick={() => setFiles([])}>
                {t('clear_all', 'Vymazat vše')}
              </button>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-500 w-5">{i + 1}.</span>
                    <span className="truncate">{file.name}</span>
                    <span className="text-slate-500 shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button type="button" className="text-slate-500 hover:text-rose-400 p-1" onClick={() => removeFile(i)} title={t('remove', 'Odebrat')}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center gap-3">
          <button className={button} disabled={busy || !files.length} onClick={() => (mode === 'merge' ? merge() : rotate())}>
            {busy
              ? t('processing', 'Zpracování…')
              : mode === 'merge'
              ? t('merge_pdfs', `Sloučit (${files.length}) PDF souborů`)
              : t('rotate_pdf', `Otočit PDF o ${rotationAngle}°`)}
          </button>
        </div>

        {message && (
          <p
            className={`text-xs p-2 rounded-lg flex items-center gap-2 ${
              message.includes('selhalo') || message.includes('failed') || message.includes('zrušeno')
                ? 'bg-amber-950/30 text-amber-300 border border-amber-800/40'
                : 'bg-emerald-950/30 text-emerald-400 border border-emerald-800/40'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   2. OCR SCANNER (Multilingual, Image Preview, Export, Stats)
   ───────────────────────────────────────────────────────────── */
export const OcrScannerTool: React.FC = () => {
  const { t } = useI18n();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<string>('eng');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (!image) {
      setImagePreview('');
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const scan = async () => {
    if (!image) return;
    setBusy(true);
    setText('');
    setProgress(0);
    setStatusMsg(t('loading_ocr_engine', 'Inicializace OCR jádra…'));
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(selectedLang, 1, {
        logger: (data: { status?: string; progress?: number }) => {
          if (data.status) setStatusMsg(data.status);
          if (typeof data.progress === 'number') {
            setProgress(Math.round(data.progress * 100));
          }
        },
      });
      setStatusMsg(t('recognizing_text', 'Rozpoznávání textu…'));
      const result = await worker.recognize(image);
      setText(result.data.text);
      await worker.terminate();
      setStatusMsg('');
    } catch (error) {
      setText(error instanceof Error ? error.message : t('ocr_failed', 'OCR se nepodařilo dokončit.'));
    } finally {
      setBusy(false);
    }
  };

  const wordCount = useMemo(() => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [text]);

  const downloadText = async () => {
    if (!text) return;
    await saveTextWithDialog(
      'extracted-text.txt',
      text,
      [{ name: 'Text file (*.txt)', extensions: ['txt'] }],
      t('save_extracted_text', 'Uložit extrahovaný text')
    );
  };

  return (
    <div className="space-y-5">
      <ToolHeader title="OCR skener" description={t('ocr_scanner_desc', 'Extrahujte text z obrázku lokálně bez odesílání souboru na server.')} />
      <div className={panel + ' space-y-4'}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <FilePicker
              id="ocr-image-file"
              label={t('choose_image', 'Vybrat obrázek s textem')}
              fileName={image?.name}
              accept="image/*"
              onChange={e => setImage(e.target.files?.[0] || null)}
            />

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">{t('ocr_language', 'Jazyk předlohy:')}</label>
              <select className={input} value={selectedLang} onChange={e => setSelectedLang(e.target.value)}>
                <option value="eng">English (eng)</option>
                <option value="ces">Čeština (ces)</option>
                <option value="deu">Deutsch (deu)</option>
                <option value="spa">Español (spa)</option>
                <option value="fra">Français (fra)</option>
                <option value="rus">Русский (rus)</option>
              </select>
            </div>

            <button className={button + ' w-full'} disabled={!image || busy} onClick={scan}>
              {busy ? `${t('scanning_progress', 'Skenování')} ${progress}% (${statusMsg})` : t('run_ocr', 'Spustit OCR rozpoznávání')}
            </button>

            {busy && (
              <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                <div className="bg-indigo-500 h-2 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>

          <div>
            {imagePreview ? (
              <div className="border border-slate-800 rounded-lg p-2 bg-slate-950/40 text-center">
                <p className="text-[11px] text-slate-400 mb-1.5">{t('preview_image', 'Náhled obrázku:')}</p>
                <img src={imagePreview} alt={t('scanned_image', 'Skenovaný obrázek')} className="max-h-52 max-w-full mx-auto object-contain rounded" />
              </div>
            ) : (
              <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center text-slate-500 text-xs">
                {t('no_image_selected', 'Zatím nebyl vybrán žádný obrázek.')}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              {t('ocr_result', 'Výsledek rozpoznání textu:')}{' '}
              {text && <span className="text-slate-500 font-normal">({wordCount} {t('words', 'slov')}, {text.length} {t('chars', 'znaků')})</span>}
            </span>
            <div className="flex gap-2">
              <button className={secondary} disabled={!text} onClick={() => navigator.clipboard.writeText(text)}>
                <Copy className="inline w-3.5 h-3.5 mr-1" />
                {t('copy_text', 'Kopírovat')}
              </button>
              <button className={secondary} disabled={!text} onClick={downloadText}>
                <Download className="inline w-3.5 h-3.5 mr-1" />
                {t('download_txt', 'Stáhnout .txt')}
              </button>
              <button className={secondary} disabled={!text} onClick={() => setText('')}>
                <Trash2 className="inline w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <textarea
            className={input + ' min-h-48 font-mono text-xs leading-relaxed'}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={t('ocr_result_placeholder', 'Rozpoznaný text se zobrazí zde…')}
          />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   3. IMAGE EDITOR (JPEG / PNG / WebP, Rotate, Flip, Filters, Size Stats)
   ───────────────────────────────────────────────────────────── */
export const ImageEditorTool: React.FC = () => {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(800);
  const [keepAspect, setKeepAspect] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1.5);
  const [format, setFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg');
  const [quality, setQuality] = useState(85);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [preview, setPreview] = useState('');
  const [originalPreview, setOriginalPreview] = useState('');
  const [editedSize, setEditedSize] = useState<number | null>(null);

  useEffect(() => {
    if (!file) {
      setOriginalPreview('');
      setPreview('');
      setEditedSize(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setOriginalPreview(url);
    const img = new Image();
    img.onload = () => {
      setWidth(img.width);
      setHeight(img.height);
      if (img.height > 0) setAspectRatio(img.width / img.height);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleWidthChange = (w: number) => {
    setWidth(w);
    if (keepAspect && aspectRatio > 0) {
      setHeight(Math.round(w / aspectRatio));
    }
  };

  const handleHeightChange = (h: number) => {
    setHeight(h);
    if (keepAspect && aspectRatio > 0) {
      setWidth(Math.round(h * aspectRatio));
    }
  };

  const processCanvas = async (): Promise<Blob | null> => {
    if (!file) return null;
    const image = new Image();
    const sourceUrl = URL.createObjectURL(file);
    image.src = sourceUrl;
    await image.decode();

    const isRotated90or270 = rotation % 180 !== 0;
    const canvasWidth = isRotated90or270 ? height : width;
    const canvasHeight = isRotated90or270 ? width : height;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Apply brightness, contrast & grayscale filter
    const filterParts: string[] = [];
    if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
    if (grayscale) filterParts.push('grayscale(100%)');
    if (filterParts.length > 0) {
      ctx.filter = filterParts.join(' ');
    }

    // Transformations: Translate to center, rotate & flip
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    URL.revokeObjectURL(sourceUrl);

    const q = format === 'image/png' ? undefined : quality / 100;
    return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, format, q));
  };

  const processAndSave = async () => {
    if (!file) return;
    const blob = await processCanvas();
    if (!blob) return;

    setEditedSize(blob.size);
    setPreview(URL.createObjectURL(blob));

    const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/png' ? 'png' : 'webp';
    const filterName = format === 'image/jpeg' ? 'JPEG (*.jpg)' : format === 'image/png' ? 'PNG (*.png)' : 'WebP (*.webp)';
    const baseName = file.name.replace(/\.[^.]+$/, '');

    await saveBinaryWithDialog(
      `${baseName}-edited.${ext}`,
      blob,
      format,
      [{ name: filterName, extensions: [ext] }],
      t('save_edited_image', 'Uložit upravený obrázek')
    );
  };

  return (
    <div className="space-y-5">
      <ToolHeader
        title="Image Editor"
        description={t('image_editor_desc', 'Měňte velikost, formát, rotaci a filtry obrázku s porovnáním úspory velikosti.')}
      />
      <div className={panel + ' space-y-4'}>
        <FilePicker
          id="image-editor-file"
          label={t('choose_image', 'Vybrat obrázek')}
          fileName={file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : undefined}
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />

        {originalPreview && (
          <div className="text-center p-2 rounded-lg bg-slate-950 border border-slate-800">
            <img className="max-h-64 max-w-full mx-auto rounded object-contain" src={originalPreview} alt={t('selected_image_preview', 'Náhled vybraného obrázku')} />
          </div>
        )}

        {/* Resizing & Format controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <label className="text-xs text-slate-400">
            {t('width', 'Šířka (px)')}
            <input className={input + ' mt-1'} type="number" value={width} onChange={e => handleWidthChange(Number(e.target.value))} />
          </label>
          <label className="text-xs text-slate-400">
            {t('height', 'Výška (px)')}
            <input className={input + ' mt-1'} type="number" value={height} onChange={e => handleHeightChange(Number(e.target.value))} />
          </label>
          <label className="text-xs text-slate-400">
            {t('output_format', 'Cílový formát')}
            <select
              className={input + ' mt-1'}
              value={format}
              onChange={e => setFormat(e.target.value as typeof format)}
            >
              <option value="image/jpeg">JPEG (.jpg)</option>
              <option value="image/png">PNG (.png)</option>
              <option value="image/webp">WebP (.webp)</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            {t('quality', 'Kvalita')} ({format === 'image/png' ? 'Bezztrátová' : `${quality}%`})
            <input
              className={input + ' mt-1'}
              type="range"
              min="10"
              max="100"
              disabled={format === 'image/png'}
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
            />
          </label>
        </div>

        {/* Transformation toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            className={secondary}
            onClick={() => setRotation((r => (r + 90) % 360))}
            title="Otočit o 90 stupňů"
          >
            <RotateCw className="w-3.5 h-3.5 inline mr-1" />
            Otočit ({rotation}°)
          </button>
          <button
            type="button"
            className={flipH ? button : secondary}
            onClick={() => setFlipH(!flipH)}
            title="Zrcadlit horizontálně"
          >
            <FlipHorizontal className="w-3.5 h-3.5 inline mr-1" />
            Převrátit X
          </button>
          <button
            type="button"
            className={flipV ? button : secondary}
            onClick={() => setFlipV(!flipV)}
            title="Zrcadlit vertikálně"
          >
            <FlipVertical className="w-3.5 h-3.5 inline mr-1" />
            Převrátit Y
          </button>
          <button
            type="button"
            className={grayscale ? button : secondary}
            onClick={() => setGrayscale(!grayscale)}
          >
            Černobíle (Grayscale)
          </button>
          <label className="flex items-center gap-1.5 text-xs text-slate-300 ml-auto cursor-pointer">
            <input
              type="checkbox"
              id="keep-aspect"
              checked={keepAspect}
              onChange={e => setKeepAspect(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
            />
            {t('keep_aspect_ratio', 'Zachovat poměr stran')}
          </label>
        </div>

        {/* Sliders for brightness & contrast */}
        <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Jas:</span>
              <span className="font-mono">{brightness}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="160"
              value={brightness}
              onChange={e => setBrightness(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Kontrast:</span>
              <span className="font-mono">{contrast}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="160"
              value={contrast}
              onChange={e => setContrast(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button className={button} disabled={!file} onClick={processAndSave}>
            <Download className="w-3.5 h-3.5 inline mr-1" />
            {t('edit_and_save', 'Upravit a uložit')}
          </button>
          {file && editedSize !== null && (
            <div className="text-xs font-mono text-slate-300">
              Původní: {(file.size / 1024).toFixed(1)} KB → Cíl: {(editedSize / 1024).toFixed(1)} KB{' '}
              <span className={editedSize < file.size ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                ({editedSize < file.size ? `-${Math.round((1 - editedSize / file.size) * 100)}%` : `+${Math.round((editedSize / file.size - 1) * 100)}%`})
              </span>
            </div>
          )}
        </div>

        {preview && (
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <p className="text-xs text-emerald-400 font-medium">{t('saved_preview', 'Uložený náhled:')}</p>
            <img className="max-h-80 mx-auto rounded object-contain" src={preview} alt={t('edited_image_preview', 'Náhled upraveného obrázku')} />
          </div>
        )}
      </div>
    </div>
  );
};

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

  // 10. Links and Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="my-2 rounded max-h-64 max-w-full" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline hover:text-indigo-300">$1</a>');

  // 11. Bold, Italic, Strikethrough
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del class="text-slate-500">$1</del>');

  // 12. Paragraphs / Linebreaks
  html = html.replace(/\n\n/g, '<p class="my-2 leading-relaxed"></p>').replace(/\n/g, '<br />');

  return html;
}

export const MarkdownPreviewTool: React.FC = () => {
  const { t } = useI18n();
  const [markdown, setMarkdown] = useState(
    '# OmniDesk Toolkit\n\nKompletní sada lokálních vývojářských a kancelářských utilit.\n\n## Hlavní funkce\n\n- Rychlé spouštění bez závislosti na cloudu\n- Podpora offline režimu\n- Šifrování a zpracování dat v paměti\n\n### Přehled podporovaných formátů\n\n| Formát | Vstup | Výstup | Rychlost |\n| :--- | :--- | :--- | :--- |\n| PDF | Ano | Ano | Blesková |\n| JSON | Ano | Ano | Blesková |\n| SVG | Ano | Ano | Blesková |\n\n> "Jednoduchost je základem spolehlivého softwaru."\n\n```typescript\nconst message = "Vítejte v OmniDesk!";\nconsole.log(message);\n```\n\n- [x] Dokončit audit nástrojů\n- [ ] Otestovat všechny funkce v prohlížeči\n'
  );

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
        '# Název projektu\n\nKrátký popis účelu projektu.\n\n## Instalace\n\n```bash\nnpm install\nnpm run dev\n```\n\n## Licence\n\nMIT'
      );
    } else if (type === 'notes') {
      setMarkdown(
        '# Zápis ze schůzky\n\n**Datum:** ' +
          new Date().toLocaleDateString() +
          '\n**Účastníci:** Alice, Bob, Martin\n\n## Agenda\n\n1. Shrnutí stavu projektu\n2. Rozdělení úkolů na další sprint\n\n## Úkoly\n\n- [ ] Připravit podklady pro klienta\n- [ ] Zkontrolovat nasazení na server'
      );
    } else {
      setMarkdown(
        '# Srovnávací tabulka\n\n| Položka | Varianta A | Varianta B |\n| :--- | :--- | :--- |\n| Cena | 490 Kč | 790 Kč |\n| Záruka | 2 roky | 5 let |\n| Dostupnost | Skladem | Do 3 dnů |'
      );
    }
  };

  return (
    <div className="space-y-5">
      <ToolHeader title="Markdown Preview & Export" description={t('markdown_preview_desc', 'Plnohodnotný živý náhled Markdownu s tabulkami, bloky kódu a exportem do HTML.')} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button className={secondary} onClick={() => insertTemplate('readme')}>
            <FileText className="w-3.5 h-3.5 inline mr-1" /> Šablona README
          </button>
          <button className={secondary} onClick={() => insertTemplate('notes')}>
            <Clock className="w-3.5 h-3.5 inline mr-1" /> Šablona Poznámky
          </button>
          <button className={secondary} onClick={() => insertTemplate('table')}>
            <Table className="w-3.5 h-3.5 inline mr-1" /> Šablona Tabulka
          </button>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {stats.words} slov &bull; {stats.chars} znaků &bull; ~{stats.readTimeMinutes} min čtení
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

      <div className="flex gap-2">
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

/* ─────────────────────────────────────────────────────────────
   5. TO-DO / KANBAN
   ───────────────────────────────────────────────────────────── */
type BoardTask = {
  id: number;
  text: string;
  column: 'todo' | 'doing' | 'done';
  priority?: 'low' | 'med' | 'high';
};

const KANBAN_STORAGE_KEY = 'omnidesk-kanban-board-v2';

export const KanbanTool: React.FC = () => {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<BoardTask[]>(() => {
    try {
      const saved = localStorage.getItem(KANBAN_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { id: 1, text: 'Připravit čtvrtletní report', column: 'todo', priority: 'high' },
      { id: 2, text: 'Zkontrolovat zálohy souborů', column: 'doing', priority: 'med' },
      { id: 3, text: 'Aktualizovat seznam úkolů', column: 'done', priority: 'low' },
    ];
  });
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<BoardTask['priority']>('med');

  useEffect(() => {
    try {
      localStorage.setItem(KANBAN_STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks]);

  const add = () => {
    if (text.trim()) {
      setTasks([...tasks, { id: Date.now(), text: text.trim(), column: 'todo', priority }]);
      setText('');
    }
  };

  const move = (id: number, column: BoardTask['column']) => {
    setTasks(tasks.map(task => (task.id === id ? { ...task, column } : task)));
  };

  const remove = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const clearCompleted = () => {
    setTasks(tasks.filter(task => task.column !== 'done'));
  };

  return (
    <div className="space-y-5">
      <ToolHeader title="To-do / Kanban" description={t('kanban_desc', 'Jednoduchá tabule úkolů se třemi sloupci a trvalým ukládáním.')} />
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className={input + ' flex-1 min-w-[200px]'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={t('new_task_placeholder', 'Nový úkol…')}
        />
        <select
          className={input + ' w-auto'}
          value={priority}
          onChange={e => setPriority(e.target.value as BoardTask['priority'])}
        >
          <option value="low">{t('priority_low', 'Nízká priorita')}</option>
          <option value="med">{t('priority_med', 'Střední priorita')}</option>
          <option value="high">{t('priority_high', 'Vysoká priorita')}</option>
        </select>
        <button className={button} onClick={add}>
          <Plus className="inline w-4 h-4 mr-1" /> {t('add_task', 'Přidat úkol')}
        </button>
        {tasks.some(t => t.column === 'done') && (
          <button className={secondary} onClick={clearCompleted}>
            {t('clear_completed', 'Vymazat hotové')}
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {(['todo', 'doing', 'done'] as const).map(column => {
          const colTasks = tasks.filter(task => task.column === column);
          return (
            <div key={column} className={panel + ' min-h-64 flex flex-col'}>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <h3 className="font-semibold text-white text-sm">
                  {column === 'todo'
                    ? t('planned', 'Naplánováno')
                    : column === 'doing'
                    ? t('in_progress', 'Probíhá')
                    : t('done', 'Hotovo')}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2 flex-1">
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg bg-slate-800/90 border border-slate-700/60 text-sm flex flex-col gap-2 group shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`break-words ${column === 'done' ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                        {task.text}
                      </span>
                      <button
                        className="text-slate-500 hover:text-rose-400 p-0.5 opacity-60 group-hover:opacity-100"
                        onClick={() => remove(task.id)}
                        title={t('delete', 'Smazat')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/40">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          task.priority === 'high'
                            ? 'bg-rose-500/20 text-rose-300'
                            : task.priority === 'low'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {task.priority === 'high' ? 'High' : task.priority === 'low' ? 'Low' : 'Med'}
                      </span>
                      <select
                        className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded px-1.5 py-0.5 outline-none"
                        value={task.column}
                        onChange={e => move(task.id, e.target.value as BoardTask['column'])}
                      >
                        <option value="todo">{t('planned', 'Naplánováno')}</option>
                        <option value="doing">{t('in_progress', 'Probíhá')}</option>
                        <option value="done">{t('done', 'Hotovo')}</option>
                      </select>
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <p className="text-center text-xs text-slate-600 py-6">
                    {t('no_tasks_in_column', 'Žádné úkoly')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   6. NOTES WORKSPACE
   ───────────────────────────────────────────────────────────── */
type Note = { id: number; title: string; body: string; updatedAt: number };

export const NotesTool: React.FC = () => {
  const { t } = useI18n();
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem('omnidesk-notes');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 1,
        title: 'První poznámka',
        body: 'Vítejte v lokálním poznámkovém bloku. Data se automaticky ukládají do vašeho prohlížeče.',
        updatedAt: Date.now(),
      },
    ];
  });
  const [selected, setSelected] = useState<number | null>(notes[0]?.id || null);
  const [query, setQuery] = useState('');

  const current = notes.find(note => note.id === selected);

  const save = (updated: Note[]) => {
    setNotes(updated);
    try {
      localStorage.setItem('omnidesk-notes', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const update = (patch: Partial<Note>) => {
    const next = notes.map(note =>
      note.id === selected ? { ...note, ...patch, updatedAt: Date.now() } : note
    );
    save(next);
  };

  const add = () => {
    const note: Note = {
      id: Date.now(),
      title: t('new_note_title', 'Nová poznámka'),
      body: '',
      updatedAt: Date.now(),
    };
    save([note, ...notes]);
    setSelected(note.id);
  };

  const remove = (id: number) => {
    const next = notes.filter(n => n.id !== id);
    save(next);
    if (selected === id) {
      setSelected(next[0]?.id || null);
    }
  };

  const exportCurrent = async () => {
    if (!current) return;
    await saveTextWithDialog(
      `${current.title.replace(/[/\\?%*:|"<>]/g, '_') || 'note'}.txt`,
      `${current.title}\n${'='.repeat(current.title.length)}\n\n${current.body}`,
      [{ name: 'Text file (*.txt)', extensions: ['txt'] }],
      t('save_note', 'Uložit poznámku')
    );
  };

  const filtered = notes.filter(note =>
    `${note.title} ${note.body}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <ToolHeader title="Poznámky" description={t('notes_desc', 'Více lokálních poznámek s vyhledáváním a automatickým ukládáním.')} />
      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <div className={panel + ' space-y-3 flex flex-col h-[520px]'}>
          <div className="flex gap-2">
            <button className={button + ' flex-1'} onClick={add}>
              <Plus className="inline w-4 h-4 mr-1" /> {t('new_note', 'Nová')}
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              className={input + ' pl-8 text-xs'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('search_notes', 'Hledat poznámky…')}
            />
          </div>
          <div className="space-y-1 overflow-y-auto flex-1 pr-1">
            {filtered.map(note => (
              <div
                key={note.id}
                onClick={() => setSelected(note.id)}
                className={`p-2.5 rounded-lg cursor-pointer transition-colors group flex items-center justify-between ${
                  note.id === selected
                    ? 'bg-indigo-600/30 border border-indigo-500/40 text-white'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <h4 className="text-xs font-semibold truncate">{note.title || t('untitled', 'Bez názvu')}</h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {note.body.slice(0, 40) || t('empty_note', 'Prázdný text…')}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => {
                    e.stopPropagation();
                    remove(note.id);
                  }}
                  title={t('delete', 'Smazat')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">
                {t('no_matching_notes', 'Nebyly nalezeny žádné poznámky.')}
              </p>
            )}
          </div>
        </div>

        <div className={panel + ' space-y-3 flex flex-col h-[520px]'}>
          {current ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <input
                  className={input + ' font-semibold text-base'}
                  value={current.title}
                  onChange={e => update({ title: e.target.value })}
                  placeholder={t('note_title_placeholder', 'Název poznámky')}
                />
                <button className={secondary} onClick={exportCurrent} title={t('export_note', 'Exportovat poznámku')}>
                  <Download className="w-4 h-4 inline mr-1" /> {t('export', 'Export')}
                </button>
              </div>
              <textarea
                className={input + ' flex-1 font-mono text-xs leading-relaxed resize-none'}
                value={current.body}
                onChange={e => update({ body: e.target.value })}
                placeholder={t('note_body_placeholder', 'Zde můžete psát své myšlenky a zápisky…')}
              />
              <div className="text-[11px] text-slate-500 flex justify-between items-center pt-1 border-t border-slate-800">
                <span>
                  {current.body.length} {t('chars', 'znaků')} •{' '}
                  {current.body.trim() ? current.body.trim().split(/\s+/).length : 0} {t('words', 'slov')}
                </span>
                <span>{t('saved_locally', 'Uloženo lokálně')}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
              <FileText className="w-10 h-10 mb-2 opacity-40" />
              <p>{t('create_first_note', 'Vyberte nebo vytvořte novou poznámku.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   7. SQL PLAYGROUND (Presets, WHERE operators, ORDER BY, LIMIT, Table & JSON view, CSV export)
   ───────────────────────────────────────────────────────────── */
const SQL_DATASETS = {
  employees: [
    { id: 1, name: 'Alice Nováková', department: 'Vývoj', role: 'Senior Developer', city: 'Praha', salary: 85000 },
    { id: 2, name: 'Bob Černý', department: 'Design', role: 'UI/UX Designer', city: 'Brno', salary: 65000 },
    { id: 3, name: 'Cecilie Dvořáková', department: 'Vedení', role: 'Product Manager', city: 'Praha', salary: 95000 },
    { id: 4, name: 'David Kučera', department: 'Vývoj', role: 'Backend Engineer', city: 'Ostrava', salary: 78000 },
    { id: 5, name: 'Eva Horáková', department: 'Marketing', role: 'Content Specialist', city: 'Brno', salary: 52000 },
  ],
  orders: [
    { orderId: 101, customer: 'Petr Svoboda', item: 'Mechanická klávesnice', price: 2990, status: 'Doručeno' },
    { orderId: 102, customer: 'Jana Veselá', item: 'Herní monitor 27"', price: 8490, status: 'Odesláno' },
    { orderId: 103, customer: 'Karel Procházka', item: 'Bezdrátová myš', price: 1290, status: 'Zpracovává se' },
    { orderId: 104, customer: 'Lucie Benešová', item: 'USB-C Dock 100W', price: 2490, status: 'Doručeno' },
  ],
};

export const SqlPlaygroundTool: React.FC = () => {
  const { t } = useI18n();
  const [data, setData] = useState(JSON.stringify(SQL_DATASETS.employees, null, 2));
  const [query, setQuery] = useState("SELECT name, role, salary FROM data WHERE city = 'Praha' ORDER BY salary DESC");
  const [rowsResult, setRowsResult] = useState<Record<string, unknown>[]>([]);
  const [rawOutput, setRawOutput] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  const executeSql = () => {
    try {
      const rows = JSON.parse(data) as Record<string, unknown>[];
      if (!Array.isArray(rows)) throw new Error(t('data_must_be_array', 'Vstupní data musí být pole JSON objektů.'));

      // Parse SQL statement: SELECT [fields] FROM data [WHERE ...] [ORDER BY ...] [LIMIT ...]
      const regex = /select\s+(.+?)\s+from\s+data(?:\s+where\s+(.+?))?(?:\s+order\s+by\s+(.+?)(?:\s+(asc|desc))?)?(?:\s+limit\s+(\d+))?$/i;
      const match = query.trim().match(regex);
      if (!match) {
        throw new Error(
          'Podporovaná syntaxe: SELECT col1, col2 FROM data [WHERE col = val] [ORDER BY col [ASC|DESC]] [LIMIT n]'
        );
      }

      const selectClause = match[1].trim();
      const whereClause = match[2]?.trim();
      const orderByField = match[3]?.trim();
      const orderDir = (match[4] || 'asc').toLowerCase();
      const limitVal = match[5] ? parseInt(match[5], 10) : undefined;

      // 1. Filter
      let filtered = rows.filter(row => {
        if (!whereClause) return true;

        // LIKE '%term%'
        const likeMatch = whereClause.match(/(\w+)\s+like\s+['"]%?([^%]+)%?['"]/i);
        if (likeMatch) {
          const val = String(row[likeMatch[1]] || '').toLowerCase();
          return val.includes(likeMatch[2].toLowerCase());
        }

        // Comparison operators: >=, <=, !=, <>, >, <, =
        const compMatch = whereClause.match(/(\w+)\s*(>=|<=|!=|<>|>|<|=)\s*['"]?([^'"]+)['"]?/);
        if (compMatch) {
          const key = compMatch[1];
          const op = compMatch[2];
          const targetStr = compMatch[3];
          const rowVal = row[key];

          const isNum = !isNaN(Number(targetStr)) && typeof rowVal === 'number';
          const rVal = isNum ? Number(rowVal) : String(rowVal ?? '');
          const tVal = isNum ? Number(targetStr) : targetStr;

          if (op === '=' || op === '==') return rVal === tVal;
          if (op === '!=' || op === '<>') return rVal !== tVal;
          if (op === '>') return rVal > tVal;
          if (op === '<') return rVal < tVal;
          if (op === '>=') return rVal >= tVal;
          if (op === '<=') return rVal <= tVal;
        }

        return true;
      });

      // 2. Order by
      if (orderByField) {
        filtered.sort((a, b) => {
          const va = a[orderByField];
          const vb = b[orderByField];
          if (typeof va === 'number' && typeof vb === 'number') {
            return orderDir === 'desc' ? vb - va : va - vb;
          }
          const sa = String(va ?? '');
          const sb = String(vb ?? '');
          return orderDir === 'desc' ? sb.localeCompare(sa) : sa.localeCompare(sb);
        });
      }

      // 3. Limit
      if (typeof limitVal === 'number') {
        filtered = filtered.slice(0, limitVal);
      }

      // 4. Projection
      const fields = selectClause === '*' ? null : selectClause.split(',').map(f => f.trim());
      const projected = fields
        ? filtered.map(row => Object.fromEntries(fields.filter(f => f in row).map(f => [f, row[f]])))
        : filtered;

      setRowsResult(projected);
      setRawOutput(JSON.stringify(projected, null, 2));
    } catch (e) {
      setRowsResult([]);
      setRawOutput(e instanceof Error ? e.message : 'Chyba při vykonávání dotazu.');
    }
  };

  useEffect(() => {
    executeSql();
  }, []);

  const exportCsv = () => {
    if (!rowsResult.length) return;
    const headers = Object.keys(rowsResult[0]);
    const csvLines = [headers.join(';')];
    rowsResult.forEach(row => {
      csvLines.push(headers.map(h => JSON.stringify(row[h] ?? '')).join(';'));
    });
    void saveTextWithDialog('vysledek-dotazu.csv', csvLines.join('\n'), [{ name: 'CSV (*.csv)', extensions: ['csv'] }], 'Uložit CSV');
  };

  return (
    <div className="space-y-5">
      <ToolHeader title="SQL Playground" description={t('sql_playground_desc', 'Lokální dotazování JSON dat syntaxí SELECT ... FROM data s tabulkovým zobrazením.')} />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-300 font-medium block">
              {t('json_data_source', 'Vstupní JSON tabulka (data):')}
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400"
                onClick={() => {
                  setData(JSON.stringify(SQL_DATASETS.employees, null, 2));
                  setQuery("SELECT name, role, salary FROM data WHERE salary > 60000 ORDER BY salary DESC");
                }}
              >
                Zaměstnanci
              </button>
              <button
                type="button"
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-indigo-400"
                onClick={() => {
                  setData(JSON.stringify(SQL_DATASETS.orders, null, 2));
                  setQuery("SELECT orderId, customer, price, status FROM data WHERE price > 2000");
                }}
              >
                Objednávky
              </button>
            </div>
          </div>
          <textarea className={input + ' min-h-72 font-mono text-xs'} value={data} onChange={e => setData(e.target.value)} />
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">
              {t('sql_query', 'SQL dotaz:')}
            </label>
            <div className="flex gap-2">
              <input className={input + ' font-mono text-xs'} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && executeSql()} />
              <button className={button} onClick={executeSql}>
                <Play className="inline w-3.5 h-3.5 mr-1" /> {t('run_query', 'Spustit')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded text-xs font-medium ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  onClick={() => setViewMode('table')}
                >
                  <Table className="w-3.5 h-3.5 inline mr-1" />
                  Tabulka ({rowsResult.length})
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded text-xs font-medium ${viewMode === 'json' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  onClick={() => setViewMode('json')}
                >
                  <Code className="w-3.5 h-3.5 inline mr-1" />
                  JSON
                </button>
              </div>

              {rowsResult.length > 0 && (
                <div className="flex gap-2">
                  <button className={secondary} onClick={() => navigator.clipboard.writeText(rawOutput)}>
                    <Copy className="inline w-3.5 h-3.5 mr-1" />
                    Kopírovat
                  </button>
                  <button className={secondary} onClick={exportCsv}>
                    <Download className="inline w-3.5 h-3.5 mr-1" />
                    CSV
                  </button>
                </div>
              )}
            </div>

            {viewMode === 'table' ? (
              <div className={panel + ' min-h-56 max-h-80 overflow-auto p-0'}>
                {rowsResult.length > 0 ? (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 sticky top-0">
                        {Object.keys(rowsResult[0]).map(key => (
                          <th key={key} className="p-2.5 text-left font-semibold text-slate-300">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rowsResult.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                          {Object.values(row).map((val, cidx) => (
                            <td key={cidx} className="p-2.5 text-slate-300 font-mono">
                              {String(val ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-4 text-xs text-slate-500 font-mono">{rawOutput || 'Žádné výsledky'}</p>
                )}
              </div>
            ) : (
              <pre className={panel + ' min-h-56 max-h-80 overflow-auto font-mono text-xs text-slate-200'}>
                {rawOutput}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   8. API TESTER
   ───────────────────────────────────────────────────────────── */
export const ApiTesterTool: React.FC = () => {
  const { t } = useI18n();
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [headersList, setHeadersList] = useState<{ key: string; value: string }[]>([
    { key: 'Content-Type', value: 'application/json' },
  ]);
  const [body, setBody] = useState('');
  const [resultBody, setResultBody] = useState('');
  const [resultHeaders, setResultHeaders] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('');
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const addHeader = () => {
    setHeadersList([...headersList, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setHeadersList(headersList.filter((_, i) => i !== index));
  };

  const send = async () => {
    setBusy(true);
    setStatus(null);
    setStatusText('');
    setResultBody('');
    setResultHeaders({});
    setDurationMs(null);
    setErrorMsg('');

    const headersRecord: Record<string, string> = {};
    headersList.forEach(h => {
      if (h.key.trim()) headersRecord[h.key.trim()] = h.value;
    });

    const startTime = performance.now();
    try {
      const response = await fetch(url, {
        method,
        headers: headersRecord,
        body: method === 'GET' ? undefined : body || undefined,
      });
      const elapsed = Math.round(performance.now() - startTime);
      setDurationMs(elapsed);
      setStatus(response.status);
      setStatusText(response.statusText);

      const respHeaders: Record<string, string> = {};
      response.headers.forEach((val, k) => {
        respHeaders[k] = val;
      });
      setResultHeaders(respHeaders);

      const raw = await response.text();
      try {
        setResultBody(JSON.stringify(JSON.parse(raw), null, 2));
      } catch {
        setResultBody(raw);
      }
    } catch (error) {
      const elapsed = Math.round(performance.now() - startTime);
      setDurationMs(elapsed);
      setErrorMsg(
        error instanceof Error
          ? `${error.message}. (Poznámka: Pokud server nepovoluje CORS hlavičky, prohlížeč přímý požadavek zablokuje.)`
          : t('request_failed', 'Požadavek selhal.')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <ToolHeader title="API Tester" description={t('api_tester_desc', 'Odesílejte HTTP požadavky s vlastními hlavičkami a kontrolujte stav i odpovědi.')} />
      <div className={panel + ' space-y-4'}>
        <div className="flex flex-wrap gap-2">
          <select
            className={input + ' w-28 shrink-0 font-semibold'}
            value={method}
            onChange={e => setMethod(e.target.value as typeof method)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            className={input + ' flex-1 min-w-[240px] font-mono text-xs'}
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
          />
          <button className={button} disabled={busy || !url.trim()} onClick={send}>
            <Send className="inline w-3.5 h-3.5 mr-1" />
            {busy ? t('sending', 'Odesílání…') : t('send', 'Odeslat')}
          </button>
        </div>

        {/* Headers configurator */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">{t('request_headers', 'Hlavičky požadavku (Headers):')}</span>
            <button className="text-xs text-indigo-400 hover:text-indigo-300" onClick={addHeader}>
              <Plus className="inline w-3 h-3 mr-1" />
              {t('add_header', 'Přidat hlavičku')}
            </button>
          </div>
          {headersList.map((h, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className={input + ' font-mono text-xs'}
                placeholder="Key (např. Authorization)"
                value={h.key}
                onChange={e => {
                  const next = [...headersList];
                  next[i].key = e.target.value;
                  setHeadersList(next);
                }}
              />
              <input
                className={input + ' font-mono text-xs'}
                placeholder="Value (např. Bearer token)"
                value={h.value}
                onChange={e => {
                  const next = [...headersList];
                  next[i].value = e.target.value;
                  setHeadersList(next);
                }}
              />
              <button className="text-slate-500 hover:text-rose-400 p-1" onClick={() => removeHeader(i)} title={t('remove', 'Odebrat')}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {method !== 'GET' && (
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-medium block">
              {t('json_request_body', 'Tělo požadavku (Request Body):')}
            </label>
            <textarea
              className={input + ' min-h-28 font-mono text-xs'}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder='{\n  "title": "foo",\n  "completed": false\n}'
            />
          </div>
        )}

        {/* Response section */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    activeTab === 'body' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('body')}
                >
                  {t('response_body', 'Odpověď (Body)')}
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    activeTab === 'headers' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  onClick={() => setActiveTab('headers')}
                >
                  {t('response_headers', 'Hlavičky')} ({Object.keys(resultHeaders).length})
                </button>
              </div>

              {status !== null && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded font-mono font-semibold ${
                    status >= 200 && status < 300
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : status >= 400
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {status} {statusText}
                </span>
              )}

              {durationMs !== null && (
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {durationMs} ms
                </span>
              )}
            </div>

            {resultBody && (
              <button className={secondary} onClick={() => navigator.clipboard.writeText(resultBody)}>
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                {t('copy_response', 'Kopírovat')}
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'body' ? (
            <pre className={panel + ' min-h-48 max-h-96 overflow-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed'}>
              {resultBody || t('no_response_yet', 'Zatím nebyla přijata žádná odpověď.')}
            </pre>
          ) : (
            <div className={panel + ' min-h-48 max-h-96 overflow-auto font-mono text-xs space-y-1'}>
              {Object.entries(resultHeaders).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-slate-300 border-b border-slate-800/40 py-0.5">
                  <span className="text-indigo-400 font-medium shrink-0">{k}:</span>
                  <span className="break-all">{v}</span>
                </div>
              ))}
              {Object.keys(resultHeaders).length === 0 && (
                <p className="text-slate-500">{t('no_headers_received', 'Žádné hlavičky k zobrazení.')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
    if (breaking) parts.push('BREAKING CHANGE: Vyžaduje aktualizaci závislostí.');
    return parts.join('\n\n');
  }, [commitType, scope, description, body, breaking]);

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
    { title: 'Vytvořit a přepnout novou větev', cmd: 'git checkout -b feature/muj-novy-nastroj' },
    { title: 'Stashnout neuložené změny', cmd: 'git stash save "wip" && git stash pop' },
    { title: 'Vrátit poslední lokální commit (ponechat změny)', cmd: 'git reset --soft HEAD~1' },
    { title: 'Přepsat poslední commit message', cmd: 'git commit --amend -m "nová zpráva"' },
    { title: 'Vyčistit necommitnuté soubory', cmd: 'git clean -fd' },
    { title: 'Zobrazit zkrácenou historii ve stromu', cmd: 'git log --oneline --graph --decorate --all' },
  ];

  return (
    <div className="space-y-5">
      <ToolHeader
        title="Git nástroje"
        description={t('git_tools_desc', 'Tvorba konvenčních commitů, zvýrazněný prohlížeč diffů a generátor Git příkazů.')}
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
            Conventional Commits Builder
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'diff' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('diff')}
          >
            <GitPullRequest className="w-3.5 h-3.5 inline mr-1" />
            Diff & Log Zvýrazňovač
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'cheatsheet' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('cheatsheet')}
          >
            <GitBranch className="w-3.5 h-3.5 inline mr-1" />
            Git Tahák
          </button>
        </div>

        {activeTab === 'commit' && (
          <div className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <label className="text-xs text-slate-400">
                Typ commitu:
                <select className={input + ' mt-1'} value={commitType} onChange={e => setCommitType(e.target.value)}>
                  <option value="feat">feat (nová funkce)</option>
                  <option value="fix">fix (oprava chyby)</option>
                  <option value="docs">docs (dokumentace)</option>
                  <option value="style">style (formátování kódu)</option>
                  <option value="refactor">refactor (úprava bez změny funkce)</option>
                  <option value="perf">perf (zrychlení výkonu)</option>
                  <option value="test">test (testy)</option>
                  <option value="chore">chore (build, závislosti)</option>
                </select>
              </label>
              <label className="text-xs text-slate-400">
                Scope (volitelný modul):
                <input className={input + ' mt-1'} value={scope} onChange={e => setScope(e.target.value)} placeholder="např. auth, ui, core" />
              </label>
              <label className="flex items-center gap-2 text-xs text-rose-300 pt-6 cursor-pointer">
                <input type="checkbox" checked={breaking} onChange={e => setBreaking(e.target.checked)} className="rounded text-rose-600 bg-slate-950" />
                Breaking Change (!)
              </label>
            </div>

            <label className="text-xs text-slate-400 block">
              Stručný popis (subject):
              <input className={input + ' mt-1'} value={description} onChange={e => setDescription(e.target.value)} />
            </label>

            <label className="text-xs text-slate-400 block">
              Doplňující zpráva (body):
              <textarea className={input + ' mt-1 min-h-20 font-mono text-xs'} value={body} onChange={e => setBody(e.target.value)} placeholder="Podrobnější důvod této změny…" />
            </label>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Výsledná commit zpráva:</span>
                <div className="flex gap-2">
                  <button className={secondary} onClick={() => navigator.clipboard.writeText(fullCommitMessage)}>
                    <Copy className="w-3.5 h-3.5 inline mr-1" />
                    Zkopírovat zprávu
                  </button>
                  <button className={button} onClick={() => navigator.clipboard.writeText(`git commit -m ${JSON.stringify(fullCommitMessage)}`)}>
                    <Copy className="w-3.5 h-3.5 inline mr-1" />
                    Kopírovat git příkaz
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
              placeholder="Vložte sem výstup z git diff nebo git log -p…"
            />
            <div className="flex gap-2">
              <input className={input + ' text-xs'} value={diffFilter} onChange={e => setDiffFilter(e.target.value)} placeholder="Filtrovat řádky diffu…" />
              <button className={secondary} onClick={() => navigator.clipboard.writeText(diffText)}>
                <Copy className="w-3.5 h-3.5 inline mr-1" />
                Kopírovat
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
                    <Copy className="w-3 h-3 inline mr-1" /> Kopírovat příkaz
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

/* ─────────────────────────────────────────────────────────────
   10. UML DIAGRAM EDITOR
   ───────────────────────────────────────────────────────────── */
type UmlNode = { id: number; x: number; y: number; text: string; type: 'class' | 'interface' | 'actor' | 'usecase' };
type UmlEdge = { id: number; from: number; to: number; label: string; dashed: boolean };

export const DiagramEditorTool: React.FC = () => {
  const { t } = useI18n();
  const [nodes, setNodes] = useState<UmlNode[]>([
    { id: 1, x: 80, y: 70, text: 'User', type: 'actor' },
    { id: 2, x: 280, y: 160, text: 'OrderService', type: 'class' },
    { id: 3, x: 500, y: 160, text: 'IPayment', type: 'interface' },
  ]);
  const [edges, setEdges] = useState<UmlEdge[]>([
    { id: 1, from: 1, to: 2, label: 'places order', dashed: false },
    { id: 2, from: 2, to: 3, label: 'implements', dashed: true },
  ]);
  const [selected, setSelected] = useState<number>(2);
  const [edgeFrom, setEdgeFrom] = useState<number>(1);
  const [edgeTo, setEdgeTo] = useState<number>(2);
  const [edgeLabel, setEdgeLabel] = useState('');
  const [edgeDashed, setEdgeDashed] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Dragging state
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const selectedNode = nodes.find(node => node.id === selected);

  const add = (type: UmlNode['type']) => {
    const id = Date.now();
    const x = 50 + (nodes.length % 4) * 140;
    const y = 80 + Math.floor(nodes.length / 4) * 80;
    setNodes([...nodes, { id, x, y, text: type === 'class' ? 'NewClass' : type === 'interface' ? 'INewInterface' : 'NewNode', type }]);
    setSelected(id);
  };

  const addEdge = () => {
    if (edgeFrom === edgeTo) return;
    setEdges([...edges, { id: Date.now(), from: edgeFrom, to: edgeTo, label: edgeLabel, dashed: edgeDashed }]);
    setEdgeLabel('');
  };

  const deleteEdge = (id: number) => {
    setEdges(edges.filter(e => e.id !== id));
  };

  const exportSvg = async () => {
    if (!svgRef.current) return;
    const source = new XMLSerializer().serializeToString(svgRef.current);
    await saveTextWithDialog('uml-diagram.svg', source, [{ name: 'SVG (*.svg)', extensions: ['svg'] }], t('save_diagram', 'Uložit diagram'));
  };

  const handlePointerDown = (nodeId: number, e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    setSelected(nodeId);
    setDraggingId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 700 / rect.width;
    const scaleY = 450 / rect.height;
    const mouseSvgX = (e.clientX - rect.left) * scaleX;
    const mouseSvgY = (e.clientY - rect.top) * scaleY;
    setDragOffset({ x: mouseSvgX - node.x, y: mouseSvgY - node.y });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingId === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 700 / rect.width;
    const scaleY = 450 / rect.height;
    const mouseSvgX = (e.clientX - rect.left) * scaleX;
    const mouseSvgY = (e.clientY - rect.top) * scaleY;
    const newX = Math.max(0, Math.min(560, Math.round(mouseSvgX - dragOffset.x)));
    const newY = Math.max(0, Math.min(390, Math.round(mouseSvgY - dragOffset.y)));
    setNodes(prev => prev.map(n => (n.id === draggingId ? { ...n, x: newX, y: newY } : n)));
  };

  const handlePointerUp = () => {
    setDraggingId(null);
  };

  return (
    <div className="space-y-5 select-none">
      <ToolHeader
        title="UML Diagram Editor"
        description={t(
          'diagram_editor_desc',
          'Vytvářejte přetahovatelné UML uzly tříd, rozhraní a aktérů, propojujte je šipkami a exportujte čistý vektorový SVG soubor.'
        )}
      />

      <div className="flex flex-wrap gap-2 items-center">
        {(['class', 'interface', 'actor', 'usecase'] as UmlNode['type'][]).map(type => (
          <button key={type} className={button} onClick={() => add(type)}>
            <Plus className="inline w-3.5 h-3.5 mr-1" />
            {t(`add_${type}`, `+ ${type}`)}
          </button>
        ))}
        <button className={secondary} onClick={exportSvg}>
          <Download className="inline w-3.5 h-3.5 mr-1" /> {t('export_svg', 'Exportovat SVG')}
        </button>
        <button
          className={danger}
          disabled={!selectedNode}
          onClick={() => {
            setNodes(nodes.filter(node => node.id !== selected));
            setEdges(edges.filter(edge => edge.from !== selected && edge.to !== selected));
          }}
        >
          <Trash2 className="inline w-3.5 h-3.5 mr-1" /> {t('delete_selected_node', 'Smazat vybraný uzel')}
        </button>
      </div>

      {selectedNode && (
        <div className={panel + ' grid md:grid-cols-3 gap-3'}>
          <label className="text-xs text-slate-400">
            {t('selected_label', 'Text vybraného uzlu')}
            <input
              className={input + ' mt-1'}
              value={selectedNode.text}
              onChange={event =>
                setNodes(nodes.map(node => (node.id === selected ? { ...node, text: event.target.value } : node)))
              }
            />
          </label>
          <label className="text-xs text-slate-400">
            {t('node_type', 'Typ elementu')}
            <select
              className={input + ' mt-1'}
              value={selectedNode.type}
              onChange={event =>
                setNodes(nodes.map(node => (node.id === selected ? { ...node, type: event.target.value as UmlNode['type'] } : node)))
              }
            >
              <option value="class">{t('class', 'Třída (Class)')}</option>
              <option value="interface">{t('interface', 'Rozhraní (Interface)')}</option>
              <option value="actor">{t('actor', 'Aktér (Actor)')}</option>
              <option value="usecase">{t('usecase', 'Případ užití (Use case)')}</option>
            </select>
          </label>
          <div className="text-xs text-slate-400 flex flex-col justify-end">
            <span className="text-indigo-400">
              💡 {t('drag_hint', 'Uzly můžete myší přetahovat po celé ploše diagramu!')}
            </span>
          </div>
        </div>
      )}

      {/* Edge creation and management */}
      <div className={panel + ' space-y-3'}>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs text-slate-400">
            {t('from_node', 'Z uzlu')}
            <select className={input + ' mt-1 w-36'} value={edgeFrom} onChange={e => setEdgeFrom(Number(e.target.value))}>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.text}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            {t('to_node', 'Do uzlu')}
            <select className={input + ' mt-1 w-36'} value={edgeTo} onChange={e => setEdgeTo(Number(e.target.value))}>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.text}
                </option>
              ))}
            </select>
          </label>
          <input
            className={input + ' max-w-44'}
            value={edgeLabel}
            onChange={e => setEdgeLabel(e.target.value)}
            placeholder={t('arrow_label', 'Popis vztahu…')}
          />
          <label className="flex items-center gap-1.5 text-xs text-slate-300 pb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={edgeDashed}
              onChange={e => setEdgeDashed(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-indigo-600"
            />
            {t('dashed_arrow', 'Čárkovaná šipka')}
          </label>
          <button className={button} onClick={addEdge}>
            {t('connect_arrow', 'Propojit šipkou')}
          </button>
        </div>

        {edges.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">{t('edges', 'Vztahy:')}</span>
            {edges.map(edge => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              return (
                <span
                  key={edge.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 text-[11px] text-slate-300"
                >
                  {fromNode?.text || edge.from} → {toNode?.text || edge.to} {edge.label && `("${edge.label}")`}
                  <button
                    className="text-slate-500 hover:text-rose-400 ml-1"
                    onClick={() => deleteEdge(edge.id)}
                    title={t('delete', 'Smazat')}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 700 450"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full min-h-[420px] rounded-xl bg-slate-950 border border-slate-800 cursor-default shadow-inner"
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#818cf8" />
          </marker>
        </defs>

        {/* Render edges */}
        {edges.map(edge => {
          const from = nodes.find(node => node.id === edge.from);
          const to = nodes.find(node => node.id === edge.to);
          if (!from || !to) return null;
          const x1 = from.x + 70;
          const y1 = from.y + 30;
          const x2 = to.x + 70;
          const y2 = to.y + 30;
          return (
            <g key={edge.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#818cf8"
                strokeWidth="2"
                strokeDasharray={edge.dashed ? '6 4' : undefined}
                markerEnd="url(#arrow)"
              />
              {edge.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 6}
                  fill="#cbd5e1"
                  fontSize="11"
                  textAnchor="middle"
                  className="bg-slate-950 font-sans"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Render nodes */}
        {nodes.map(node => {
          const isSel = node.id === selected;
          return (
            <g
              key={node.id}
              onPointerDown={e => handlePointerDown(node.id, e)}
              className="cursor-move"
            >
              <rect
                x={node.x}
                y={node.y}
                width="140"
                height="60"
                rx={node.type === 'actor' ? 30 : node.type === 'usecase' ? 24 : 6}
                fill={isSel ? '#3730a3' : '#1e293b'}
                stroke={isSel ? '#a5b4fc' : '#475569'}
                strokeWidth={isSel ? 2 : 1}
              />
              <text
                x={node.x + 70}
                y={node.y + 33}
                textAnchor="middle"
                fill="white"
                fontSize="13"
                fontWeight="bold"
              >
                {node.text}
              </text>
              <text
                x={node.x + 70}
                y={node.y + 48}
                textAnchor="middle"
                fill={isSel ? '#c7d2fe' : '#94a3b8'}
                fontSize="9"
              >
                &lt;&lt;{node.type}&gt;&gt;
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
