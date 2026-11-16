import React, { useEffect, useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { AlertCircle, FileUp, RotateCw, Trash2 } from 'lucide-react';
import { saveBinaryWithDialog } from '../../services/fileSystemService';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { useI18n } from '../../i18n/context';
import { getToolCatalogText } from '../../i18n/toolCatalog';

const button =
  'px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const secondary =
  'px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const panel = 'p-4 rounded-xl bg-slate-900/50 border border-slate-800';

export const PdfToolkitTool: React.FC = () => {
  const { t, language } = useI18n();
  const [mode, setMode] = useState<'merge' | 'rotate'>('merge');
  const [files, setFiles] = useState<File[]>([]);
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const piped = consumePendingToolPipe('pdf-toolkit');
    if (piped?.kind === 'file' && piped.file) {
      setFiles([piped.file]);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const merge = async () => {
    if (!files.length) return;
    setBusy(true);
    setMessage('');
    setIsError(false);
    try {
      const output = await PDFDocument.create();
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        if (buffer.byteLength === 0) continue;
        const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pages = await output.copyPages(source, source.getPageIndices());
        pages.forEach(page => output.addPage(page));
      }
      const bytes = await output.save();
      const result = await saveBinaryWithDialog(
        'merged.pdf',
        new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }),
        'application/pdf',
        [{ name: 'PDF (*.pdf)', extensions: ['pdf'] }],
        t('save_merged_pdf', 'Save Merged PDF')
      );
      setIsError(!result.success);
      setMessage(
        result.success
          ? t('pdf_merged', 'Successfully merged {count} PDF files.', { count: files.length })
          : result.canceled
          ? t('save_canceled', 'Saving canceled.')
          : result.error || t('pdf_merge_failed', 'PDF merge failed.')
      );
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : t('pdf_processing_failed', 'Failed to process PDF.'));
    } finally {
      setBusy(false);
    }
  };

  const rotate = async () => {
    if (!files.length) return;
    setBusy(true);
    setMessage('');
    setIsError(false);
    try {
      const targetFile = files[0];
      const buffer = await targetFile.arrayBuffer();
      if (buffer.byteLength === 0) {
        throw new Error(t('err_empty_pdf', 'Selected PDF file is empty.'));
      }
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pdf.getPages().forEach(page => page.setRotation(degrees(rotationAngle)));
      const bytes = await pdf.save();
      const result = await saveBinaryWithDialog(
        `${targetFile.name.replace(/\.pdf$/i, '')}-rotated-${rotationAngle}deg.pdf`,
        new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }),
        'application/pdf',
        [{ name: 'PDF (*.pdf)', extensions: ['pdf'] }],
        t('save_rotated_pdf', 'Save Rotated PDF')
      );
      setIsError(!result.success);
      setMessage(
        result.success
          ? t('pdf_rotated', 'Rotated by {angle}°: {name}.', { angle: rotationAngle, name: targetFile.name })
          : result.canceled
          ? t('save_canceled', 'Saving canceled.')
          : result.error || t('pdf_rotate_failed', 'PDF rotation failed.')
      );
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : t('pdf_processing_failed', 'Failed to rotate PDF.'));
    } finally {
      setBusy(false);
    }
  };

  const label = mode === 'merge' ? t('choose_pdf_files', 'Select PDF files to merge') : t('choose_pdf_rotate', 'Select PDF file to rotate');
  const fileNameLabel = files.length ? t('files_selected_count', `${files.length} file(s) selected`, { count: files.length }) : undefined;

  return (
    <div className="space-y-5">
      <div className={panel}>
        <h2 className="text-lg font-semibold text-white">
          {getToolCatalogText('pdf-toolkit', 'title', language, t('pdf_toolkit_title', 'PDF Toolkit'))}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {getToolCatalogText('pdf-toolkit', 'desc', language, t('pdf_toolkit_desc', 'Merge selected PDF files or rotate pages of a PDF locally.'))}
        </p>
      </div>

      <div className={panel + ' space-y-4'}>
        <div className="flex flex-wrap gap-2">
          <button className={mode === 'merge' ? button : secondary} onClick={() => setMode('merge')}>
            {t('merge_selected_pdfs', 'Merge Multiple PDFs')}
          </button>
          <button className={mode === 'rotate' ? button : secondary} onClick={() => setMode('rotate')}>
            {t('rotate_selected_pdf_pages', 'Rotate PDF Pages')}
          </button>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-300">{label}</span>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="pdf-toolkit-files" className={button + ' inline-flex items-center gap-2 cursor-pointer'}>
              <FileUp className="w-4 h-4" />
              {label}
            </label>
            {fileNameLabel && <span className="text-xs text-slate-400 truncate max-w-full">{fileNameLabel}</span>}
          </div>
          <input
            id="pdf-toolkit-files"
            className="sr-only"
            type="file"
            accept=".pdf,application/pdf"
            multiple={mode === 'merge'}
            onChange={e => {
              const chosen = Array.from(e.target.files || []);
              setFiles(mode === 'merge' ? [...files, ...chosen] : chosen.slice(0, 1));
            }}
          />
        </div>

        {mode === 'rotate' && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-300 font-medium">{t('rotation_angle', 'Rotation angle:')}</label>
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
              <span>{t('selected_files_list', 'Selected files:')}</span>
              <button type="button" className="text-rose-400 hover:text-rose-300 text-xs" onClick={() => setFiles([])}>
                {t('clear_all', 'Clear all')}
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
                  <button
                    type="button"
                    className="text-slate-500 hover:text-rose-400 p-1"
                    onClick={() => removeFile(i)}
                    title={t('remove', 'Remove')}
                    aria-label={t('remove', 'Remove')}
                  >
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
              ? t('processing', 'Processing…')
              : mode === 'merge'
              ? t('merge_pdfs', 'Merge ({count}) PDF files', { count: files.length })
              : t('rotate_pdf', 'Rotate PDF by {angle}°', { angle: rotationAngle })}
          </button>
        </div>

        {message && (
          <p
            className={`text-xs p-2 rounded-lg flex items-center gap-2 ${
              isError
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
