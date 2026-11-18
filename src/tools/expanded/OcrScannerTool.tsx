import React, { useEffect, useMemo, useState } from 'react';
import { Download, Trash2, Copy } from 'lucide-react';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { button, secondary, input, panel, FilePicker, ToolHeader } from './shared';

/* ─────────────────────────────────────────────────────────────
   1. OCR SCANNER (Multilingual, Image Preview, Export, Stats)
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
    const piped = consumePendingToolPipe('ocr-scanner');
    if (piped?.kind === 'file' && piped.file) {
      setImage(piped.file);
    }
  }, []);

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
    setStatusMsg(t('loading_ocr_engine', 'Initializing OCR engine…'));
    let worker: Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>> | null = null;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker(selectedLang, 1, {
        logger: (data: { status?: string; progress?: number }) => {
          if (data.status) setStatusMsg(data.status);
          if (typeof data.progress === 'number') {
            setProgress(Math.round(data.progress * 100));
          }
        },
      });
      setStatusMsg(t('recognizing_text', 'Recognizing text…'));
      const result = await worker.recognize(image);
      setText(result.data.text);
      setStatusMsg('');
    } catch (error) {
      setText(error instanceof Error ? error.message : t('ocr_failed', 'OCR failed to complete.'));
    } finally {
      await worker?.terminate().catch(() => {});
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
      t('save_extracted_text', 'Save extracted text')
    );
  };

  return (
    <div className="space-y-5">
      <ToolHeader title="OCR Scanner" description={t('ocr_scanner_desc', 'Extract text from an image locally without uploading the file to a server.')} />
      <div className={panel + ' space-y-4'}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <FilePicker
              id="ocr-image-file"
              label={t('choose_image', 'Choose image')}
              fileName={image?.name}
              accept="image/*"
              onChange={e => setImage(e.target.files?.[0] || null)}
            />

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">{t('ocr_language', 'Source language:')}</label>
              <select className={input} value={selectedLang} onChange={e => setSelectedLang(e.target.value)}>
                <option value="eng">{t('lang_english', 'English (eng)')}</option>
                <option value="ces">{t('lang_czech', 'Czech (ces)')}</option>
                <option value="deu">{t('lang_german', 'German (deu)')}</option>
                <option value="spa">{t('lang_spanish', 'Spanish (spa)')}</option>
                <option value="fra">{t('lang_french', 'French (fra)')}</option>
                <option value="rus">{t('lang_russian', 'Russian (rus)')}</option>
              </select>
            </div>

            <button className={button + ' w-full'} disabled={!image || busy} onClick={scan}>
              {busy ? `${t('scanning_progress', 'Scanning {progress}%…', { progress })} (${statusMsg})` : t('run_ocr', 'Run OCR')}
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
                <p className="text-[11px] text-slate-400 mb-1.5">{t('preview_image', 'Image preview:')}</p>
                <img src={imagePreview} alt={t('scanned_image', 'Scanned image')} className="max-h-52 max-w-full mx-auto object-contain rounded" />
              </div>
            ) : (
              <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center text-slate-500 text-xs">
                {t('no_image_selected', 'No image selected yet.')}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              {t('ocr_result', 'Text recognition result:')}{' '}
              {text && <span className="text-slate-500 font-normal">({wordCount} {t('words', 'words')}, {text.length} {t('chars', 'chars')})</span>}
            </span>
            <div className="flex flex-wrap gap-2">
              <SendToToolButton
                sourceToolId="ocr-scanner"
                kind="text"
                getText={() => text}
                disabled={!text.trim()}
              />
              <button className={secondary} disabled={!text} onClick={() => navigator.clipboard.writeText(text)}>
                <Copy className="inline w-3.5 h-3.5 mr-1" />
                {t('copy_text', 'Copy text')}
              </button>
              <button className={secondary} disabled={!text} onClick={downloadText}>
                <Download className="inline w-3.5 h-3.5 mr-1" />
                {t('download_txt', 'Download .txt')}
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
            placeholder={t('ocr_result_placeholder', 'The OCR result will appear here…')}
          />
        </div>
      </div>
    </div>
  );
};
