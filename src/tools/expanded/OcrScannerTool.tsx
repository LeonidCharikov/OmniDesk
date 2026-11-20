import React, { useEffect, useMemo, useState } from 'react';
import { Download, Trash2, Copy, ClipboardPaste, Sparkles } from 'lucide-react';
import { saveTextWithDialog } from '../../services/fileSystemService';
import { useI18n } from '../../i18n/context';
import { consumePendingToolPipe } from '../../services/toolPipeService';
import { SendToToolButton } from '../../components/ui/SendToToolButton';
import { button, secondary, input, panel, FilePicker, ToolHeader } from './shared';

/* ─────────────────────────────────────────────────────────────
   OCR SCANNER (Clipboard Paste, Drag-and-Drop, Multi-Language,
   High-Contrast Grayscale Preprocessing, Confidence Score)
   ───────────────────────────────────────────────────────────── */
async function preprocessImageForOcr(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = bitmap.width < 1200 ? Math.min(2, 1400 / Math.max(1, bitmap.width)) : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  const contrast = 1.35;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const boosted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
    d[i] = boosted;
    d[i + 1] = boosted;
    d[i + 2] = boosted;
  }
  ctx.putImageData(imgData, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode preprocessed image.'));
    }, 'image/png');
  });
}

export const OcrScannerTool: React.FC = () => {
  const { t } = useI18n();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<string>('eng');
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [text, setText] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const piped = consumePendingToolPipe('ocr-scanner');
    if (piped?.kind === 'file' && piped.file) {
      setImage(piped.file);
    }
  }, []);

  // Support Ctrl+V pasting screenshots directly into OCR scanner
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setImage(file);
            setConfidence(null);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith('image/')) {
      setImage(dropped);
      setConfidence(null);
    }
  };

  const scan = async () => {
    if (!image) return;
    setBusy(true);
    setText('');
    setConfidence(null);
    setProgress(0);
    setStatusMsg(t('loading_ocr_engine', 'Initializing OCR engine…'));
    let worker: Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>> | null = null;
    try {
      const inputSource = enhanceContrast ? await preprocessImageForOcr(image) : image;
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
      const result = await worker.recognize(inputSource);
      setText(result.data.text);
      if (typeof result.data.confidence === 'number') {
        setConfidence(Math.round(result.data.confidence));
      }
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

  const handleCopy = () => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-5">
      <ToolHeader
        title="OCR Scanner"
        description={t('ocr_scanner_desc', 'Extract text locally from images, screenshots (Ctrl+V), or dropped files with optional contrast enhancement.')}
      />
      <div className={panel + ' space-y-4'}>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <FilePicker
              id="ocr-image-file"
              label={t('choose_image', 'Choose image')}
              fileName={image?.name}
              accept="image/*"
              onChange={e => {
                setImage(e.target.files?.[0] || null);
                setConfidence(null);
              }}
            />

            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">{t('ocr_language', 'Source language:')}</label>
              <select className={input} value={selectedLang} onChange={e => setSelectedLang(e.target.value)}>
                <option value="eng">{t('lang_english', 'English (eng)')}</option>
                <option value="ces">{t('lang_czech', 'Czech (ces)')}</option>
                <option value="eng+ces">{t('ocr_lang_eng_ces', 'English + Czech (eng+ces)')}</option>
                <option value="deu">{t('lang_german', 'German (deu)')}</option>
                <option value="eng+deu">{t('ocr_lang_eng_deu', 'English + German (eng+deu)')}</option>
                <option value="spa">{t('lang_spanish', 'Spanish (spa)')}</option>
                <option value="fra">{t('lang_french', 'French (fra)')}</option>
                <option value="rus">{t('lang_russian', 'Russian (rus)')}</option>
              </select>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={enhanceContrast}
                onChange={e => setEnhanceContrast(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700"
              />
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {t('ocr_enhance_contrast', 'Auto grayscale & contrast boost (sharper text)')}
            </label>

            <button type="button" className={button + ' w-full'} disabled={!image || busy} onClick={() => void scan()}>
              {busy ? `${t('scanning_progress', 'Scanning {progress}%…', { progress })} (${statusMsg})` : t('run_ocr', 'Run OCR')}
            </button>

            {busy && (
              <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                <div className="bg-indigo-500 h-2 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>

          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-lg border transition-colors ${
              isDragging ? 'border-indigo-500 bg-indigo-950/20' : 'border-slate-800 bg-slate-950/40'
            }`}
          >
            {imagePreview ? (
              <div className="p-2 text-center">
                <p className="text-[11px] text-slate-400 mb-1.5">{t('preview_image', 'Image preview:')}</p>
                <img src={imagePreview} alt={t('scanned_image', 'Scanned image')} className="max-h-52 max-w-full mx-auto object-contain rounded" />
              </div>
            ) : (
              <div className="border-dashed p-8 text-center text-slate-400 text-xs space-y-2">
                <ClipboardPaste className="w-6 h-6 mx-auto text-slate-500" />
                <p>{t('no_image_selected', 'No image selected yet.')}</p>
                <p className="text-[11px] text-slate-500">
                  {t('ocr_paste_drop_hint', 'Drop an image here or press Ctrl+V to paste a screenshot.')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-300">
              {t('ocr_result', 'Text recognition result:')}{' '}
              {text && (
                <span className="text-slate-500 font-normal">
                  ({wordCount} {t('words', 'words')}, {text.length} {t('chars', 'chars')}
                  {confidence !== null ? ` · ${t('ocr_confidence', 'Confidence')}: ${confidence}%` : ''})
                </span>
              )}
            </span>
            <div className="flex flex-wrap gap-2">
              <SendToToolButton
                sourceToolId="ocr-scanner"
                kind="text"
                getText={() => text}
                disabled={!text.trim()}
              />
              <button type="button" className={secondary} disabled={!text} onClick={handleCopy}>
                <Copy className="inline w-3.5 h-3.5 mr-1" />
                {copied ? t('copied', 'Copied!') : t('copy_text', 'Copy text')}
              </button>
              <button type="button" className={secondary} disabled={!text} onClick={() => void downloadText()}>
                <Download className="inline w-3.5 h-3.5 mr-1" />
                {t('download_txt', 'Download .txt')}
              </button>
              <button type="button" className={secondary} disabled={!text} onClick={() => { setText(''); setConfidence(null); }}>
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
