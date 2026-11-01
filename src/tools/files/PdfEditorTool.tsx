import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
} from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import {
  FileText,
  Upload,
  Download,
  RotateCw,
  Trash2,
  Copy,
  Plus,
  Stamp,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PenTool,
  Move,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Type,
  Eraser,
  Highlighter,
  Square,
  FilePlus,
  Undo2,
  Redo2,
  Check,
  X,
  FileSignature,
  GripHorizontal,
  ChevronDown,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { saveBinaryWithDialog } from '../../services/fileSystemService';

// Configure pdf.js worker using Vite local asset URL
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export type ToolMode =
  | 'select'
  | 'edit_text'
  | 'add_text'
  | 'whiteout'
  | 'redact'
  | 'highlight'
  | 'pen'
  | 'signature'
  | 'watermark';

export type FontFamilyType =
  // Sans-Serif
  | 'Helvetica'
  | 'Arial'
  | 'Plus Jakarta Sans'
  | 'Verdana'
  | 'Trebuchet MS'
  // Serif
  | 'Times'
  | 'Georgia'
  | 'Playfair Display'
  | 'Merriweather'
  // Monospace
  | 'Courier'
  | 'JetBrains Mono'
  // Display & Script
  | 'Impact'
  | 'Caveat';

export interface FontOption {
  id: FontFamilyType;
  label: string;
  category: 'sans' | 'serif' | 'mono' | 'display';
  cssFont: string;
  standardPdfFont: 'Helvetica' | 'Times' | 'Courier';
  renderAsImageOnExport?: boolean;
}

export const AVAILABLE_FONTS: FontOption[] = [
  // Sans-Serif
  { id: 'Helvetica', label: 'Helvetica / Standard', category: 'sans', cssFont: 'Helvetica, Arial, sans-serif', standardPdfFont: 'Helvetica' },
  { id: 'Arial', label: 'Arial', category: 'sans', cssFont: 'Arial, "Helvetica Neue", sans-serif', standardPdfFont: 'Helvetica' },
  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'sans', cssFont: '"Plus Jakarta Sans", sans-serif', standardPdfFont: 'Helvetica' },
  { id: 'Verdana', label: 'Verdana', category: 'sans', cssFont: 'Verdana, Geneva, sans-serif', standardPdfFont: 'Helvetica' },
  { id: 'Trebuchet MS', label: 'Trebuchet MS', category: 'sans', cssFont: '"Trebuchet MS", sans-serif', standardPdfFont: 'Helvetica' },

  // Serif
  { id: 'Times', label: 'Times New Roman', category: 'serif', cssFont: '"Times New Roman", Times, serif', standardPdfFont: 'Times' },
  { id: 'Georgia', label: 'Georgia', category: 'serif', cssFont: 'Georgia, serif', standardPdfFont: 'Times' },
  { id: 'Playfair Display', label: 'Playfair Display', category: 'serif', cssFont: '"Playfair Display", Georgia, serif', standardPdfFont: 'Times' },
  { id: 'Merriweather', label: 'Merriweather', category: 'serif', cssFont: 'Merriweather, serif', standardPdfFont: 'Times' },

  // Monospace
  { id: 'Courier', label: 'Courier New', category: 'mono', cssFont: '"Courier New", Courier, monospace', standardPdfFont: 'Courier' },
  { id: 'JetBrains Mono', label: 'JetBrains Mono', category: 'mono', cssFont: '"JetBrains Mono", Consolas, monospace', standardPdfFont: 'Courier' },

  // Display & Script
  { id: 'Impact', label: 'Impact (Headline)', category: 'display', cssFont: 'Impact, "Arial Black", sans-serif', standardPdfFont: 'Helvetica', renderAsImageOnExport: true },
  { id: 'Caveat', label: 'Caveat (Handwritten / Script)', category: 'display', cssFont: 'Caveat, "Dancing Script", cursive', standardPdfFont: 'Times', renderAsImageOnExport: true },
];

export interface TextElement {
  id: string;
  type: 'text';
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: FontFamilyType;
  color: string;
  isBold?: boolean;
  isItalic?: boolean;
  hasWhiteoutBg?: boolean;
  originalText?: string;
}

export interface MaskElement {
  id: string;
  type: 'whiteout' | 'redact' | 'highlight';
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity?: number;
}

export interface ImageElement {
  id: string;
  type: 'image';
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
  label?: string;
}

export interface DrawingStroke {
  id: string;
  pageIndex: number;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export type AnnotationElement = TextElement | MaskElement | ImageElement;

export interface DetectedTextSpan {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: FontFamilyType;
  isBold: boolean;
  isItalic: boolean;
}

const sanitizeForPdf = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
};

const getCssFontFamily = (family?: FontFamilyType) => {
  const found = AVAILABLE_FONTS.find(f => f.id === family);
  return found ? found.cssFont : 'Helvetica, Arial, sans-serif';
};

export const PdfEditorTool: React.FC = () => {
  const { t } = useI18n();

  // Document state
  const [currentPdfBytes, setCurrentPdfBytes] = useState<Uint8Array | null>(null);
  const [originalPdfBytes, setOriginalPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('document.pdf');
  const [totalPages, setTotalPages] = useState<number>(0);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 595, height: 842 });

  // Tool & selection state
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [zoomScale, setZoomScale] = useState<number>(1.2);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Annotations list
  const [elements, setElements] = useState<AnnotationElement[]>([]);
  const [drawingStrokes, setDrawingStrokes] = useState<DrawingStroke[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedDetectedText, setSelectedDetectedText] = useState<DetectedTextSpan | null>(null);

  // Mouse Dragging State
  const [dragging, setDragging] = useState<{
    id: string;
    startX: number;
    startY: number;
    elemStartX: number;
    elemStartY: number;
    hasMoved: boolean;
  } | null>(null);

  // Pending drag for detected PDF text (so simple clicking selects without altering original text/font)
  const [pendingTextDrag, setPendingTextDrag] = useState<{
    dt: DetectedTextSpan;
    startX: number;
    startY: number;
  } | null>(null);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<{ elements: AnnotationElement[]; strokes: DrawingStroke[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Detected text on current page (from pdfjs)
  const [detectedTexts, setDetectedTexts] = useState<DetectedTextSpan[]>([]);

  // In-line Text Editor modal/popover
  const [editingTextElement, setEditingTextElement] = useState<TextElement | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>('');
  const [textFontSize, setTextFontSize] = useState<number>(14);
  const [textFontFamily, setTextFontFamily] = useState<FontFamilyType>('Helvetica');
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [textIsBold, setTextIsBold] = useState<boolean>(false);
  const [textIsItalic, setTextIsItalic] = useState<boolean>(false);
  const [textHasWhiteout, setTextHasWhiteout] = useState<boolean>(true);

  // Whiteout / Redact / Highlight drag state
  const [dragBox, setDragBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [highlightColor, setHighlightColor] = useState<string>('#fde047');

  // Pen state
  const [penColor, setPenColor] = useState<string>('#ef4444');
  const [penWidth, setPenWidth] = useState<number>(3);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[] | null>(null);

  // Signature modal state
  const [showSigModal, setShowSigModal] = useState(false);
  const [sigMode, setSigMode] = useState<'draw' | 'upload' | 'stamps'>('draw');
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);

  // Watermark modal state
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.2);
  const [watermarkRotation, setWatermarkRotation] = useState<-45 | 0 | 45>(-45);

  // DOM Refs
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show status notification
  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Push to history
  const pushHistory = useCallback((newElements: AnnotationElement[], newStrokes: DrawingStroke[]) => {
    setHistory(prev => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, { elements: newElements, strokes: newStrokes }];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Handle Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setElements(target.elements);
      setDrawingStrokes(target.strokes);
      setHistoryIndex(historyIndex - 1);
      setSelectedElementId(null);
      setSelectedDetectedText(null);
    }
  }, [history, historyIndex]);

  // Handle Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setElements(target.elements);
      setDrawingStrokes(target.strokes);
      setHistoryIndex(historyIndex + 1);
      setSelectedElementId(null);
      setSelectedDetectedText(null);
    }
  }, [history, historyIndex]);

  // Delete an annotation element
  const handleDeleteElement = useCallback((id: string) => {
    setElements(prev => {
      const nextElements = prev.filter(el => el.id !== id);
      pushHistory(nextElements, drawingStrokes);
      return nextElements;
    });
    setSelectedElementId(null);
  }, [drawingStrokes, pushHistory]);

  // Erase existing text from PDF by placing a whiteout mask over it
  const handleEraseExistingText = useCallback((dt: DetectedTextSpan) => {
    const maskId = `mask-erase-${Date.now()}`;
    const whiteoutMask: MaskElement = {
      id: maskId,
      type: 'whiteout',
      pageIndex: activePageIndex,
      x: dt.x - 2,
      y: dt.y - 1,
      width: dt.width + 4,
      height: dt.height + 2,
      color: '#ffffff',
      opacity: 1.0,
    };

    setElements(prev => {
      const nextElements = [...prev, whiteoutMask];
      pushHistory(nextElements, drawingStrokes);
      return nextElements;
    });
    setSelectedDetectedText(null);
    showNotification('success', t('pdf_editor_text_erased', 'Original text erased and masked'));
  }, [activePageIndex, drawingStrokes, pushHistory, t]);

  // Move existing text from PDF: masks the original text and makes it a draggable, editable text element
  // PRESERVING exact font family, size, bold, italic!
  const handleLiftAndMoveExistingText = useCallback((dt: DetectedTextSpan, clientX?: number, clientY?: number) => {
    const maskId = `mask-erase-${Date.now()}`;
    const whiteoutMask: MaskElement = {
      id: maskId,
      type: 'whiteout',
      pageIndex: activePageIndex,
      x: dt.x - 2,
      y: dt.y - 1,
      width: dt.width + 4,
      height: dt.height + 2,
      color: '#ffffff',
      opacity: 1.0,
    };

    const textId = `text-moved-${Date.now()}`;
    const newTextElem: TextElement = {
      id: textId,
      type: 'text',
      pageIndex: activePageIndex,
      x: dt.x,
      y: dt.y,
      width: dt.width,
      height: dt.height,
      text: dt.str,
      fontSize: dt.fontSize,
      fontFamily: dt.fontFamily,
      color: '#0f172a',
      isBold: dt.isBold,
      isItalic: dt.isItalic,
      hasWhiteoutBg: false,
      originalText: dt.str,
    };

    const nextElements = [...elements, whiteoutMask, newTextElem];
    setElements(nextElements);
    pushHistory(nextElements, drawingStrokes);
    setSelectedElementId(textId);
    setSelectedDetectedText(null);

    if (clientX !== undefined && clientY !== undefined) {
      setDragging({
        id: textId,
        startX: clientX,
        startY: clientY,
        elemStartX: dt.x,
        elemStartY: dt.y,
        hasMoved: false,
      });
    }
  }, [activePageIndex, elements, drawingStrokes, pushHistory]);

  // Global mousemove and mouseup listeners for smooth dragging anywhere on screen
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // Check if user initiated a drag from detected text
      if (pendingTextDrag) {
        const dist = Math.hypot(e.clientX - pendingTextDrag.startX, e.clientY - pendingTextDrag.startY);
        if (dist > 5) {
          handleLiftAndMoveExistingText(pendingTextDrag.dt, e.clientX, e.clientY);
          setPendingTextDrag(null);
          return;
        }
      }

      if (!dragging) return;
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        setDragging(prev => (prev ? { ...prev, hasMoved: true } : null));
      }

      setElements(prev =>
        prev.map(el =>
          el.id === dragging.id
            ? {
                ...el,
                x: Math.max(0, Math.min(pageSize.width * zoomScale - 20, dragging.elemStartX + dx)),
                y: Math.max(0, Math.min(pageSize.height * zoomScale - 20, dragging.elemStartY + dy)),
              }
            : el
        )
      );
    };

    const onMouseUp = () => {
      if (pendingTextDrag) {
        setPendingTextDrag(null);
      }
      if (dragging) {
        if (dragging.hasMoved) {
          pushHistory(elements, drawingStrokes);
        }
        setDragging(null);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, pendingTextDrag, elements, drawingStrokes, pageSize, zoomScale, handleLiftAndMoveExistingText, pushHistory]);

  // Keyboard navigation & Shortcuts (Delete, Undo, Redo, Arrows)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          handleDeleteElement(selectedElementId);
        } else if (selectedDetectedText) {
          e.preventDefault();
          handleEraseExistingText(selectedDetectedText);
        }
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedElementId) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        setElements(prev =>
          prev.map(el => (el.id === selectedElementId ? { ...el, x: el.x + dx, y: el.y + dy } : el))
        );
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedElementId, selectedDetectedText, handleDeleteElement, handleEraseExistingText, handleUndo, handleRedo]);

  // Render current PDF page using pdfjs-dist with accurate font style detection
  const renderCurrentPage = useCallback(async (pdfBytes: Uint8Array, pageIdx: number) => {
    if (!pageCanvasRef.current) return;
    setIsProcessing(true);

    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      setTotalPages(pdf.numPages);

      const pageNumber = Math.min(Math.max(1, pageIdx + 1), pdf.numPages);
      const page = await pdf.getPage(pageNumber);

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      setPageSize({ width: unscaledViewport.width, height: unscaledViewport.height });

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: zoomScale });

      const canvas = pageCanvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Extract text content items for in-place text detection & font preserving
      const textContent = await page.getTextContent();
      const detected: DetectedTextSpan[] = [];

      for (let i = 0; i < textContent.items.length; i++) {
        const item = textContent.items[i] as {
          str?: string;
          transform?: number[];
          width?: number;
          height?: number;
          fontName?: string;
        };

        if (item.str && item.str.trim().length > 0 && item.transform) {
          const tx = item.transform[4];
          const ty = item.transform[5];
          const fontSize = Math.hypot(item.transform[0], item.transform[1]) || 12;

          const [viewX, viewY] = viewport.convertToViewportPoint(tx, ty);
          const itemWidth = (item.width || item.str.length * fontSize * 0.5) * zoomScale;
          const itemHeight = fontSize * zoomScale * 1.1;

          // Detect font family, bold, and italic from PDF font name and styles
          const fontName = (item.fontName || '').toLowerCase();
          const style = (textContent as unknown as { styles?: Record<string, { fontFamily?: string }> }).styles?.[item.fontName || ''];
          const rawFamily = (style?.fontFamily || fontName).toLowerCase();

          let detectedFamily: FontFamilyType = 'Helvetica';
          if (rawFamily.includes('georgia')) {
            detectedFamily = 'Georgia';
          } else if (rawFamily.includes('playfair')) {
            detectedFamily = 'Playfair Display';
          } else if (rawFamily.includes('merriweather')) {
            detectedFamily = 'Merriweather';
          } else if (rawFamily.includes('times') || rawFamily.includes('serif') || rawFamily.includes('roman') || rawFamily.includes('cambria')) {
            detectedFamily = 'Times';
          } else if (rawFamily.includes('jetbrains')) {
            detectedFamily = 'JetBrains Mono';
          } else if (rawFamily.includes('courier') || rawFamily.includes('mono') || rawFamily.includes('consolas')) {
            detectedFamily = 'Courier';
          } else if (rawFamily.includes('verdana')) {
            detectedFamily = 'Verdana';
          } else if (rawFamily.includes('trebuchet')) {
            detectedFamily = 'Trebuchet MS';
          } else if (rawFamily.includes('jakarta')) {
            detectedFamily = 'Plus Jakarta Sans';
          } else if (rawFamily.includes('arial')) {
            detectedFamily = 'Arial';
          } else if (rawFamily.includes('impact')) {
            detectedFamily = 'Impact';
          } else if (rawFamily.includes('caveat') || rawFamily.includes('cursive') || rawFamily.includes('script')) {
            detectedFamily = 'Caveat';
          } else {
            detectedFamily = 'Helvetica';
          }

          const isBold =
            rawFamily.includes('bold') ||
            fontName.includes('bold') ||
            fontName.includes('black') ||
            fontName.includes('heavy') ||
            fontName.includes('-b') ||
            fontName.endsWith('b');

          const isItalic =
            rawFamily.includes('italic') ||
            rawFamily.includes('oblique') ||
            fontName.includes('italic') ||
            fontName.includes('oblique') ||
            fontName.includes('-i');

          detected.push({
            id: `text-detected-${i}`,
            str: item.str,
            x: viewX,
            y: viewY - itemHeight,
            width: Math.max(itemWidth, 16),
            height: Math.max(itemHeight, 14),
            fontSize: Math.round(fontSize),
            fontFamily: detectedFamily,
            isBold,
            isItalic,
          });
        }
      }

      setDetectedTexts(detected);
    } catch (err) {
      console.error('Error rendering page:', err);
      showNotification('error', `${t('pdf_editor_error_processing', 'Error processing document: ')} ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [zoomScale, t]);

  // Generate thumbnail previews for all pages
  const generateThumbnails = useCallback(async (pdfBytes: Uint8Array) => {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      const thumbs: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.22 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          thumbs.push(canvas.toDataURL('image/jpeg', 0.7));
        }
      }
      setPageThumbnails(thumbs);
    } catch (err) {
      console.warn('Could not generate thumbnails', err);
    }
  }, []);

  // Load PDF file into editor
  const handleLoadPdf = useCallback(async (bytes: Uint8Array, name: string) => {
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const numPages = pdfDoc.getPageCount();

      setCurrentPdfBytes(bytes);
      setOriginalPdfBytes(bytes);
      setFileName(name);
      setTotalPages(numPages);
      setActivePageIndex(0);
      setElements([]);
      setDrawingStrokes([]);
      setHistory([{ elements: [], strokes: [] }]);
      setHistoryIndex(0);
      setSelectedElementId(null);
      setSelectedDetectedText(null);

      await renderCurrentPage(bytes, 0);
      await generateThumbnails(bytes);
      showNotification('success', t('pdf_editor_all_saved', 'Document ready'));
    } catch (err) {
      console.error('Failed to load PDF:', err);
      showNotification('error', `${t('pdf_editor_error_processing', 'Error processing document: ')} ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [renderCurrentPage, generateThumbnails, t]);

  // Load Sample PDF (Invoice / Business Report)
  const handleLoadSamplePdf = async () => {
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Header Banner
      page.drawRectangle({
        x: 40,
        y: 770,
        width: 515,
        height: 45,
        color: rgb(0.06, 0.09, 0.16),
      });

      page.drawText('OMNIDESK INVOICE & REPORT', {
        x: 55,
        y: 785,
        size: 16,
        font: fontBold,
        color: rgb(0.2, 0.85, 0.6),
      });

      page.drawText('#INV-2026-084', {
        x: 450,
        y: 785,
        size: 12,
        font,
        color: rgb(1, 1, 1),
      });

      // Recipient / Details Box
      page.drawRectangle({
        x: 40,
        y: 660,
        width: 515,
        height: 90,
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 1,
        color: rgb(0.97, 0.98, 0.99),
      });

      page.drawText('Client Name: Acme Global Corporation', {
        x: 55,
        y: 725,
        size: 12,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawText('Billing Address: 452 Innovation Blvd, Suite 800, New York, NY', {
        x: 55,
        y: 705,
        size: 10,
        font,
        color: rgb(0.3, 0.35, 0.4),
      });

      page.drawText('Issue Date: November 01, 2026   |   Due Date: November 15, 2026', {
        x: 55,
        y: 680,
        size: 10,
        font,
        color: rgb(0.3, 0.35, 0.4),
      });

      // Table Header
      page.drawRectangle({
        x: 40,
        y: 615,
        width: 515,
        height: 25,
        color: rgb(0.92, 0.94, 0.98),
      });

      page.drawText('Description', { x: 55, y: 623, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
      page.drawText('Quantity', { x: 320, y: 623, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
      page.drawText('Rate', { x: 400, y: 623, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
      page.drawText('Total Amount', { x: 470, y: 623, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.35) });

      // Rows
      const rows = [
        { desc: 'High-Performance Cloud Architecture Design', qty: '1', rate: '$ 1,850.00', total: '$ 1,850.00' },
        { desc: 'Native Desktop Rust/Tauri Integration Suite', qty: '2', rate: '$ 950.00', total: '$ 1,900.00' },
        { desc: 'Zero-Latency Offline Data Synchronization', qty: '1', rate: '$ 1,200.00', total: '$ 1,200.00' },
        { desc: 'Comprehensive Security & Cryptography Audit', qty: '1', rate: '$ 850.00', total: '$ 850.00' },
      ];

      rows.forEach((r, idx) => {
        const yPos = 585 - idx * 30;
        page.drawText(r.desc, { x: 55, y: yPos, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
        page.drawText(r.qty, { x: 335, y: yPos, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
        page.drawText(r.rate, { x: 400, y: yPos, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
        page.drawText(r.total, { x: 475, y: yPos, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      });

      // Total Box
      page.drawRectangle({
        x: 340,
        y: 430,
        width: 215,
        height: 35,
        color: rgb(0.06, 0.09, 0.16),
      });

      page.drawText('TOTAL DUE:', { x: 355, y: 442, size: 11, font: fontBold, color: rgb(1, 1, 1) });
      page.drawText('$ 5,800.00', { x: 460, y: 442, size: 12, font: fontBold, color: rgb(0.2, 0.85, 0.6) });

      // Instructions block
      page.drawText('Interactive Visual Editing & 12+ Fonts:', { x: 40, y: 390, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText('Choose from Sans-Serif, Serif, Monospace, Impact, or Caveat handwriting fonts.', {
        x: 40,
        y: 370,
        size: 10,
        font,
        color: rgb(0.4, 0.45, 0.5),
      });
      page.drawText('Drag to move text freely, or press Delete to erase it with clean whiteout.', {
        x: 40,
        y: 350,
        size: 10,
        font,
        color: rgb(0.4, 0.45, 0.5),
      });

      // Footer
      page.drawText('Page 1 of 1  •  Authorized Signature Required', {
        x: 180,
        y: 40,
        size: 9,
        font,
        color: rgb(0.6, 0.65, 0.7),
      });

      const sampleBytes = await pdfDoc.save();
      await handleLoadPdf(sampleBytes, 'sample-invoice.pdf');
    } catch (err) {
      console.error('Failed to create sample PDF:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Create New Blank PDF
  const handleCreateBlankPdf = async () => {
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595, 842]); // A4
      const blankBytes = await pdfDoc.save();
      await handleLoadPdf(blankBytes, 'blank-document.pdf');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-render when page index or zoom changes
  useEffect(() => {
    if (currentPdfBytes) {
      renderCurrentPage(currentPdfBytes, activePageIndex);
    }
  }, [currentPdfBytes, activePageIndex, zoomScale, renderCurrentPage]);

  // Load default sample PDF on first mount if none is loaded
  useEffect(() => {
    handleLoadSamplePdf();
  }, []);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);
      await handleLoadPdf(bytes, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  // Open in-line text editor
  const startEditingText = (elem: Partial<TextElement>) => {
    const fullElem: TextElement = {
      id: elem.id || `text-${Date.now()}`,
      type: 'text',
      pageIndex: activePageIndex,
      x: elem.x || 50,
      y: elem.y || 50,
      width: elem.width || 200,
      height: elem.height || 30,
      text: elem.text || '',
      fontSize: elem.fontSize || 14,
      fontFamily: elem.fontFamily || textFontFamily,
      color: elem.color || textColor,
      isBold: elem.isBold ?? textIsBold,
      isItalic: elem.isItalic ?? textIsItalic,
      hasWhiteoutBg: elem.hasWhiteoutBg ?? true,
      originalText: elem.originalText,
    };

    setEditingTextElement(fullElem);
    setTextInputValue(fullElem.text);
    setTextFontSize(fullElem.fontSize);
    setTextFontFamily(fullElem.fontFamily);
    setTextColor(fullElem.color);
    setTextIsBold(!!fullElem.isBold);
    setTextIsItalic(!!fullElem.isItalic);
    setTextHasWhiteout(!!fullElem.hasWhiteoutBg);
  };

  // Save edited text element
  const saveEditingText = () => {
    if (!editingTextElement) return;
    if (textInputValue.trim().length === 0) {
      const nextElements = elements.filter(el => el.id !== editingTextElement.id);
      setElements(nextElements);
      pushHistory(nextElements, drawingStrokes);
      setEditingTextElement(null);
      return;
    }

    const updated: TextElement = {
      ...editingTextElement,
      text: textInputValue,
      fontSize: textFontSize,
      fontFamily: textFontFamily,
      color: textColor,
      isBold: textIsBold,
      isItalic: textIsItalic,
      hasWhiteoutBg: textHasWhiteout,
    };

    const exists = elements.some(el => el.id === updated.id);
    const nextElements = exists
      ? elements.map(el => (el.id === updated.id ? updated : el))
      : [...elements, updated];

    setElements(nextElements);
    pushHistory(nextElements, drawingStrokes);
    setEditingTextElement(null);
    setSelectedElementId(updated.id);
  };

  // Update font family of selected element directly from toolbar
  const changeSelectedElementFontFamily = (family: FontFamilyType) => {
    if (!selectedElementId) return;
    setElements(prev => {
      const next = prev.map(el => (el.id === selectedElementId && el.type === 'text' ? { ...el, fontFamily: family } : el));
      pushHistory(next, drawingStrokes);
      return next;
    });
  };

  // Update font size of selected element directly from toolbar
  const changeSelectedElementFontSize = (delta: number) => {
    if (!selectedElementId) return;
    setElements(prev => {
      const next = prev.map(el =>
        el.id === selectedElementId && el.type === 'text'
          ? { ...el, fontSize: Math.max(8, Math.min(72, el.fontSize + delta)) }
          : el
      );
      pushHistory(next, drawingStrokes);
      return next;
    });
  };

  // Toggle bold of selected element
  const toggleSelectedElementBold = () => {
    if (!selectedElementId) return;
    setElements(prev => {
      const next = prev.map(el =>
        el.id === selectedElementId && el.type === 'text'
          ? { ...el, isBold: !el.isBold }
          : el
      );
      pushHistory(next, drawingStrokes);
      return next;
    });
  };

  // Toggle italic of selected element
  const toggleSelectedElementItalic = () => {
    if (!selectedElementId) return;
    setElements(prev => {
      const next = prev.map(el =>
        el.id === selectedElementId && el.type === 'text'
          ? { ...el, isItalic: !el.isItalic }
          : el
      );
      pushHistory(next, drawingStrokes);
      return next;
    });
  };

  // Stage Mouse Down: handle drawing, dragging masks, adding text, or clearing selection
  const handleStageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageContainerRef.current) return;
    const rect = stageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'pen') {
      setCurrentStroke([{ x, y }]);
    } else if (activeTool === 'whiteout' || activeTool === 'redact' || activeTool === 'highlight') {
      setDragBox({ startX: x, startY: y, currentX: x, currentY: y });
    } else if (activeTool === 'add_text') {
      startEditingText({
        x,
        y,
        width: 180,
        height: 28,
        text: 'New Text',
        fontSize: 14,
        fontFamily: textFontFamily,
        hasWhiteoutBg: false,
      });
      setActiveTool('select');
    } else if (activeTool === 'select') {
      // Clicked on blank page space -> deselect
      setSelectedElementId(null);
      setSelectedDetectedText(null);
    }
  };

  // Stage Mouse Move (drawing strokes or drag box)
  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageContainerRef.current) return;
    const rect = stageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'pen' && currentStroke) {
      setCurrentStroke(prev => (prev ? [...prev, { x, y }] : null));
    } else if (dragBox) {
      setDragBox(prev => (prev ? { ...prev, currentX: x, currentY: y } : null));
    }
  };

  // Stage Mouse Up: finish mask or drawing
  const handleStageMouseUp = () => {
    if (activeTool === 'pen' && currentStroke && currentStroke.length > 1) {
      const newStroke: DrawingStroke = {
        id: `stroke-${Date.now()}`,
        pageIndex: activePageIndex,
        points: currentStroke,
        color: penColor,
        width: penWidth,
      };
      const nextStrokes = [...drawingStrokes, newStroke];
      setDrawingStrokes(nextStrokes);
      pushHistory(elements, nextStrokes);
      setCurrentStroke(null);
    } else if (dragBox) {
      const minX = Math.min(dragBox.startX, dragBox.currentX);
      const minY = Math.min(dragBox.startY, dragBox.currentY);
      const width = Math.abs(dragBox.currentX - dragBox.startX);
      const height = Math.abs(dragBox.currentY - dragBox.startY);

      if (width > 8 && height > 8) {
        let maskColor = '#ffffff';
        let opacity = 1.0;

        if (activeTool === 'redact') {
          maskColor = '#000000';
        } else if (activeTool === 'highlight') {
          maskColor = highlightColor;
          opacity = 0.4;
        }

        const newMask: MaskElement = {
          id: `mask-${Date.now()}`,
          type: activeTool as 'whiteout' | 'redact' | 'highlight',
          pageIndex: activePageIndex,
          x: minX,
          y: minY,
          width,
          height,
          color: maskColor,
          opacity,
        };

        const nextElements = [...elements, newMask];
        setElements(nextElements);
        pushHistory(nextElements, drawingStrokes);
        setSelectedElementId(newMask.id);
      }
      setDragBox(null);
      setActiveTool('select');
    }
  };

  // Page Operations
  const handleRotatePage = async (pageIdx: number, angleDiff: number) => {
    if (!currentPdfBytes) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(currentPdfBytes, { ignoreEncryption: true });
      const page = pdfDoc.getPage(pageIdx);
      const currentAngle = page.getRotation().angle;
      const newAngle = (currentAngle + angleDiff + 360) % 360;
      page.setRotation(degrees(newAngle));

      const updatedBytes = await pdfDoc.save();
      setCurrentPdfBytes(updatedBytes);

      await renderCurrentPage(updatedBytes, activePageIndex);
      await generateThumbnails(updatedBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicatePage = async (pageIdx: number) => {
    if (!currentPdfBytes) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(currentPdfBytes, { ignoreEncryption: true });
      const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageIdx]);
      pdfDoc.insertPage(pageIdx + 1, copiedPage);

      const updatedBytes = await pdfDoc.save();
      setCurrentPdfBytes(updatedBytes);
      setTotalPages(pdfDoc.getPageCount());
      setActivePageIndex(pageIdx + 1);

      await renderCurrentPage(updatedBytes, pageIdx + 1);
      await generateThumbnails(updatedBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePage = async (pageIdx: number) => {
    if (!currentPdfBytes || totalPages <= 1) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(currentPdfBytes, { ignoreEncryption: true });
      pdfDoc.removePage(pageIdx);

      const updatedBytes = await pdfDoc.save();
      setCurrentPdfBytes(updatedBytes);
      const nextTotal = pdfDoc.getPageCount();
      setTotalPages(nextTotal);
      const nextActive = Math.min(pageIdx, nextTotal - 1);
      setActivePageIndex(nextActive);

      await renderCurrentPage(updatedBytes, nextActive);
      await generateThumbnails(updatedBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInsertBlankPage = async (afterIdx: number) => {
    if (!currentPdfBytes) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(currentPdfBytes, { ignoreEncryption: true });
      pdfDoc.insertPage(afterIdx + 1, [pageSize.width, pageSize.height]);

      const updatedBytes = await pdfDoc.save();
      setCurrentPdfBytes(updatedBytes);
      setTotalPages(pdfDoc.getPageCount());
      setActivePageIndex(afterIdx + 1);

      await renderCurrentPage(updatedBytes, afterIdx + 1);
      await generateThumbnails(updatedBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMovePage = async (fromIdx: number, toIdx: number) => {
    if (!currentPdfBytes || toIdx < 0 || toIdx >= totalPages) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(currentPdfBytes, { ignoreEncryption: true });
      const [copied] = await pdfDoc.copyPages(pdfDoc, [fromIdx]);
      pdfDoc.removePage(fromIdx);
      pdfDoc.insertPage(toIdx, copied);

      const updatedBytes = await pdfDoc.save();
      setCurrentPdfBytes(updatedBytes);
      setActivePageIndex(toIdx);

      await renderCurrentPage(updatedBytes, toIdx);
      await generateThumbnails(updatedBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Signature canvas drawing helpers
  const handleSigMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawingSig(true);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleSigMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleSigMouseUp = () => {
    setIsDrawingSig(false);
  };

  const clearSigCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Place signature or stamp on page
  const handleInsertSignature = (dataUrl: string, label?: string) => {
    const newSigElem: ImageElement = {
      id: `img-${Date.now()}`,
      type: 'image',
      pageIndex: activePageIndex,
      x: 100,
      y: 150,
      width: 140,
      height: 70,
      dataUrl,
      label,
    };

    const nextElements = [...elements, newSigElem];
    setElements(nextElements);
    pushHistory(nextElements, drawingStrokes);
    setShowSigModal(false);
    setSelectedElementId(newSigElem.id);
    setActiveTool('select');
  };

  // Stamp Presets
  const stampPresets = [
    { label: t('pdf_editor_stamp_approved', 'APPROVED'), color: '#16a34a', bg: '#dcfce7' },
    { label: t('pdf_editor_stamp_confidential', 'CONFIDENTIAL'), color: '#dc2626', bg: '#fee2e2' },
    { label: t('pdf_editor_stamp_paid', 'PAID'), color: '#0284c7', bg: '#e0f2fe' },
    { label: t('pdf_editor_stamp_draft', 'DRAFT'), color: '#ca8a04', bg: '#fef9c3' },
    { label: t('pdf_editor_stamp_urgent', 'URGENT'), color: '#e11d48', bg: '#ffe4e6' },
    { label: t('pdf_editor_stamp_rejected', 'REJECTED'), color: '#4b5563', bg: '#f3f4f6' },
  ];

  const createStampDataUrl = (label: string, color: string, bg: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 240, 90);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 232, 82);
      ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 120, 45);
    }
    return canvas.toDataURL('image/png');
  };

  // Apply Watermark to PDF
  const handleApplyWatermark = async () => {
    if (!currentPdfBytes) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(currentPdfBytes, { ignoreEncryption: true });
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const numPages = pdfDoc.getPageCount();

      for (let i = 0; i < numPages; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        const text = sanitizeForPdf(watermarkText.toUpperCase());

        page.drawText(text, {
          x: width * 0.15,
          y: height * 0.45,
          size: 55,
          font,
          color: rgb(0.85, 0.2, 0.2),
          opacity: watermarkOpacity,
          rotate: degrees(watermarkRotation),
        });
      }

      const updatedBytes = await pdfDoc.save();
      setCurrentPdfBytes(updatedBytes);
      await renderCurrentPage(updatedBytes, activePageIndex);
      await generateThumbnails(updatedBytes);
      setShowWatermarkModal(false);
      showNotification('success', t('pdf_editor_all_saved', 'Watermark applied'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Compile & Export PDF with all baked elements, drawing strokes, and full font families support
  const handleExportPdf = async () => {
    if (!currentPdfBytes) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(currentPdfBytes, { ignoreEncryption: true });

      // Embed standard fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaItalicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const helveticaBoldItalicFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

      const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const timesItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const timesBoldItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

      const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
      const courierBoldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
      const courierItalicFont = await pdfDoc.embedFont(StandardFonts.CourierOblique);
      const courierBoldItalicFont = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);

      const numPages = pdfDoc.getPageCount();

      // Bake annotations for each page
      for (let p = 0; p < numPages; p++) {
        const page = pdfDoc.getPage(p);
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const pageScaleRatioX = pageWidth / (pageSize.width * zoomScale);
        const pageScaleRatioY = pageHeight / (pageSize.height * zoomScale);

        // 1. Draw Masks (Whiteouts, Redactions, Highlights)
        const pageMasks = elements.filter(
          el => el.pageIndex === p && (el.type === 'whiteout' || el.type === 'redact' || el.type === 'highlight')
        ) as MaskElement[];

        for (const mask of pageMasks) {
          const pdfX = mask.x * pageScaleRatioX;
          const pdfY = pageHeight - (mask.y + mask.height) * pageScaleRatioY;
          const pdfWidth = mask.width * pageScaleRatioX;
          const pdfHeight = mask.height * pageScaleRatioY;

          let r = 1, g = 1, b = 1;
          if (mask.color === '#000000') {
            r = 0; g = 0; b = 0;
          } else if (mask.type === 'highlight') {
            r = 0.99; g = 0.88; b = 0.28;
          }

          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            color: rgb(r, g, b),
            opacity: mask.opacity ?? 1.0,
          });
        }

        // 2. Draw Text Elements (Replacement or new text with full font options)
        const pageTexts = elements.filter(el => el.pageIndex === p && el.type === 'text') as TextElement[];

        for (const textElem of pageTexts) {
          const pdfX = textElem.x * pageScaleRatioX;
          const pdfY = pageHeight - (textElem.y + textElem.height) * pageScaleRatioY;
          const pdfWidth = textElem.width * pageScaleRatioX;
          const pdfHeight = textElem.height * pageScaleRatioY;

          if (textElem.hasWhiteoutBg) {
            page.drawRectangle({
              x: pdfX - 2,
              y: pdfY - 2,
              width: pdfWidth + 4,
              height: pdfHeight + 4,
              color: rgb(1, 1, 1),
              opacity: 1.0,
            });
          }

          const fontOpt = AVAILABLE_FONTS.find(f => f.id === textElem.fontFamily);

          // For decorative / script fonts (Caveat, Impact), render high-res image to maintain 100% exact typeface
          if (fontOpt?.renderAsImageOnExport) {
            const highResCanvas = document.createElement('canvas');
            const renderDpr = 3;
            const fontPixelSize = Math.max(12, textElem.fontSize * 1.5) * renderDpr;
            const hCtx = highResCanvas.getContext('2d');
            if (hCtx) {
              hCtx.font = `${textElem.isBold ? 'bold ' : ''}${textElem.isItalic ? 'italic ' : ''}${fontPixelSize}px ${fontOpt.cssFont}`;
              const textMetrics = hCtx.measureText(textElem.text);
              const textWidth = Math.ceil(textMetrics.width + 20 * renderDpr);
              const textHeight = Math.ceil(fontPixelSize * 1.4);

              highResCanvas.width = textWidth;
              highResCanvas.height = textHeight;

              hCtx.font = `${textElem.isBold ? 'bold ' : ''}${textElem.isItalic ? 'italic ' : ''}${fontPixelSize}px ${fontOpt.cssFont}`;
              hCtx.fillStyle = textElem.color || '#0f172a';
              hCtx.textBaseline = 'top';
              hCtx.fillText(textElem.text, 5 * renderDpr, 5 * renderDpr);

              const textDataUrl = highResCanvas.toDataURL('image/png');
              const embeddedImage = await pdfDoc.embedPng(textDataUrl);

              const exportWidth = (textWidth / renderDpr) * pageScaleRatioX;
              const exportHeight = (textHeight / renderDpr) * pageScaleRatioY;

              page.drawImage(embeddedImage, {
                x: pdfX,
                y: pdfY,
                width: exportWidth,
                height: exportHeight,
              });
              continue;
            }
          }

          // Standard vector PDF fonts
          let targetFont = helveticaFont;
          const std = fontOpt?.standardPdfFont || 'Helvetica';
          if (std === 'Times') {
            if (textElem.isBold && textElem.isItalic) targetFont = timesBoldItalicFont;
            else if (textElem.isBold) targetFont = timesBoldFont;
            else if (textElem.isItalic) targetFont = timesItalicFont;
            else targetFont = timesFont;
          } else if (std === 'Courier') {
            if (textElem.isBold && textElem.isItalic) targetFont = courierBoldItalicFont;
            else if (textElem.isBold) targetFont = courierBoldFont;
            else if (textElem.isItalic) targetFont = courierItalicFont;
            else targetFont = courierFont;
          } else {
            if (textElem.isBold && textElem.isItalic) targetFont = helveticaBoldItalicFont;
            else if (textElem.isBold) targetFont = helveticaBoldFont;
            else if (textElem.isItalic) targetFont = helveticaItalicFont;
            else targetFont = helveticaFont;
          }

          const sanitized = sanitizeForPdf(textElem.text);
          const pdfFontSize = (textElem.fontSize / zoomScale) * 0.95;

          page.drawText(sanitized, {
            x: pdfX,
            y: pdfY + 4,
            size: Math.max(8, pdfFontSize),
            font: targetFont,
            color: rgb(0.06, 0.09, 0.16),
          });
        }

        // 3. Draw Images / Signatures / Stamps
        const pageImages = elements.filter(el => el.pageIndex === p && el.type === 'image') as ImageElement[];

        for (const imgElem of pageImages) {
          try {
            const pngImage = await pdfDoc.embedPng(imgElem.dataUrl);
            const pdfX = imgElem.x * pageScaleRatioX;
            const pdfY = pageHeight - (imgElem.y + imgElem.height) * pageScaleRatioY;
            const pdfWidth = imgElem.width * pageScaleRatioX;
            const pdfHeight = imgElem.height * pageScaleRatioY;

            page.drawImage(pngImage, {
              x: pdfX,
              y: pdfY,
              width: pdfWidth,
              height: pdfHeight,
            });
          } catch (e) {
            console.warn('Could not embed PNG image:', e);
          }
        }

        // 4. Draw Freehand Pen Strokes
        const pageStrokes = drawingStrokes.filter(s => s.pageIndex === p);
        if (pageStrokes.length > 0) {
          const strokeCanvas = document.createElement('canvas');
          strokeCanvas.width = pageWidth;
          strokeCanvas.height = pageHeight;
          const sCtx = strokeCanvas.getContext('2d');
          if (sCtx) {
            sCtx.lineCap = 'round';
            sCtx.lineJoin = 'round';

            pageStrokes.forEach(stroke => {
              if (stroke.points.length < 2) return;
              sCtx.strokeStyle = stroke.color;
              sCtx.lineWidth = stroke.width * pageScaleRatioX;
              sCtx.beginPath();
              sCtx.moveTo(stroke.points[0].x * pageScaleRatioX, stroke.points[0].y * pageScaleRatioY);
              for (let i = 1; i < stroke.points.length; i++) {
                sCtx.lineTo(stroke.points[i].x * pageScaleRatioX, stroke.points[i].y * pageScaleRatioY);
              }
              sCtx.stroke();
            });

            const strokePngUrl = strokeCanvas.toDataURL('image/png');
            const strokePng = await pdfDoc.embedPng(strokePngUrl);
            page.drawImage(strokePng, {
              x: 0,
              y: 0,
              width: pageWidth,
              height: pageHeight,
            });
          }
        }
      }

      const finalBytes = await pdfDoc.save();
      const exportName = fileName.replace(/\.pdf$/i, '') + '-edited.pdf';

      await saveBinaryWithDialog(exportName, finalBytes, 'application/pdf');

      setCurrentPdfBytes(finalBytes);
      setElements([]);
      setDrawingStrokes([]);
      setHistory([{ elements: [], strokes: [] }]);
      setHistoryIndex(0);

      await renderCurrentPage(finalBytes, activePageIndex);
      await generateThumbnails(finalBytes);

      showNotification('success', t('pdf_editor_saved_success', 'PDF exported and saved successfully!'));
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('error', `${t('pdf_editor_error_processing', 'Error processing document: ')} ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export current page as PNG image
  const handleExportPagePng = () => {
    if (!pageCanvasRef.current) return;
    const canvas = pageCanvasRef.current;
    const link = document.createElement('a');
    link.download = `${fileName.replace(/\.pdf$/i, '')}-page-${activePageIndex + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showNotification('success', t('pdf_editor_export_png', 'Export Page as PNG'));
  };

  // Reset to original document
  const handleResetDocument = () => {
    if (!originalPdfBytes) return;
    if (window.confirm(t('pdf_editor_reset_confirm', 'Revert all modifications to the initial file?'))) {
      handleLoadPdf(originalPdfBytes, fileName);
    }
  };

  const selectedTextElem = elements.find(el => el.id === selectedElementId && el.type === 'text') as TextElement | undefined;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* TOP APP BAR */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <FileText className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-100">{t('pdf_editor_title', 'PDF Studio & Visual Editor')}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                {totalPages > 0 ? t('pdf_editor_page_num', `Page ${activePageIndex + 1} of ${totalPages}`).replace('{current}', String(activePageIndex + 1)).replace('{total}', String(totalPages)) : t('pdf_editor_all_saved', 'Document ready')}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xs">{fileName}</p>
          </div>
        </div>

        {/* Center Document Actions */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all"
            title={t('pdf_editor_open_file', 'Open PDF')}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('pdf_editor_open_file', 'Open PDF')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <button
            onClick={handleLoadSamplePdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all"
            title={t('pdf_editor_sample_file', 'Sample PDF')}
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('pdf_editor_sample_file', 'Sample PDF')}</span>
          </button>

          <button
            onClick={handleCreateBlankPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all"
            title={t('pdf_editor_new_blank', 'New Blank PDF')}
          >
            <FilePlus className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('pdf_editor_new_blank', 'New Blank PDF')}</span>
          </button>

          <div className="w-px h-4 bg-slate-800 my-auto" />

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-800 transition-all"
            title={t('pdf_editor_undo', 'Undo (Ctrl+Z)')}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-800 transition-all"
            title={t('pdf_editor_redo', 'Redo (Ctrl+Y)')}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Right Save / Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPagePng}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-all"
            title={t('pdf_editor_export_png', 'Export Page as PNG')}
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">{t('pdf_editor_export_png', 'PNG')}</span>
          </button>

          <button
            onClick={handleResetDocument}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-xl transition-all"
            title={t('pdf_editor_reset', 'Reset to Original')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isProcessing || !currentPdfBytes}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{t('pdf_editor_save_export', 'Export PDF')}</span>
          </button>
        </div>
      </div>

      {/* STATUS NOTIFICATION TOAST */}
      {statusMessage && (
        <div className="absolute top-16 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="text-slate-200">{statusMessage.text}</span>
        </div>
      )}

      {/* SECONDARY TOOLBAR: Visual Editing Tools, Multiple Fonts & Zoom */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800/80 text-xs shrink-0 overflow-x-auto gap-2 z-20">
        <div className="flex items-center gap-1">
          {/* Tool 1: Select & Move */}
          <button
            onClick={() => {
              setActiveTool('select');
              setSelectedElementId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTool === 'select'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={t('pdf_editor_drag_hint', 'Drag to move anywhere. Press Delete to remove.')}
          >
            <Move className="w-3.5 h-3.5" />
            <span>{t('pdf_editor_tool_select', 'Select & Move')}</span>
          </button>

          {/* Tool 2: Add New Text */}
          <button
            onClick={() => setActiveTool('add_text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTool === 'add_text'
                ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={t('pdf_editor_text_hint', 'Click anywhere on the page to insert a custom text box')}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('pdf_editor_tool_add_text', 'Add Text')}</span>
          </button>

          {/* Tool 3: Whiteout (Erase) */}
          <button
            onClick={() => setActiveTool('whiteout')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTool === 'whiteout'
                ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={t('pdf_editor_whiteout_hint', 'Drag over any section to mask it with clean whiteout')}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>{t('pdf_editor_tool_whiteout', 'Whiteout')}</span>
          </button>

          {/* Tool 4: Redact (Blackout) */}
          <button
            onClick={() => setActiveTool('redact')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTool === 'redact'
                ? 'bg-rose-500 text-white font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={t('pdf_editor_redact_hint', 'Drag over confidential text or images to blackout redact')}
          >
            <Square className="w-3.5 h-3.5" />
            <span>{t('pdf_editor_tool_redact', 'Redact')}</span>
          </button>

          {/* Tool 5: Highlight */}
          <button
            onClick={() => setActiveTool('highlight')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTool === 'highlight'
                ? 'bg-yellow-400 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={t('pdf_editor_highlight_hint', 'Drag across lines of text to highlight them')}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>{t('pdf_editor_tool_highlight', 'Highlight')}</span>
          </button>

          {/* Tool 6: Freehand Pen */}
          <button
            onClick={() => setActiveTool('pen')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTool === 'pen'
                ? 'bg-purple-400 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={t('pdf_editor_tool_pen', 'Draw / Pen')}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{t('pdf_editor_tool_pen', 'Pen')}</span>
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Tool 7: Signature & Stamp Modal Trigger */}
          <button
            onClick={() => setShowSigModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-all"
            title={t('pdf_editor_signature_title', 'Signatures & Stamps')}
          >
            <FileSignature className="w-3.5 h-3.5 text-teal-400" />
            <span>{t('pdf_editor_tool_signature', 'Sign & Stamp')}</span>
          </button>

          {/* Tool 8: Watermark Modal Trigger */}
          <button
            onClick={() => setShowWatermarkModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-all"
            title={t('pdf_editor_watermark_text', 'Watermark Text')}
          >
            <Stamp className="w-3.5 h-3.5 text-rose-400" />
            <span>{t('pdf_editor_tool_watermark', 'Watermark')}</span>
          </button>
        </div>

        {/* COMPREHENSIVE FONT SELECTOR & FORMATTING BAR (Active when a text element is selected) */}
        {selectedTextElem && (
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-sky-500/40 shadow-inner">
            <span className="text-[10px] text-sky-400 font-semibold">{t('pdf_editor_font_family', 'Font')}:</span>

            {/* Rich Font Family Dropdown */}
            <div className="relative">
              <select
                value={selectedTextElem.fontFamily || 'Helvetica'}
                onChange={(e) => changeSelectedElementFontFamily(e.target.value as FontFamilyType)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 pr-6 focus:outline-none focus:border-sky-400 cursor-pointer"
                style={{ fontFamily: getCssFontFamily(selectedTextElem.fontFamily) }}
              >
                <optgroup label={t('pdf_editor_font_category_sans', 'Sans-Serif Fonts')}>
                  <option value="Helvetica">Helvetica (Standard)</option>
                  <option value="Arial">Arial</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                </optgroup>
                <optgroup label={t('pdf_editor_font_category_serif', 'Serif Fonts')}>
                  <option value="Times">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Merriweather">Merriweather</option>
                </optgroup>
                <optgroup label={t('pdf_editor_font_category_mono', 'Monospace Fonts')}>
                  <option value="Courier">Courier New</option>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                </optgroup>
                <optgroup label={t('pdf_editor_font_category_display', 'Display & Script Fonts')}>
                  <option value="Impact">Impact (Headline)</option>
                  <option value="Caveat">Caveat (Handwritten / Script)</option>
                </optgroup>
              </select>
            </div>

            {/* Font Size controls */}
            <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => changeSelectedElementFontSize(-2)}
                className="text-slate-400 hover:text-white text-xs px-1"
                title="Decrease font size"
              >
                -
              </button>
              <span className="text-[10px] font-mono text-slate-200">{selectedTextElem.fontSize}pt</span>
              <button
                onClick={() => changeSelectedElementFontSize(2)}
                className="text-slate-400 hover:text-white text-xs px-1"
                title="Increase font size"
              >
                +
              </button>
            </div>

            {/* Bold / Italic */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={toggleSelectedElementBold}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                  selectedTextElem.isBold ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                B
              </button>
              <button
                onClick={toggleSelectedElementItalic}
                className={`px-1.5 py-0.5 text-[10px] italic rounded ${
                  selectedTextElem.isItalic ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                I
              </button>
            </div>
          </div>
        )}

        {/* Zoom & Page Navigation */}
        <div className="flex items-center gap-2">
          {activeTool === 'pen' && (
            <div className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">{t('pdf_editor_pen_color', 'Color')}:</span>
              {['#ef4444', '#3b82f6', '#10b981', '#0f172a', '#f59e0b', '#ffffff'].map(c => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={`w-4 h-4 rounded-full border ${penColor === c ? 'scale-125 border-white ring-2 ring-emerald-400' : 'border-slate-700'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="w-px h-3 bg-slate-800 mx-1" />
              <button
                onClick={() => setDrawingStrokes(prev => prev.filter(s => s.pageIndex !== activePageIndex))}
                className="text-[10px] text-rose-400 hover:underline"
              >
                {t('pdf_editor_clear_drawings', 'Clear')}
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setZoomScale(z => Math.max(0.6, z - 0.15))}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              title={t('pdf_editor_zoom_out', 'Zoom Out')}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 w-12 text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale(z => Math.min(2.5, z + 0.15))}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              title={t('pdf_editor_zoom_in', 'Zoom In')}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomScale(1.0)}
              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white rounded hover:bg-slate-800"
              title={t('pdf_editor_zoom_fit', 'Fit Page')}
            >
              100%
            </button>
          </div>
        </div>
      </div>

      {/* MAIN WORKSPACE: Sidebar Pages Rail + Canvas Document Stage */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT RAIL: Page Thumbnails & Page Management */}
        <div className="w-56 bg-slate-900/60 border-r border-slate-800 flex flex-col shrink-0">
          <div className="px-3 py-2.5 border-b border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {t('pdf_editor_pages_title', 'Document Pages')}
            </span>
            <button
              onClick={() => handleInsertBlankPage(totalPages - 1)}
              className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-all"
              title={t('pdf_editor_add_blank_page', 'Insert Blank Page')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const isActive = idx === activePageIndex;
              const thumbUrl = pageThumbnails[idx];

              return (
                <div
                  key={idx}
                  className={`group relative rounded-xl border p-2 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                  onClick={() => {
                    setActivePageIndex(idx);
                    setSelectedElementId(null);
                    setSelectedDetectedText(null);
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-200">
                      {t('pdf_editor_page_num', `Page ${idx + 1} of ${totalPages}`).split(' ')[0]} {idx + 1}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRotatePage(idx, 90);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                        title={t('pdf_editor_rotate_cw', 'Rotate 90°')}
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicatePage(idx);
                        }}
                        className="p-1 text-slate-400 hover:text-sky-400 rounded hover:bg-slate-700"
                        title={t('pdf_editor_duplicate_page', 'Duplicate Page')}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {totalPages > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePage(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-700"
                          title={t('pdf_editor_delete_page', 'Delete Page')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="w-full aspect-[1/1.414] bg-white rounded-lg overflow-hidden flex items-center justify-center border border-slate-700/50 shadow-sm relative">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-slate-400 text-[10px] font-mono">P.{idx + 1}</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                    <button
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePage(idx, idx - 1);
                      }}
                      className="hover:text-slate-300 disabled:opacity-20"
                      title={t('pdf_editor_move_page_up', 'Move Up')}
                    >
                      ▲
                    </button>
                    <button
                      disabled={idx === totalPages - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMovePage(idx, idx + 1);
                      }}
                      className="hover:text-slate-300 disabled:opacity-20"
                      title={t('pdf_editor_move_page_down', 'Move Down')}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER STAGE: Rendered Document Canvas with Interactive Overlays */}
        <div className="flex-1 overflow-auto bg-slate-950 flex flex-col items-center justify-start p-6 relative">
          {/* Active Tool Help Banner */}
          <div className="sticky top-0 z-20 mb-4 px-4 py-1.5 rounded-full bg-slate-900/95 border border-slate-800 text-xs text-slate-300 shadow-xl backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {activeTool === 'select' && (
              <span>{t('pdf_editor_drag_hint', 'Click and drag to move anywhere. Press Delete to remove.')}</span>
            )}
            {activeTool === 'add_text' && (
              <span>{t('pdf_editor_text_hint', 'Click anywhere on the page to insert a custom text box')}</span>
            )}
            {activeTool === 'whiteout' && (
              <span>{t('pdf_editor_whiteout_hint', 'Drag over any section or text to mask it with clean whiteout')}</span>
            )}
            {activeTool === 'redact' && (
              <span>{t('pdf_editor_redact_hint', 'Drag over confidential text or images to blackout redact')}</span>
            )}
            {activeTool === 'highlight' && (
              <span>{t('pdf_editor_highlight_hint', 'Drag across lines of text to highlight them')}</span>
            )}
            {activeTool === 'pen' && (
              <span>{t('pdf_editor_tool_pen', 'Draw / Pen')}</span>
            )}
          </div>

          {/* Interactive Document Page Container */}
          <div
            ref={stageContainerRef}
            className="relative shadow-2xl rounded-sm transition-transform bg-white overflow-hidden"
            style={{
              width: `${Math.floor(pageSize.width * zoomScale)}px`,
              height: `${Math.floor(pageSize.height * zoomScale)}px`,
              cursor:
                activeTool === 'pen' || activeTool === 'whiteout' || activeTool === 'redact' || activeTool === 'highlight'
                  ? 'crosshair'
                  : activeTool === 'add_text'
                  ? 'text'
                  : 'default',
            }}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
          >
            {/* 1. Underlying PDF.js Render Canvas */}
            <canvas ref={pageCanvasRef} className="absolute inset-0 z-0 pointer-events-none" />

            {/* 2. Detected PDF Text Spans: Selectable, Draggable, and Erasable directly (WITHOUT breaking font on click) */}
            {(activeTool === 'select' || activeTool === 'edit_text') && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                {detectedTexts.map(dt => {
                  const isSelected = selectedDetectedText?.id === dt.id;

                  return (
                    <div
                      key={dt.id}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        e.stopPropagation();
                        setSelectedDetectedText(dt);
                        setSelectedElementId(null);
                        setPendingTextDrag({
                          dt,
                          startX: e.clientX,
                          startY: e.clientY,
                        });
                      }}
                      className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing rounded transition-all group ${
                        isSelected
                          ? 'border-2 border-sky-400 bg-sky-400/20 shadow-md ring-2 ring-sky-400/40'
                          : 'border border-dashed border-sky-400/0 hover:border-sky-400/60 hover:bg-sky-400/10'
                      }`}
                      style={{
                        left: `${dt.x}px`,
                        top: `${dt.y}px`,
                        width: `${dt.width}px`,
                        height: `${dt.height}px`,
                      }}
                      title={`${dt.str} (${dt.fontFamily}) - Click to select, drag to move, or delete`}
                    >
                      {/* Floating contextual quick toolbar for existing text */}
                      {isSelected && (
                        <div
                          className="absolute -top-9 left-0 flex items-center gap-1.5 bg-slate-900 border border-slate-700 text-white px-2 py-1 rounded-lg shadow-2xl text-[11px] font-medium z-40 whitespace-nowrap"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] text-slate-400 px-1 py-0.5 rounded bg-slate-800">
                            {dt.fontFamily} {dt.isBold ? 'Bold' : ''}
                          </span>

                          <div className="w-px h-3 bg-slate-700" />

                          <button
                            onClick={() => {
                              startEditingText({
                                x: dt.x,
                                y: dt.y,
                                width: dt.width,
                                height: dt.height,
                                text: dt.str,
                                fontSize: dt.fontSize,
                                fontFamily: dt.fontFamily,
                                isBold: dt.isBold,
                                isItalic: dt.isItalic,
                                originalText: dt.str,
                                hasWhiteoutBg: true,
                              });
                              setSelectedDetectedText(null);
                            }}
                            className="flex items-center gap-1 hover:text-sky-400 px-1 py-0.5 rounded hover:bg-slate-800"
                            title={t('pdf_editor_tool_edit_text', 'Edit Text')}
                          >
                            <Type className="w-3.5 h-3.5 text-sky-400" />
                            <span>{t('pdf_editor_tool_edit_text', 'Edit')}</span>
                          </button>

                          <div className="w-px h-3 bg-slate-700" />

                          <button
                            onClick={() => handleLiftAndMoveExistingText(dt)}
                            className="flex items-center gap-1 hover:text-emerald-400 px-1 py-0.5 rounded hover:bg-slate-800"
                            title={t('pdf_editor_move_text', 'Move text')}
                          >
                            <Move className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{t('pdf_editor_move_text', 'Move')}</span>
                          </button>

                          <div className="w-px h-3 bg-slate-700" />

                          <button
                            onClick={() => handleEraseExistingText(dt)}
                            className="flex items-center gap-1 hover:text-rose-400 px-1 py-0.5 rounded hover:bg-slate-800"
                            title={t('pdf_editor_erase_text', 'Erase text (Delete key)')}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>{t('pdf_editor_erase_text', 'Erase')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Masks Layer (Whiteouts, Redactions, Highlights) */}
            {elements
              .filter(el => el.pageIndex === activePageIndex && (el.type === 'whiteout' || el.type === 'redact' || el.type === 'highlight'))
              .map(el => {
                const mask = el as MaskElement;
                const isSelected = selectedElementId === mask.id;

                return (
                  <div
                    key={mask.id}
                    onMouseDown={(e) => {
                      if (activeTool !== 'select' || e.button !== 0) return;
                      e.stopPropagation();
                      setSelectedElementId(mask.id);
                      setSelectedDetectedText(null);
                      setDragging({
                        id: mask.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        elemStartX: mask.x,
                        elemStartY: mask.y,
                        hasMoved: false,
                      });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(mask.id);
                    }}
                    className={`absolute z-10 transition-shadow ${
                      isSelected
                        ? 'ring-2 ring-emerald-400 shadow-lg cursor-grab active:cursor-grabbing'
                        : 'cursor-grab hover:ring-1 hover:ring-emerald-400/50'
                    }`}
                    style={{
                      left: `${mask.x}px`,
                      top: `${mask.y}px`,
                      width: `${mask.width}px`,
                      height: `${mask.height}px`,
                      backgroundColor: mask.color,
                      opacity: mask.opacity ?? 1,
                    }}
                  >
                    {isSelected && (
                      <div className="absolute -top-8 right-0 flex items-center gap-1 bg-slate-900 border border-slate-700 text-white px-2 py-0.5 rounded shadow-xl text-[10px] z-30">
                        <span className="text-slate-400 capitalize">{mask.type}</span>
                        <div className="w-px h-3 bg-slate-700" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteElement(mask.id);
                          }}
                          className="hover:text-rose-400 p-0.5"
                          title={t('pdf_editor_delete_element', 'Delete (Delete key)')}
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* 4. Active Drag Box Preview */}
            {dragBox && (
              <div
                className="absolute z-20 pointer-events-none border-2 border-dashed"
                style={{
                  left: `${Math.min(dragBox.startX, dragBox.currentX)}px`,
                  top: `${Math.min(dragBox.startY, dragBox.currentY)}px`,
                  width: `${Math.abs(dragBox.currentX - dragBox.startX)}px`,
                  height: `${Math.abs(dragBox.currentY - dragBox.startY)}px`,
                  backgroundColor:
                    activeTool === 'redact'
                      ? 'rgba(0,0,0,0.85)'
                      : activeTool === 'highlight'
                      ? 'rgba(250, 204, 21, 0.4)'
                      : 'rgba(255,255,255,0.95)',
                  borderColor: activeTool === 'redact' ? '#ef4444' : '#38bdf8',
                }}
              />
            )}

            {/* 5. Text Elements Layer: Fully Draggable, Selectable, Editable with custom font families */}
            {elements
              .filter(el => el.pageIndex === activePageIndex && el.type === 'text')
              .map(el => {
                const textElem = el as TextElement;
                const isSelected = selectedElementId === textElem.id;

                return (
                  <div
                    key={textElem.id}
                    onMouseDown={(e) => {
                      if (activeTool !== 'select' || e.button !== 0) return;
                      e.stopPropagation();
                      setSelectedElementId(textElem.id);
                      setSelectedDetectedText(null);
                      setDragging({
                        id: textElem.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        elemStartX: textElem.x,
                        elemStartY: textElem.y,
                        hasMoved: false,
                      });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(textElem.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEditingText(textElem);
                    }}
                    className={`absolute z-15 group cursor-grab active:cursor-grabbing rounded ${
                      isSelected
                        ? 'ring-2 ring-sky-400 shadow-xl bg-sky-50/80'
                        : 'hover:outline hover:outline-1 hover:outline-sky-400'
                    }`}
                    style={{
                      left: `${textElem.x}px`,
                      top: `${textElem.y}px`,
                      backgroundColor: textElem.hasWhiteoutBg ? '#ffffff' : isSelected ? 'rgba(240, 249, 255, 0.9)' : 'transparent',
                      padding: '2px 4px',
                      color: textElem.color,
                      fontSize: `${textElem.fontSize}px`,
                      fontFamily: getCssFontFamily(textElem.fontFamily),
                      fontWeight: textElem.isBold ? 700 : 400,
                      fontStyle: textElem.isItalic ? 'italic' : 'normal',
                      lineHeight: '1.2',
                    }}
                  >
                    <span>{textElem.text}</span>

                    {/* Floating contextual action toolbar for active text */}
                    {isSelected && (
                      <div
                        className="absolute -top-8 left-0 flex items-center gap-1.5 bg-slate-900 border border-slate-700 text-white px-2 py-0.5 rounded shadow-xl text-[11px] z-40 whitespace-nowrap"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <GripHorizontal className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] text-slate-400">{textElem.fontFamily || 'Helvetica'}</span>

                        <div className="w-px h-3 bg-slate-700" />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingText(textElem);
                          }}
                          className="hover:text-sky-400 p-0.5 flex items-center gap-1"
                          title={t('pdf_editor_tool_edit_text', 'Edit')}
                        >
                          <Type className="w-3 h-3 text-sky-400" />
                          <span>{t('pdf_editor_tool_edit_text', 'Edit')}</span>
                        </button>
                        <div className="w-px h-3 bg-slate-700" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteElement(textElem.id);
                          }}
                          className="hover:text-rose-400 p-0.5 flex items-center gap-1"
                          title={t('pdf_editor_delete_element', 'Delete (Delete key)')}
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>{t('pdf_editor_delete_element', 'Delete')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* 6. Images, Signatures, and Stamps: Draggable and Selectable */}
            {elements
              .filter(el => el.pageIndex === activePageIndex && el.type === 'image')
              .map(el => {
                const imgElem = el as ImageElement;
                const isSelected = selectedElementId === imgElem.id;

                return (
                  <div
                    key={imgElem.id}
                    onMouseDown={(e) => {
                      if (activeTool !== 'select' || e.button !== 0) return;
                      e.stopPropagation();
                      setSelectedElementId(imgElem.id);
                      setSelectedDetectedText(null);
                      setDragging({
                        id: imgElem.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        elemStartX: imgElem.x,
                        elemStartY: imgElem.y,
                        hasMoved: false,
                      });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElementId(imgElem.id);
                    }}
                    className={`absolute z-15 cursor-grab active:cursor-grabbing rounded ${
                      isSelected ? 'ring-2 ring-emerald-400 shadow-xl' : 'hover:outline hover:outline-1 hover:outline-slate-400'
                    }`}
                    style={{
                      left: `${imgElem.x}px`,
                      top: `${imgElem.y}px`,
                      width: `${imgElem.width}px`,
                      height: `${imgElem.height}px`,
                    }}
                  >
                    <img
                      src={imgElem.dataUrl}
                      alt="Annotation"
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />

                    {isSelected && (
                      <div className="absolute -top-8 right-0 flex items-center gap-1 bg-slate-900 border border-slate-700 text-white px-2 py-0.5 rounded shadow-xl text-[10px] z-30">
                        <span className="text-slate-400">{imgElem.label || 'Image'}</span>
                        <div className="w-px h-3 bg-slate-700" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteElement(imgElem.id);
                          }}
                          className="hover:text-rose-400 p-0.5"
                          title={t('pdf_editor_delete_element', 'Delete (Delete key)')}
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* 7. Freehand Pen Drawing Strokes */}
            <svg className="absolute inset-0 z-15 pointer-events-none w-full h-full">
              {drawingStrokes
                .filter(s => s.pageIndex === activePageIndex)
                .map(stroke => (
                  <path
                    key={stroke.id}
                    d={stroke.points.reduce(
                      (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
                      ''
                    )}
                    stroke={stroke.color}
                    strokeWidth={stroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}

              {currentStroke && currentStroke.length > 1 && (
                <path
                  d={currentStroke.reduce(
                    (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
                    ''
                  )}
                  stroke={penColor}
                  strokeWidth={penWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* MODAL 1: In-Place Text Editor Modal with 12+ Font Families */}
      {editingTextElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-sky-400" />
                <span className="font-semibold text-sm">
                  {editingTextElement.originalText
                    ? t('pdf_editor_tool_edit_text', 'Edit / Replace Text')
                    : t('pdf_editor_tool_add_text', 'Add Text')}
                </span>
              </div>
              <button
                onClick={() => setEditingTextElement(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {editingTextElement.originalText && (
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">
                    {t('pdf_editor_original_text', 'Original text')}:
                  </span>
                  <p className="text-xs font-mono text-slate-300 italic">{editingTextElement.originalText}</p>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {t('pdf_editor_replacement_text', 'Replacement text')}:
                </label>
                <textarea
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
                  placeholder={t('pdf_editor_text_content', 'Text content')}
                  style={{
                    fontFamily: getCssFontFamily(textFontFamily),
                    fontWeight: textIsBold ? 700 : 400,
                    fontStyle: textIsItalic ? 'italic' : 'normal',
                  }}
                  autoFocus
                />
              </div>

              {/* Rich Font Family Selection Grid with Typography Previews */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">
                  {t('pdf_editor_font_family', 'Font Family')}:
                </label>
                <div className="max-h-48 overflow-y-auto pr-1 space-y-2 border border-slate-800/80 rounded-xl p-2 bg-slate-950/50">
                  {/* Category: Sans-Serif */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 px-1">
                      {t('pdf_editor_font_category_sans', 'Sans-Serif Fonts')}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AVAILABLE_FONTS.filter(f => f.category === 'sans').map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTextFontFamily(f.id)}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                            textFontFamily === f.id
                              ? 'border-sky-400 bg-sky-500/20 text-white font-semibold'
                              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xs truncate" style={{ fontFamily: f.cssFont }}>
                            {f.label}
                          </span>
                          <span className="text-[11px] opacity-70 font-bold" style={{ fontFamily: f.cssFont }}>
                            Aa
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category: Serif */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 px-1">
                      {t('pdf_editor_font_category_serif', 'Serif Fonts')}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AVAILABLE_FONTS.filter(f => f.category === 'serif').map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTextFontFamily(f.id)}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                            textFontFamily === f.id
                              ? 'border-sky-400 bg-sky-500/20 text-white font-semibold'
                              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xs truncate" style={{ fontFamily: f.cssFont }}>
                            {f.label}
                          </span>
                          <span className="text-[11px] opacity-70 font-bold" style={{ fontFamily: f.cssFont }}>
                            Aa
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category: Monospace */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 px-1">
                      {t('pdf_editor_font_category_mono', 'Monospace Fonts')}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AVAILABLE_FONTS.filter(f => f.category === 'mono').map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTextFontFamily(f.id)}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                            textFontFamily === f.id
                              ? 'border-sky-400 bg-sky-500/20 text-white font-semibold'
                              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xs truncate" style={{ fontFamily: f.cssFont }}>
                            {f.label}
                          </span>
                          <span className="text-[11px] opacity-70 font-mono font-bold" style={{ fontFamily: f.cssFont }}>
                            Aa
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category: Display & Script */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 px-1">
                      {t('pdf_editor_font_category_display', 'Display & Script Fonts')}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AVAILABLE_FONTS.filter(f => f.category === 'display').map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTextFontFamily(f.id)}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                            textFontFamily === f.id
                              ? 'border-sky-400 bg-sky-500/20 text-white font-semibold'
                              : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="text-xs truncate" style={{ fontFamily: f.cssFont }}>
                            {f.label}
                          </span>
                          <span className="text-sm font-bold" style={{ fontFamily: f.cssFont }}>
                            Aa
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Formatting Controls */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    {t('pdf_editor_font_size', 'Font Size')}: {textFontSize}pt
                  </label>
                  <input
                    type="range"
                    min={8}
                    max={48}
                    value={textFontSize}
                    onChange={(e) => setTextFontSize(Number(e.target.value))}
                    className="w-full accent-sky-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    {t('pdf_editor_text_color', 'Text Color')}
                  </label>
                  <div className="flex items-center gap-1.5">
                    {['#0f172a', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#ffffff'].map(c => (
                      <button
                        key={c}
                        onClick={() => setTextColor(c)}
                        className={`w-5 h-5 rounded-full border ${textColor === c ? 'scale-125 border-sky-400 ring-2 ring-sky-400/50' : 'border-slate-700'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTextIsBold(!textIsBold)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${textIsBold ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
                  >
                    B
                  </button>
                  <button
                    onClick={() => setTextIsItalic(!textIsItalic)}
                    className={`px-3 py-1 rounded-lg text-xs italic transition-colors ${textIsItalic ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
                  >
                    I
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={textHasWhiteout}
                    onChange={(e) => setTextHasWhiteout(e.target.checked)}
                    className="rounded accent-sky-400"
                  />
                  <span>{t('pdf_editor_whiteout_bg', 'White Mask (Cover old text)')}</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingTextElement(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                {t('pdf_editor_cancel', 'Cancel')}
              </button>
              <button
                onClick={saveEditingText}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-xl shadow-md transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{t('pdf_editor_apply_edit', 'Apply')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Signature & Stamps Modal */}
      {showSigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-teal-400" />
                <span className="font-semibold text-sm">{t('pdf_editor_signature_title', 'Signatures & Stamps')}</span>
              </div>
              <button
                onClick={() => setShowSigModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl mt-4">
              <button
                onClick={() => setSigMode('draw')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  sigMode === 'draw' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('pdf_editor_draw_signature', 'Draw')}
              </button>
              <button
                onClick={() => setSigMode('stamps')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  sigMode === 'stamps' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('pdf_editor_quick_stamps', 'Quick Stamps')}
              </button>
              <button
                onClick={() => setSigMode('upload')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  sigMode === 'upload' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('pdf_editor_upload_signature', 'Upload Image')}
              </button>
            </div>

            {sigMode === 'draw' && (
              <div className="mt-4 space-y-3">
                <div className="border border-slate-700 bg-white rounded-xl overflow-hidden shadow-inner">
                  <canvas
                    ref={sigCanvasRef}
                    width={440}
                    height={160}
                    className="w-full h-40 cursor-crosshair bg-white touch-none"
                    onMouseDown={handleSigMouseDown}
                    onMouseMove={handleSigMouseMove}
                    onMouseUp={handleSigMouseUp}
                    onMouseLeave={handleSigMouseUp}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 italic">Sign using mouse or touch screen</span>
                  <button
                    onClick={clearSigCanvas}
                    className="text-rose-400 hover:underline"
                  >
                    {t('pdf_editor_clear_signature', 'Clear')}
                  </button>
                </div>
              </div>
            )}

            {sigMode === 'stamps' && (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {stampPresets.map((st, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const dataUrl = createStampDataUrl(st.label, st.color, st.bg);
                      handleInsertSignature(dataUrl, st.label);
                    }}
                    className="p-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950 flex flex-col items-center justify-center gap-1 transition-all group"
                  >
                    <div
                      className="px-3 py-1 rounded font-bold text-xs uppercase border tracking-wider"
                      style={{ borderColor: st.color, color: st.color, backgroundColor: st.bg }}
                    >
                      {st.label}
                    </div>
                    <span className="text-[10px] text-slate-500 group-hover:text-slate-400">Click to place</span>
                  </button>
                ))}
              </div>
            )}

            {sigMode === 'upload' && (
              <div className="mt-4 p-6 border-2 border-dashed border-slate-800 rounded-xl text-center">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  id="sig-file-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        handleInsertSignature(reader.result, 'Uploaded signature');
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <label
                  htmlFor="sig-file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <Upload className="w-8 h-8 text-teal-400" />
                  <span className="text-xs font-medium text-slate-300">
                    {t('pdf_editor_upload_signature', 'Upload Image')} (PNG / JPG)
                  </span>
                  <span className="text-[10px] text-slate-500">Transparent PNG recommended</span>
                </label>
              </div>
            )}

            {sigMode === 'draw' && (
              <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowSigModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  {t('pdf_editor_cancel', 'Cancel')}
                </button>
                <button
                  onClick={() => {
                    const canvas = sigCanvasRef.current;
                    if (!canvas) return;
                    const dataUrl = canvas.toDataURL('image/png');
                    handleInsertSignature(dataUrl, 'Digital Signature');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl shadow-md transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{t('pdf_editor_insert_signature', 'Place Signature')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Watermark Settings Modal */}
      {showWatermarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Stamp className="w-4 h-4 text-rose-400" />
                <span className="font-semibold text-sm">{t('pdf_editor_tool_watermark', 'Watermark')}</span>
              </div>
              <button
                onClick={() => setShowWatermarkModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {t('pdf_editor_watermark_text', 'Watermark Text')}:
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2 text-sm text-slate-100 uppercase"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {t('pdf_editor_watermark_opacity', 'Opacity')}: {Math.round(watermarkOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min={0.05}
                  max={0.6}
                  step={0.05}
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                  className="w-full accent-rose-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {t('pdf_editor_watermark_rotation', 'Angle')}
                </label>
                <div className="flex items-center gap-2">
                  {[-45, 0, 45].map(deg => (
                    <button
                      key={deg}
                      onClick={() => setWatermarkRotation(deg as -45 | 0 | 45)}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                        watermarkRotation === deg ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowWatermarkModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                {t('pdf_editor_cancel', 'Cancel')}
              </button>
              <button
                onClick={handleApplyWatermark}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-rose-400 hover:bg-rose-300 rounded-xl shadow-md transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{t('pdf_editor_apply_watermark', 'Apply Watermark')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
