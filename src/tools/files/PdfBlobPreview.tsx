import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

interface PdfBlobPreviewProps {
  blob: Blob;
  fileName: string;
}

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5];

export const PdfBlobPreview: React.FC<PdfBlobPreviewProps> = ({ blob, fileName }) => {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [zoomIdx, setZoomIdx] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF document from Blob once per blob change
  useEffect(() => {
    let cancelled = false;
    let activeTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    setIsLoading(true);
    setError(null);
    setPageNumber(1);
    setNumPages(0);

    void blob
      .arrayBuffer()
      .then(buf => {
        if (cancelled) return;
        const copy = new Uint8Array(buf.slice(0));
        activeTask = pdfjsLib.getDocument({ data: copy });
        return activeTask.promise;
      })
      .then(doc => {
        if (!doc) return;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        if (pdfDocRef.current) {
          void pdfDocRef.current.destroy();
        }
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || t('conv_pdf_preview_error', 'Unable to render PDF preview.'));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation error
        }
        renderTaskRef.current = null;
      }
      if (activeTask) {
        void activeTask.destroy().catch(() => {});
      }
      if (pdfDocRef.current) {
        void pdfDocRef.current.destroy().catch(() => {});
        pdfDocRef.current = null;
      }
    };
  }, [blob, t]);

  // Render active page to canvas
  useEffect(() => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || numPages === 0) return;

    let cancelled = false;
    const scale = ZOOM_STEPS[zoomIdx] ?? 1;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // Ignore cancellation
          }
          renderTaskRef.current = null;
        }

        const safePage = Math.max(1, Math.min(pageNumber, doc.numPages));
        const page = await doc.getPage(safePage);
        if (cancelled) return;

        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale });
        const hiDpiViewport = page.getViewport({ scale: scale * dpr });

        canvas.width = Math.max(1, Math.floor(hiDpiViewport.width));
        canvas.height = Math.max(1, Math.floor(hiDpiViewport.height));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const task = page.render({ canvasContext: ctx, viewport: hiDpiViewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: unknown) {
        if (cancelled) return;
        const name = (err as { name?: string })?.name;
        if (name === 'RenderingCancelledException') return;
        setError(err instanceof Error ? err.message : t('conv_pdf_preview_error', 'Unable to render PDF preview.'));
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
    };
  }, [numPages, pageNumber, zoomIdx, t]);

  if (error) {
    return (
      <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800 text-xs">
        <span className="font-mono text-slate-400 truncate max-w-[220px]" title={fileName}>
          {fileName}
        </span>

        <div className="flex items-center gap-2">
          {numPages > 1 && (
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 px-1 py-0.5">
              <button
                type="button"
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                aria-label={t('conv_pdf_prev_page', 'Previous page')}
                className="p-1 rounded hover:bg-slate-800 disabled:opacity-35 text-slate-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono tabular-nums text-[11px] text-slate-300">
                {pageNumber} / {numPages}
              </span>
              <button
                type="button"
                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                aria-label={t('conv_pdf_next_page', 'Next page')}
                className="p-1 rounded hover:bg-slate-800 disabled:opacity-35 text-slate-300"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 px-1 py-0.5">
            <button
              type="button"
              onClick={() => setZoomIdx(z => Math.max(0, z - 1))}
              disabled={zoomIdx <= 0}
              aria-label={t('conv_pdf_zoom_out', 'Zoom out')}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-35 text-slate-300"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 font-mono tabular-nums text-[11px] text-slate-300">
              {Math.round((ZOOM_STEPS[zoomIdx] ?? 1) * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomIdx(z => Math.min(ZOOM_STEPS.length - 1, z + 1))}
              disabled={zoomIdx >= ZOOM_STEPS.length - 1}
              aria-label={t('conv_pdf_zoom_in', 'Zoom in')}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-35 text-slate-300"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="max-h-[460px] overflow-auto rounded-lg bg-slate-900/80 border border-slate-800 p-3 flex justify-center">
        {isLoading ? (
          <div className="py-12 flex items-center gap-2 text-xs text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>{t('conv_pdf_loading', 'Rendering PDF preview...')}</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="rounded shadow-lg bg-white max-w-full h-auto"
          />
        )}
      </div>
    </div>
  );
};
