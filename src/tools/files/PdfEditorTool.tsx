import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PDFDocument,
  rgb,
  degrees,
  StandardFonts,
  PDFFont,
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
  Square,
  Highlighter,
  FilePlus,
  Undo2,
  Redo2,
  Check,
  X,
  FileSignature,
  GripHorizontal,
  ImagePlus,
  Layers,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { saveBinaryWithDialog } from '../../services/fileSystemService';
import {
  DetectedImageObject,
  IDENTITY_MATRIX,
  Matrix,
  findColorForViewportBbox,
  inspectPageInternalObjects,
  removeContentInRectFromPdf,
  removeSpecificImageFromPdf,
  removeTextSpanFromPdf,
} from './pdfContentEngine';

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

export type EraseSubMode = 'clean' | 'whiteout';

export type FontFamilyType =
  | 'Helvetica'
  | 'Arial'
  | 'Plus Jakarta Sans'
  | 'Verdana'
  | 'Trebuchet MS'
  | 'Times'
  | 'Georgia'
  | 'Playfair Display'
  | 'Merriweather'
  | 'Courier'
  | 'JetBrains Mono'
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
  { id: 'Helvetica', label: 'Helvetica / Standard', category: 'sans', cssFont: 'Helvetica, Arial, sans-serif', standardPdfFont: 'Helvetica' },
  { id: 'Arial', label: 'Arial', category: 'sans', cssFont: 'Arial, "Helvetica Neue", sans-serif', standardPdfFont: 'Helvetica' },
  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'sans', cssFont: '"Plus Jakarta Sans", sans-serif', standardPdfFont: 'Helvetica' },
  { id: 'Verdana', label: 'Verdana', category: 'sans', cssFont: 'Verdana, Geneva, sans-serif', standardPdfFont: 'Helvetica' },
  { id: 'Trebuchet MS', label: 'Trebuchet MS', category: 'sans', cssFont: '"Trebuchet MS", sans-serif', standardPdfFont: 'Helvetica' },
  { id: 'Times', label: 'Times New Roman', category: 'serif', cssFont: '"Times New Roman", Times, serif', standardPdfFont: 'Times' },
  { id: 'Georgia', label: 'Georgia', category: 'serif', cssFont: 'Georgia, serif', standardPdfFont: 'Times' },
  { id: 'Playfair Display', label: 'Playfair Display', category: 'serif', cssFont: '"Playfair Display", Georgia, serif', standardPdfFont: 'Times' },
  { id: 'Merriweather', label: 'Merriweather', category: 'serif', cssFont: 'Merriweather, serif', standardPdfFont: 'Times' },
  { id: 'Courier', label: 'Courier New', category: 'mono', cssFont: '"Courier New", Courier, monospace', standardPdfFont: 'Courier' },
  { id: 'JetBrains Mono', label: 'JetBrains Mono', category: 'mono', cssFont: '"JetBrains Mono", Consolas, monospace', standardPdfFont: 'Courier' },
  { id: 'Impact', label: 'Impact (Headline)', category: 'display', cssFont: 'Impact, "Arial Black", sans-serif', standardPdfFont: 'Helvetica', renderAsImageOnExport: true },
  { id: 'Caveat', label: 'Caveat (Handwritten / Script)', category: 'display', cssFont: 'Caveat, "Dancing Script", cursive', standardPdfFont: 'Times', renderAsImageOnExport: true },
];

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
  colorHex: string;
}

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
  sourceDetectedText?: DetectedTextSpan;
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
  opacity?: number;
  rotation?: number;
  naturalRatio?: number;
}

export interface DrawingStroke {
  id: string;
  pageIndex: number;
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export type AnnotationElement = TextElement | MaskElement | ImageElement;

interface HistorySnapshot {
  pdfBytes: Uint8Array;
  elements: AnnotationElement[];
  strokes: DrawingStroke[];
}

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

const hexToRgbTuple = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return [r, g, b];
    }
  }
  return [0.06, 0.09, 0.16];
};

const sanitizeForPdf = (text: string): string => {
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
};

const canFontEncodeWinAnsi = (font: PDFFont, text: string): boolean => {
  try {
    font.encodeText(text);
    return true;
  } catch {
    return false;
  }
};

const getCssFontFamily = (family?: FontFamilyType) => {
  const found = AVAILABLE_FONTS.find(f => f.id === family);
  return found ? found.cssFont : 'Helvetica, Arial, sans-serif';
};

const clonePdfBytes = (data: Uint8Array | ArrayBuffer): Uint8Array => {
  if (data instanceof Uint8Array) {
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    return copy;
  }
  const uint = new Uint8Array(data);
  const copy = new Uint8Array(uint.byteLength);
  copy.set(uint);
  return copy;
};

const imageDataUrlToPngDataUrl = (dataUrl: string, rotationDeg = 0): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const rot = ((rotationDeg % 360) + 360) % 360;
      const swap = rot === 90 || rot === 270;
      const w = img.naturalWidth || img.width || 200;
      const h = img.naturalHeight || img.height || 200;
      const canvas = document.createElement('canvas');
      canvas.width = swap ? h : w;
      canvas.height = swap ? w : h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });

const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 200, height: img.naturalHeight || 200 });
    img.onerror = () => reject(new Error('Invalid image file'));
    img.src = dataUrl;
  });

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
  const [viewportTransform, setViewportTransform] = useState<Matrix>(IDENTITY_MATRIX);

  // Tool & selection state
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [eraseSubMode, setEraseSubMode] = useState<EraseSubMode>('clean');
  const [zoomScale, setZoomScale] = useState<number>(1.2);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Staged annotations list (all coordinates in unscaled 1.0x PDF points!)
  const [elements, setElements] = useState<AnnotationElement[]>([]);
  const [drawingStrokes, setDrawingStrokes] = useState<DrawingStroke[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedDetectedText, setSelectedDetectedText] = useState<DetectedTextSpan | null>(null);
  const [selectedDetectedImage, setSelectedDetectedImage] = useState<DetectedImageObject | null>(null);

  // Mouse Dragging / Resizing State (positions in PDF points)
  const [dragging, setDragging] = useState<{
    id: string;
    startX: number;
    startY: number;
    elemStartX: number;
    elemStartY: number;
    hasMoved: boolean;
  } | null>(null);

  const [resizingImage, setResizingImage] = useState<{
    id: string;
    corner: ResizeCorner;
    startX: number;
    startY: number;
    startBox: { x: number; y: number; width: number; height: number };
    aspectRatio: number;
  } | null>(null);

  // Pending drag for detected PDF text
  const [pendingTextDrag, setPendingTextDrag] = useState<{
    dt: DetectedTextSpan;
    startX: number;
    startY: number;
  } | null>(null);
  const isLiftingTextRef = useRef(false);

  // Unified History stack for Undo/Redo (tracks both internal PDF bytes & staged overlays)
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Detected text & embedded images on current page
  const [detectedTexts, setDetectedTexts] = useState<DetectedTextSpan[]>([]);
  const [detectedImages, setDetectedImages] = useState<DetectedImageObject[]>([]);

  // In-line Text Editor modal
  const [editingTextElement, setEditingTextElement] = useState<TextElement | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>('');
  const [textFontSize, setTextFontSize] = useState<number>(14);
  const [textFontFamily, setTextFontFamily] = useState<FontFamilyType>('Helvetica');
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [textIsBold, setTextIsBold] = useState<boolean>(false);
  const [textIsItalic, setTextIsItalic] = useState<boolean>(false);
  const [textHasWhiteout, setTextHasWhiteout] = useState<boolean>(false);

  // Erase / Redact / Highlight drag box (in PDF points)
  const [dragBox, setDragBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Pen state
  const [penColor, setPenColor] = useState<string>('#ef4444');
  const [penWidth] = useState<number>(3);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[] | null>(null);

  // Modals
  const [showSigModal, setShowSigModal] = useState(false);
  const [sigMode, setSigMode] = useState<'draw' | 'upload' | 'stamps'>('draw');
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);

  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.2);
  const [watermarkRotation, setWatermarkRotation] = useState<-45 | 0 | 45>(-45);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // DOM Refs
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const initialLoadRef = useRef(false);

  const showNotification = useCallback((type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  }, []);

  // Push full snapshot to Undo/Redo history
  const pushSnapshot = useCallback(
    (newPdfBytes: Uint8Array, newElements: AnnotationElement[], newStrokes: DrawingStroke[]) => {
      const snapshot: HistorySnapshot = {
        pdfBytes: clonePdfBytes(newPdfBytes),
        elements: newElements,
        strokes: newStrokes,
      };
      setHistory(prev => {
        const upToCurrent = prev.slice(0, historyIndex + 1);
        return [...upToCurrent, snapshot].slice(-30);
      });
      setHistoryIndex(prev => Math.min(prev + 1, 29));
    },
    [historyIndex]
  );

  // Handle Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setCurrentPdfBytes(clonePdfBytes(target.pdfBytes));
      setElements(target.elements);
      setDrawingStrokes(target.strokes);
      setHistoryIndex(historyIndex - 1);
      setSelectedElementId(null);
      setSelectedDetectedText(null);
      setSelectedDetectedImage(null);
    }
  }, [history, historyIndex]);

  // Handle Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setCurrentPdfBytes(clonePdfBytes(target.pdfBytes));
      setElements(target.elements);
      setDrawingStrokes(target.strokes);
      setHistoryIndex(historyIndex + 1);
      setSelectedElementId(null);
      setSelectedDetectedText(null);
      setSelectedDetectedImage(null);
    }
  }, [history, historyIndex]);

  // Generate thumbnail previews for all pages
  const generateThumbnails = useCallback(async (pdfBytes: Uint8Array) => {
    if (!pdfBytes || pdfBytes.byteLength === 0) return;
    try {
      const dataCopy = clonePdfBytes(pdfBytes);
      const loadingTask = pdfjsLib.getDocument({ data: dataCopy });
      const pdf = await loadingTask.promise;
      const thumbs: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.22 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
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

  // Delete an annotation element
  const handleDeleteElement = useCallback(
    (id: string) => {
      if (!currentPdfBytes) return;
      const nextElements = elements.filter(el => el.id !== id);
      setElements(nextElements);
      pushSnapshot(currentPdfBytes, nextElements, drawingStrokes);
      setSelectedElementId(null);
    },
    [currentPdfBytes, elements, drawingStrokes, pushSnapshot]
  );

  // TRUE DELETE: Permanently remove detected text from PDF internal content stream
  const handleEraseExistingText = useCallback(
    async (dt: DetectedTextSpan) => {
      if (!currentPdfBytes) return;
      try {
        setIsProcessing(true);
        const { updatedBytes, removedCount } = await removeTextSpanFromPdf(
          clonePdfBytes(currentPdfBytes),
          activePageIndex,
          { x: dt.x, y: dt.y, width: dt.width, height: dt.height },
          dt.str,
          viewportTransform
        );

        if (removedCount === 0) {
          showNotification('error', t('pdf_editor_nothing_found_in_area', 'No editable PDF objects found in this area — use White Cover for scanned pages'));
          return;
        }

        const safeBytes = clonePdfBytes(updatedBytes);
        setCurrentPdfBytes(safeBytes);
        pushSnapshot(safeBytes, elements, drawingStrokes);
        setSelectedDetectedText(null);
        generateThumbnails(safeBytes);
        showNotification('success', t('pdf_editor_text_erased', 'Text permanently deleted from PDF'));
      } catch (err) {
        console.error('Failed to delete text from PDF stream:', err);
        showNotification('error', `${t('pdf_editor_error_processing', 'Error processing document: ')} ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [currentPdfBytes, activePageIndex, viewportTransform, elements, drawingStrokes, pushSnapshot, generateThumbnails, showNotification, t]
  );

  // TRUE DELETE + LIFT: Remove existing text from internal PDF content stream and turn into movable TextElement
  const handleLiftAndMoveExistingText = useCallback(
    async (dt: DetectedTextSpan, clientX?: number, clientY?: number) => {
      if (!currentPdfBytes || isLiftingTextRef.current) return;
      isLiftingTextRef.current = true;
      try {
        const { updatedBytes, detectedColorHex } = await removeTextSpanFromPdf(
          clonePdfBytes(currentPdfBytes),
          activePageIndex,
          { x: dt.x, y: dt.y, width: dt.width, height: dt.height },
          dt.str,
          viewportTransform
        );

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
          color: dt.colorHex || detectedColorHex || '#0f172a',
          isBold: dt.isBold,
          isItalic: dt.isItalic,
          hasWhiteoutBg: false,
          originalText: dt.str,
        };

        const safeBytes = clonePdfBytes(updatedBytes);
        const nextElements = [...elements, newTextElem];
        setCurrentPdfBytes(safeBytes);
        setElements(nextElements);
        pushSnapshot(safeBytes, nextElements, drawingStrokes);
        setSelectedElementId(textId);
        setSelectedDetectedText(null);
        generateThumbnails(safeBytes);

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
      } catch (err) {
        console.error('Failed to lift text from PDF:', err);
      } finally {
        isLiftingTextRef.current = false;
      }
    },
    [currentPdfBytes, activePageIndex, viewportTransform, elements, drawingStrokes, pushSnapshot, generateThumbnails]
  );

  // TRUE DELETE of embedded image inside PDF
  const handleDeleteEmbeddedImage = useCallback(
    async (imgObj: DetectedImageObject) => {
      if (!currentPdfBytes) return;
      try {
        setIsProcessing(true);
        const { updatedBytes, removed } = await removeSpecificImageFromPdf(
          clonePdfBytes(currentPdfBytes),
          activePageIndex,
          imgObj,
          viewportTransform
        );
        if (!removed) return;

        const safeBytes = clonePdfBytes(updatedBytes);
        setCurrentPdfBytes(safeBytes);
        pushSnapshot(safeBytes, elements, drawingStrokes);
        setSelectedDetectedImage(null);
        generateThumbnails(safeBytes);
        showNotification('success', t('pdf_editor_image_deleted', 'Image permanently removed from PDF'));
      } catch (err) {
        console.error('Failed to delete embedded image:', err);
        showNotification('error', `${t('pdf_editor_error_processing', 'Error processing document: ')} ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [currentPdfBytes, activePageIndex, viewportTransform, elements, drawingStrokes, pushSnapshot, generateThumbnails, showNotification, t]
  );

  // Lift an embedded PDF image to a movable/resizable ImageElement and delete original Do op
  const handleLiftEmbeddedImage = useCallback(
    async (imgObj: DetectedImageObject) => {
      if (!currentPdfBytes || !pageCanvasRef.current) return;
      try {
        setIsProcessing(true);
        // Render page at 2x without overlays to extract clean pixels for the image region
        const loadingTask = pdfjsLib.getDocument({ data: clonePdfBytes(currentPdfBytes) });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(activePageIndex + 1);
        const extractScale = 2.5;
        const vp = page.getViewport({ scale: extractScale });
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = Math.ceil(vp.width);
        fullCanvas.height = Math.ceil(vp.height);
        const fCtx = fullCanvas.getContext('2d');
        if (!fCtx) return;
        await page.render({ canvasContext: fCtx, viewport: vp }).promise;

        const sx = Math.max(0, Math.floor(imgObj.viewportBbox.x * extractScale));
        const sy = Math.max(0, Math.floor(imgObj.viewportBbox.y * extractScale));
        const sw = Math.max(4, Math.ceil(imgObj.viewportBbox.width * extractScale));
        const sh = Math.max(4, Math.ceil(imgObj.viewportBbox.height * extractScale));

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = sw;
        cropCanvas.height = sh;
        const cCtx = cropCanvas.getContext('2d');
        if (!cCtx) return;
        cCtx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
        const dataUrl = cropCanvas.toDataURL('image/png');

        const { updatedBytes, removed } = await removeSpecificImageFromPdf(
          clonePdfBytes(currentPdfBytes),
          activePageIndex,
          imgObj,
          viewportTransform
        );
        if (!removed) return;

        const newImgId = `img-lifted-${Date.now()}`;
        const newImgElem: ImageElement = {
          id: newImgId,
          type: 'image',
          pageIndex: activePageIndex,
          x: imgObj.viewportBbox.x,
          y: imgObj.viewportBbox.y,
          width: imgObj.viewportBbox.width,
          height: imgObj.viewportBbox.height,
          dataUrl,
          label: t('pdf_editor_embedded_image', 'PDF Image'),
          opacity: 1,
          rotation: 0,
          naturalRatio: imgObj.viewportBbox.width / Math.max(1, imgObj.viewportBbox.height),
        };

        const safeBytes = clonePdfBytes(updatedBytes);
        const nextElements = [...elements, newImgElem];
        setCurrentPdfBytes(safeBytes);
        setElements(nextElements);
        pushSnapshot(safeBytes, nextElements, drawingStrokes);
        setSelectedDetectedImage(null);
        setSelectedElementId(newImgId);
        generateThumbnails(safeBytes);
      } catch (err) {
        console.error('Failed to lift embedded image:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [currentPdfBytes, activePageIndex, viewportTransform, elements, drawingStrokes, pushSnapshot, generateThumbnails, t]
  );

  // Add a new image onto the current page (preserving natural aspect ratio)
  const handleAddImageDataUrl = useCallback(
    async (dataUrl: string, label?: string, dropPoint?: { x: number; y: number }) => {
      if (!currentPdfBytes) return;
      try {
        const dims = await getImageDimensions(dataUrl);
        const ratio = dims.width / Math.max(1, dims.height);
        const maxInitWidth = Math.min(240, pageSize.width * 0.45);
        const width = Math.max(40, Math.min(maxInitWidth, dims.width));
        const height = width / ratio;

        const x = dropPoint
          ? Math.max(0, Math.min(pageSize.width - width, dropPoint.x - width / 2))
          : Math.max(20, (pageSize.width - width) / 2);
        const y = dropPoint
          ? Math.max(0, Math.min(pageSize.height - height, dropPoint.y - height / 2))
          : Math.max(20, (pageSize.height - height) / 2);

        const newImgElem: ImageElement = {
          id: `img-${Date.now()}`,
          type: 'image',
          pageIndex: activePageIndex,
          x,
          y,
          width,
          height,
          dataUrl,
          label: label || t('pdf_editor_image_label', 'Image'),
          opacity: 1,
          rotation: 0,
          naturalRatio: ratio,
        };

        const nextElements = [...elements, newImgElem];
        setElements(nextElements);
        pushSnapshot(currentPdfBytes, nextElements, drawingStrokes);
        setSelectedElementId(newImgElem.id);
        setSelectedDetectedText(null);
        setSelectedDetectedImage(null);
        setActiveTool('select');
        showNotification('success', t('pdf_editor_image_added', 'Image added to page'));
      } catch (err) {
        showNotification('error', `${t('pdf_editor_error_processing', 'Error processing document: ')} ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [currentPdfBytes, pageSize, activePageIndex, elements, drawingStrokes, pushSnapshot, showNotification, t]
  );

  const handleImageFileSelected = useCallback(
    (file: File, dropPoint?: { x: number; y: number }) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleAddImageDataUrl(reader.result, file.name, dropPoint);
        }
      };
      reader.readAsDataURL(file);
    },
    [handleAddImageDataUrl]
  );

  // Global mousemove and mouseup listeners for dragging and corner resizing
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (pendingTextDrag) {
        const dist = Math.hypot(e.clientX - pendingTextDrag.startX, e.clientY - pendingTextDrag.startY);
        if (dist > 6) {
          const targetDt = pendingTextDrag.dt;
          setPendingTextDrag(null);
          handleLiftAndMoveExistingText(targetDt, e.clientX, e.clientY);
          return;
        }
      }

      if (resizingImage) {
        const dx = (e.clientX - resizingImage.startX) / zoomScale;
        const dy = (e.clientY - resizingImage.startY) / zoomScale;
        const sb = resizingImage.startBox;
        const keepAspect = !e.shiftKey;

        let nextX = sb.x;
        let nextY = sb.y;
        let nextW = sb.width;
        let nextH = sb.height;

        if (resizingImage.corner === 'se') {
          nextW = Math.max(24, sb.width + dx);
          nextH = keepAspect ? nextW / resizingImage.aspectRatio : Math.max(24, sb.height + dy);
        } else if (resizingImage.corner === 'sw') {
          nextW = Math.max(24, sb.width - dx);
          nextH = keepAspect ? nextW / resizingImage.aspectRatio : Math.max(24, sb.height + dy);
          nextX = sb.x + (sb.width - nextW);
        } else if (resizingImage.corner === 'ne') {
          nextW = Math.max(24, sb.width + dx);
          nextH = keepAspect ? nextW / resizingImage.aspectRatio : Math.max(24, sb.height - dy);
          nextY = sb.y + (sb.height - nextH);
        } else if (resizingImage.corner === 'nw') {
          nextW = Math.max(24, sb.width - dx);
          nextH = keepAspect ? nextW / resizingImage.aspectRatio : Math.max(24, sb.height - dy);
          nextX = sb.x + (sb.width - nextW);
          nextY = sb.y + (sb.height - nextH);
        }

        setElements(prev =>
          prev.map(el =>
            el.id === resizingImage.id && el.type === 'image'
              ? {
                  ...el,
                  x: Math.max(0, nextX),
                  y: Math.max(0, nextY),
                  width: Math.min(pageSize.width, nextW),
                  height: Math.min(pageSize.height, nextH),
                }
              : el
          )
        );
        return;
      }

      if (!dragging) return;
      const dx = (e.clientX - dragging.startX) / zoomScale;
      const dy = (e.clientY - dragging.startY) / zoomScale;

      if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) {
        setDragging(prev => (prev ? { ...prev, hasMoved: true } : null));
      }

      setElements(prev =>
        prev.map(el =>
          el.id === dragging.id
            ? {
                ...el,
                x: Math.max(0, Math.min(pageSize.width - 15, dragging.elemStartX + dx)),
                y: Math.max(0, Math.min(pageSize.height - 15, dragging.elemStartY + dy)),
              }
            : el
        )
      );
    };

    const onMouseUp = () => {
      if (pendingTextDrag) {
        setPendingTextDrag(null);
      }
      if (resizingImage && currentPdfBytes) {
        pushSnapshot(currentPdfBytes, elements, drawingStrokes);
        setResizingImage(null);
      }
      if (dragging) {
        if (dragging.hasMoved && currentPdfBytes) {
          pushSnapshot(currentPdfBytes, elements, drawingStrokes);
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
  }, [
    dragging,
    resizingImage,
    pendingTextDrag,
    elements,
    drawingStrokes,
    currentPdfBytes,
    pageSize,
    zoomScale,
    handleLiftAndMoveExistingText,
    pushSnapshot,
  ]);

  // Keyboard shortcuts (Delete, Undo, Redo, Arrow nudge) & Image Paste (Ctrl+V)
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
        } else if (selectedDetectedImage) {
          e.preventDefault();
          handleDeleteEmbeddedImage(selectedDetectedImage);
        }
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedElementId) {
        e.preventDefault();
        const step = e.shiftKey ? 8 : 1.5;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        setElements(prev =>
          prev.map(el => (el.id === selectedElementId ? { ...el, x: el.x + dx, y: el.y + dy } : el))
        );
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            handleImageFileSelected(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('paste', onPaste);
    };
  }, [
    selectedElementId,
    selectedDetectedText,
    selectedDetectedImage,
    handleDeleteElement,
    handleEraseExistingText,
    handleDeleteEmbeddedImage,
    handleUndo,
    handleRedo,
    handleImageFileSelected,
  ]);

  // Render current PDF page using pdfjs-dist & inspect internal stream objects
  const renderCurrentPage = useCallback(
    async (pdfBytes: Uint8Array, pageIdx: number) => {
      if (!pageCanvasRef.current || !pdfBytes || pdfBytes.byteLength === 0) return;
      setIsProcessing(true);

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore render cancellation
        }
        renderTaskRef.current = null;
      }

      try {
        const dataCopy = clonePdfBytes(pdfBytes);
        const loadingTask = pdfjsLib.getDocument({ data: dataCopy });
        const pdf = await loadingTask.promise;
        setTotalPages(pdf.numPages);

        const safeIdx = Math.min(Math.max(0, pageIdx), pdf.numPages - 1);
        const page = await pdf.getPage(safeIdx + 1);

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        setPageSize({ width: unscaledViewport.width, height: unscaledViewport.height });
        const vpTransform = unscaledViewport.transform as Matrix;
        setViewportTransform(vpTransform);

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: zoomScale });

        const canvas = pageCanvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const currentTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = currentTask;
        await currentTask.promise;
        renderTaskRef.current = null;

        // Inspect internal PDF streams for embedded images and text colors
        let internalImages: DetectedImageObject[] = [];
        let internalTextColors: ReturnType<typeof inspectPageInternalObjects>['textColors'] = [];
        try {
          const pdfDoc = await PDFDocument.load(clonePdfBytes(pdfBytes), { ignoreEncryption: true });
          const inspected = inspectPageInternalObjects(pdfDoc, safeIdx, vpTransform);
          internalImages = inspected.images;
          internalTextColors = inspected.textColors;
        } catch (inspectErr) {
          console.warn('Stream inspection fallback:', inspectErr);
        }
        setDetectedImages(internalImages);

        // Extract text content items in unscaled 1.0x PDF point coordinates
        const textContent = await page.getTextContent();
        const detected: DetectedTextSpan[] = [];
        const stylesMap = (textContent as unknown as { styles?: Record<string, { fontFamily?: string }> }).styles;

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

            const [vx, vy] = unscaledViewport.convertToViewportPoint(tx, ty);
            const itemWidth = item.width || item.str.length * fontSize * 0.5;
            const itemHeight = fontSize * 1.1;

            const fontName = (item.fontName || '').toLowerCase();
            const style = stylesMap?.[item.fontName || ''];
            const rawFamily = (style?.fontFamily || fontName).toLowerCase();

            let detectedFamily: FontFamilyType = 'Helvetica';
            if (rawFamily.includes('georgia')) detectedFamily = 'Georgia';
            else if (rawFamily.includes('playfair')) detectedFamily = 'Playfair Display';
            else if (rawFamily.includes('merriweather')) detectedFamily = 'Merriweather';
            else if (rawFamily.includes('times') || rawFamily.includes('serif') || rawFamily.includes('roman') || rawFamily.includes('cambria')) detectedFamily = 'Times';
            else if (rawFamily.includes('jetbrains')) detectedFamily = 'JetBrains Mono';
            else if (rawFamily.includes('courier') || rawFamily.includes('mono') || rawFamily.includes('consolas')) detectedFamily = 'Courier';
            else if (rawFamily.includes('verdana')) detectedFamily = 'Verdana';
            else if (rawFamily.includes('trebuchet')) detectedFamily = 'Trebuchet MS';
            else if (rawFamily.includes('jakarta')) detectedFamily = 'Plus Jakarta Sans';
            else if (rawFamily.includes('arial')) detectedFamily = 'Arial';
            else if (rawFamily.includes('impact')) detectedFamily = 'Impact';
            else if (rawFamily.includes('caveat') || rawFamily.includes('cursive') || rawFamily.includes('script')) detectedFamily = 'Caveat';

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

            const box = {
              x: vx,
              y: vy - itemHeight,
              width: Math.max(itemWidth, 12),
              height: Math.max(itemHeight, 12),
            };

            const colorHex = findColorForViewportBbox(internalTextColors, box, item.str);

            detected.push({
              id: `text-detected-${i}`,
              str: item.str,
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
              fontSize: Math.round(fontSize),
              fontFamily: detectedFamily,
              isBold,
              isItalic,
              colorHex,
            });
          }
        }

        setDetectedTexts(detected);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'RenderingCancelledException') {
          return;
        }
        console.error('Error rendering page:', err);
        showNotification('error', `${t('pdf_editor_error_processing', 'Error processing document: ')} ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [zoomScale, showNotification, t]
  );

  // Load PDF file into editor
  const handleLoadPdf = useCallback(
    async (rawBytes: Uint8Array, name: string) => {
      if (!rawBytes || rawBytes.byteLength === 0) return;
      try {
        setIsProcessing(true);
        const safeBytes = clonePdfBytes(rawBytes);
        const pdfDoc = await PDFDocument.load(clonePdfBytes(safeBytes), { ignoreEncryption: true });
        const numPages = pdfDoc.getPageCount();

        setCurrentPdfBytes(safeBytes);
        setOriginalPdfBytes(clonePdfBytes(safeBytes));
        setFileName(name);
        setTotalPages(numPages);
        setActivePageIndex(0);
        setElements([]);
        setDrawingStrokes([]);
        setHistory([{ pdfBytes: clonePdfBytes(safeBytes), elements: [], strokes: [] }]);
        setHistoryIndex(0);
        setSelectedElementId(null);
        setSelectedDetectedText(null);
        setSelectedDetectedImage(null);

        generateThumbnails(safeBytes);
        showNotification('success', t('pdf_editor_all_saved', 'Document ready'));
      } catch (err) {
        console.error('Failed to load PDF:', err);
        showNotification('error', `${t('pdf_editor_error_processing', 'Error processing document: ')} ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [generateThumbnails, showNotification, t]
  );

  // Load Sample PDF
  const handleLoadSamplePdf = useCallback(async () => {
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      page.drawRectangle({ x: 40, y: 770, width: 515, height: 45, color: rgb(0.06, 0.09, 0.16) });
      page.drawText('OMNIDESK INVOICE & REPORT', { x: 55, y: 785, size: 16, font: fontBold, color: rgb(0.2, 0.85, 0.6) });
      page.drawText('#INV-2026-084', { x: 450, y: 785, size: 12, font, color: rgb(1, 1, 1) });

      page.drawRectangle({
        x: 40,
        y: 660,
        width: 515,
        height: 90,
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 1,
        color: rgb(0.97, 0.98, 0.99),
      });
      page.drawText('Client Name: Acme Global Corporation', { x: 55, y: 725, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      page.drawText('Billing Address: 452 Innovation Blvd, Suite 800, New York, NY', { x: 55, y: 705, size: 10, font, color: rgb(0.3, 0.35, 0.4) });
      page.drawText('Issue Date: November 01, 2026   |   Due Date: November 15, 2026', { x: 55, y: 680, size: 10, font, color: rgb(0.3, 0.35, 0.4) });

      page.drawRectangle({ x: 40, y: 615, width: 515, height: 25, color: rgb(0.92, 0.94, 0.98) });
      page.drawText('Description', { x: 55, y: 623, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
      page.drawText('Quantity', { x: 320, y: 623, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
      page.drawText('Rate', { x: 400, y: 623, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
      page.drawText('Total Amount', { x: 470, y: 623, size: 10, font: fontBold, color: rgb(0.2, 0.25, 0.35) });

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

      page.drawRectangle({ x: 340, y: 430, width: 215, height: 35, color: rgb(0.06, 0.09, 0.16) });
      page.drawText('TOTAL DUE:', { x: 355, y: 442, size: 11, font: fontBold, color: rgb(1, 1, 1) });
      page.drawText('$ 5,800.00', { x: 460, y: 442, size: 12, font: fontBold, color: rgb(0.2, 0.85, 0.6) });

      page.drawText('True Internal PDF Editing & Image Embedding:', { x: 40, y: 390, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText('Select any text to edit, move, or permanently delete it from the internal PDF stream.', { x: 40, y: 370, size: 10, font, color: rgb(0.4, 0.45, 0.5) });
      page.drawText('Use Add Image or drag-and-drop / paste images directly onto any PDF page.', { x: 40, y: 350, size: 10, font, color: rgb(0.4, 0.45, 0.5) });

      page.drawText('Page 1 of 1  •  Authorized Signature Required', { x: 180, y: 40, size: 9, font, color: rgb(0.6, 0.65, 0.7) });

      const sampleBytes = clonePdfBytes(await pdfDoc.save());
      await handleLoadPdf(sampleBytes, 'sample-invoice.pdf');
    } catch (err) {
      console.error('Failed to create sample PDF:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [handleLoadPdf]);

  const handleCreateBlankPdf = async () => {
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595, 842]);
      const blankBytes = clonePdfBytes(await pdfDoc.save());
      await handleLoadPdf(blankBytes, 'blank-document.pdf');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (currentPdfBytes && currentPdfBytes.byteLength > 0) {
      renderCurrentPage(currentPdfBytes, activePageIndex);
    }
  }, [currentPdfBytes, activePageIndex, zoomScale, renderCurrentPage]);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    handleLoadSamplePdf();
  }, [handleLoadSamplePdf]);

  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }
    };
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = reader.result as ArrayBuffer;
      await handleLoadPdf(new Uint8Array(buffer), file.name);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Open in-line text editor
  const startEditingText = (elem: Partial<TextElement>) => {
    const fullElem: TextElement = {
      id: elem.id || `text-${Date.now()}`,
      type: 'text',
      pageIndex: activePageIndex,
      x: elem.x ?? 50,
      y: elem.y ?? 50,
      width: elem.width ?? 200,
      height: elem.height ?? 24,
      text: elem.text || '',
      fontSize: elem.fontSize || 14,
      fontFamily: elem.fontFamily || textFontFamily,
      color: elem.color || '#0f172a',
      isBold: elem.isBold ?? false,
      isItalic: elem.isItalic ?? false,
      hasWhiteoutBg: elem.hasWhiteoutBg ?? false,
      originalText: elem.originalText,
      sourceDetectedText: elem.sourceDetectedText,
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

  // Save edited text element (removes original text from PDF internal stream if editing existing PDF text)
  const saveEditingText = async () => {
    if (!editingTextElement || !currentPdfBytes) return;

    let activeBytes = currentPdfBytes;
    if (editingTextElement.sourceDetectedText) {
      const dt = editingTextElement.sourceDetectedText;
      const { updatedBytes } = await removeTextSpanFromPdf(
        clonePdfBytes(currentPdfBytes),
        activePageIndex,
        { x: dt.x, y: dt.y, width: dt.width, height: dt.height },
        dt.str,
        viewportTransform
      );
      activeBytes = clonePdfBytes(updatedBytes);
    }

    if (textInputValue.trim().length === 0) {
      const nextElements = elements.filter(el => el.id !== editingTextElement.id);
      setCurrentPdfBytes(activeBytes);
      setElements(nextElements);
      pushSnapshot(activeBytes, nextElements, drawingStrokes);
      setEditingTextElement(null);
      generateThumbnails(activeBytes);
      return;
    }

    const updated: TextElement = {
      ...editingTextElement,
      sourceDetectedText: undefined,
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

    setCurrentPdfBytes(activeBytes);
    setElements(nextElements);
    pushSnapshot(activeBytes, nextElements, drawingStrokes);
    setEditingTextElement(null);
    setSelectedElementId(updated.id);
    if (editingTextElement.sourceDetectedText) {
      generateThumbnails(activeBytes);
    }
  };

  const changeSelectedElementFontFamily = (family: FontFamilyType) => {
    if (!selectedElementId || !currentPdfBytes) return;
    const next = elements.map(el => (el.id === selectedElementId && el.type === 'text' ? { ...el, fontFamily: family } : el));
    setElements(next);
    pushSnapshot(currentPdfBytes, next, drawingStrokes);
  };

  const changeSelectedElementFontSize = (delta: number) => {
    if (!selectedElementId || !currentPdfBytes) return;
    const next = elements.map(el =>
      el.id === selectedElementId && el.type === 'text'
        ? { ...el, fontSize: Math.max(8, Math.min(72, el.fontSize + delta)) }
        : el
    );
    setElements(next);
    pushSnapshot(currentPdfBytes, next, drawingStrokes);
  };

  const toggleSelectedElementBold = () => {
    if (!selectedElementId || !currentPdfBytes) return;
    const next = elements.map(el =>
      el.id === selectedElementId && el.type === 'text' ? { ...el, isBold: !el.isBold } : el
    );
    setElements(next);
    pushSnapshot(currentPdfBytes, next, drawingStrokes);
  };

  const toggleSelectedElementItalic = () => {
    if (!selectedElementId || !currentPdfBytes) return;
    const next = elements.map(el =>
      el.id === selectedElementId && el.type === 'text' ? { ...el, isItalic: !el.isItalic } : el
    );
    setElements(next);
    pushSnapshot(currentPdfBytes, next, drawingStrokes);
  };

  const rotateSelectedImage = () => {
    if (!selectedElementId || !currentPdfBytes) return;
    const next = elements.map(el => {
      if (el.id === selectedElementId && el.type === 'image') {
        const nextRot = ((el.rotation ?? 0) + 90) % 360;
        return {
          ...el,
          rotation: nextRot,
          width: el.height,
          height: el.width,
        };
      }
      return el;
    });
    setElements(next);
    pushSnapshot(currentPdfBytes, next, drawingStrokes);
  };

  const cycleSelectedImageOpacity = () => {
    if (!selectedElementId || !currentPdfBytes) return;
    const levels = [1, 0.75, 0.5];
    const next = elements.map(el => {
      if (el.id === selectedElementId && el.type === 'image') {
        const cur = el.opacity ?? 1;
        const idx = levels.findIndex(v => Math.abs(v - cur) < 0.05);
        const nextOpacity = levels[(idx + 1) % levels.length];
        return { ...el, opacity: nextOpacity };
      }
      return el;
    });
    setElements(next);
    pushSnapshot(currentPdfBytes, next, drawingStrokes);
  };

  const resetSelectedImageAspect = () => {
    if (!selectedElementId || !currentPdfBytes) return;
    const next = elements.map(el => {
      if (el.id === selectedElementId && el.type === 'image' && el.naturalRatio) {
        const rot = ((el.rotation ?? 0) % 360 + 360) % 360;
        const effectiveRatio = rot === 90 || rot === 270 ? 1 / el.naturalRatio : el.naturalRatio;
        return { ...el, height: el.width / effectiveRatio };
      }
      return el;
    });
    setElements(next);
    pushSnapshot(currentPdfBytes, next, drawingStrokes);
  };

  // Stage pointer handlers (convert screen coords to unscaled 1.0x PDF points!)
  const getStagePdfPoint = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageContainerRef.current) return { x: 0, y: 0 };
    const rect = stageContainerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoomScale,
      y: (e.clientY - rect.top) / zoomScale,
    };
  };

  const handleStageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = getStagePdfPoint(e);

    if (activeTool === 'pen') {
      setCurrentStroke([pt]);
    } else if (activeTool === 'whiteout' || activeTool === 'redact' || activeTool === 'highlight') {
      setDragBox({ startX: pt.x, startY: pt.y, currentX: pt.x, currentY: pt.y });
    } else if (activeTool === 'add_text') {
      startEditingText({
        x: pt.x,
        y: pt.y,
        width: 180,
        height: 24,
        text: t('pdf_editor_new_text_default', 'New Text'),
        fontSize: 14,
        fontFamily: textFontFamily,
        hasWhiteoutBg: false,
      });
      setActiveTool('select');
    } else if (activeTool === 'select') {
      setSelectedElementId(null);
      setSelectedDetectedText(null);
      setSelectedDetectedImage(null);
    }
  };

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = getStagePdfPoint(e);
    if (activeTool === 'pen' && currentStroke) {
      setCurrentStroke(prev => (prev ? [...prev, pt] : null));
    } else if (dragBox) {
      setDragBox(prev => (prev ? { ...prev, currentX: pt.x, currentY: pt.y } : null));
    }
  };

  const handleStageMouseUp = async () => {
    if (activeTool === 'pen' && currentStroke && currentStroke.length > 1 && currentPdfBytes) {
      const newStroke: DrawingStroke = {
        id: `stroke-${Date.now()}`,
        pageIndex: activePageIndex,
        points: currentStroke,
        color: penColor,
        width: penWidth,
      };
      const nextStrokes = [...drawingStrokes, newStroke];
      setDrawingStrokes(nextStrokes);
      pushSnapshot(currentPdfBytes, elements, nextStrokes);
      setCurrentStroke(null);
    } else if (dragBox && currentPdfBytes) {
      const minX = Math.min(dragBox.startX, dragBox.currentX);
      const minY = Math.min(dragBox.startY, dragBox.currentY);
      const width = Math.abs(dragBox.currentX - dragBox.startX);
      const height = Math.abs(dragBox.currentY - dragBox.startY);
      setDragBox(null);

      if (width > 6 && height > 6) {
        if (activeTool === 'whiteout' && eraseSubMode === 'clean') {
          try {
            setIsProcessing(true);
            const { updatedBytes, removedCount } = await removeContentInRectFromPdf(
              clonePdfBytes(currentPdfBytes),
              activePageIndex,
              { x: minX, y: minY, width, height },
              viewportTransform,
              { removeText: true, removeImages: true }
            );
            if (removedCount === 0) {
              showNotification('error', t('pdf_editor_nothing_found_in_area', 'No editable PDF objects found in this area — use White Cover for scanned pages'));
            } else {
              const safeBytes = clonePdfBytes(updatedBytes);
              setCurrentPdfBytes(safeBytes);
              pushSnapshot(safeBytes, elements, drawingStrokes);
              generateThumbnails(safeBytes);
              showNotification('success', t('pdf_editor_content_erased', 'Selected content permanently deleted from PDF'));
            }
          } catch (err) {
            console.error('Clean erase failed:', err);
          } finally {
            setIsProcessing(false);
          }
          setActiveTool('select');
          return;
        }

        if (activeTool === 'redact') {
          // Permanent Redaction: remove internal text/images AND burn permanent black rectangle into PDF
          try {
            setIsProcessing(true);
            const { updatedBytes } = await removeContentInRectFromPdf(
              clonePdfBytes(currentPdfBytes),
              activePageIndex,
              { x: minX, y: minY, width, height },
              viewportTransform,
              { removeText: true, removeImages: true }
            );

            const pdfDoc = await PDFDocument.load(clonePdfBytes(updatedBytes), { ignoreEncryption: true });
            const page = pdfDoc.getPage(activePageIndex);
            const { height: pageHeight } = page.getSize();
            page.drawRectangle({
              x: minX,
              y: pageHeight - (minY + height),
              width,
              height,
              color: rgb(0, 0, 0),
              opacity: 1,
            });
            const finalRedactBytes = clonePdfBytes(await pdfDoc.save());
            setCurrentPdfBytes(finalRedactBytes);
            pushSnapshot(finalRedactBytes, elements, drawingStrokes);
            generateThumbnails(finalRedactBytes);
            showNotification('success', t('pdf_editor_redacted_success', 'Content permanently redacted from inside the PDF'));
          } catch (err) {
            console.error('Redaction failed:', err);
          } finally {
            setIsProcessing(false);
          }
          setActiveTool('select');
          return;
        }

        // White Cover (for scanned PDFs) or Highlight
        const maskColor = activeTool === 'highlight' ? '#fde047' : '#ffffff';
        const opacity = activeTool === 'highlight' ? 0.4 : 1.0;

        const newMask: MaskElement = {
          id: `mask-${Date.now()}`,
          type: activeTool === 'highlight' ? 'highlight' : 'whiteout',
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
        pushSnapshot(currentPdfBytes, nextElements, drawingStrokes);
        setSelectedElementId(newMask.id);
      }
      setActiveTool('select');
    }
  };

  // Drag & Drop files (PDF or Image) onto stage
  const handleStageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          handleLoadPdf(new Uint8Array(reader.result), file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('image/')) {
      if (stageContainerRef.current) {
        const rect = stageContainerRef.current.getBoundingClientRect();
        const dropPt = {
          x: (e.clientX - rect.left) / zoomScale,
          y: (e.clientY - rect.top) / zoomScale,
        };
        handleImageFileSelected(file, dropPt);
      } else {
        handleImageFileSelected(file);
      }
    }
  };

  // Page Operations (all push to Undo/Redo snapshot)
  const handleRotatePage = async (pageIdx: number, angleDiff: number) => {
    if (!currentPdfBytes || currentPdfBytes.byteLength === 0) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(clonePdfBytes(currentPdfBytes), { ignoreEncryption: true });
      const page = pdfDoc.getPage(pageIdx);
      const currentAngle = page.getRotation().angle;
      const newAngle = (currentAngle + angleDiff + 360) % 360;
      page.setRotation(degrees(newAngle));

      const updatedBytes = clonePdfBytes(await pdfDoc.save());
      setCurrentPdfBytes(updatedBytes);
      pushSnapshot(updatedBytes, elements, drawingStrokes);
      generateThumbnails(updatedBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicatePage = async (pageIdx: number) => {
    if (!currentPdfBytes || currentPdfBytes.byteLength === 0) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(clonePdfBytes(currentPdfBytes), { ignoreEncryption: true });
      const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageIdx]);
      pdfDoc.insertPage(pageIdx + 1, copiedPage);

      const updatedBytes = clonePdfBytes(await pdfDoc.save());
      setCurrentPdfBytes(updatedBytes);
      setTotalPages(pdfDoc.getPageCount());
      setActivePageIndex(pageIdx + 1);
      pushSnapshot(updatedBytes, elements, drawingStrokes);
      generateThumbnails(updatedBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePage = async (pageIdx: number) => {
    if (!currentPdfBytes || currentPdfBytes.byteLength === 0 || totalPages <= 1) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(clonePdfBytes(currentPdfBytes), { ignoreEncryption: true });
      pdfDoc.removePage(pageIdx);

      const updatedBytes = clonePdfBytes(await pdfDoc.save());
      const nextElements = elements
        .filter(el => el.pageIndex !== pageIdx)
        .map(el => (el.pageIndex > pageIdx ? { ...el, pageIndex: el.pageIndex - 1 } : el));
      const nextStrokes = drawingStrokes
        .filter(s => s.pageIndex !== pageIdx)
        .map(s => (s.pageIndex > pageIdx ? { ...s, pageIndex: s.pageIndex - 1 } : s));

      setCurrentPdfBytes(updatedBytes);
      setElements(nextElements);
      setDrawingStrokes(nextStrokes);
      const nextTotal = pdfDoc.getPageCount();
      setTotalPages(nextTotal);
      setActivePageIndex(Math.min(pageIdx, nextTotal - 1));
      pushSnapshot(updatedBytes, nextElements, nextStrokes);
      generateThumbnails(updatedBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInsertBlankPage = async (afterIdx: number) => {
    if (!currentPdfBytes || currentPdfBytes.byteLength === 0) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(clonePdfBytes(currentPdfBytes), { ignoreEncryption: true });
      pdfDoc.insertPage(afterIdx + 1, [pageSize.width, pageSize.height]);

      const updatedBytes = clonePdfBytes(await pdfDoc.save());
      setCurrentPdfBytes(updatedBytes);
      setTotalPages(pdfDoc.getPageCount());
      setActivePageIndex(afterIdx + 1);
      pushSnapshot(updatedBytes, elements, drawingStrokes);
      generateThumbnails(updatedBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMovePage = async (fromIdx: number, toIdx: number) => {
    if (!currentPdfBytes || currentPdfBytes.byteLength === 0 || toIdx < 0 || toIdx >= totalPages) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(clonePdfBytes(currentPdfBytes), { ignoreEncryption: true });
      const [copied] = await pdfDoc.copyPages(pdfDoc, [fromIdx]);
      pdfDoc.removePage(fromIdx);
      pdfDoc.insertPage(toIdx, copied);

      const updatedBytes = clonePdfBytes(await pdfDoc.save());
      setCurrentPdfBytes(updatedBytes);
      setActivePageIndex(toIdx);
      pushSnapshot(updatedBytes, elements, drawingStrokes);
      generateThumbnails(updatedBytes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Signature canvas helpers
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

  const handleSigMouseUp = () => setIsDrawingSig(false);

  const clearSigCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleInsertSignature = (dataUrl: string, label?: string) => {
    if (!currentPdfBytes) return;
    const newSigElem: ImageElement = {
      id: `img-${Date.now()}`,
      type: 'image',
      pageIndex: activePageIndex,
      x: 100,
      y: 150,
      width: 140,
      height: 60,
      dataUrl,
      label,
      opacity: 1,
      rotation: 0,
      naturalRatio: 140 / 60,
    };

    const nextElements = [...elements, newSigElem];
    setElements(nextElements);
    pushSnapshot(currentPdfBytes, nextElements, drawingStrokes);
    setShowSigModal(false);
    setSelectedElementId(newSigElem.id);
    setActiveTool('select');
  };

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

  const handleApplyWatermark = async () => {
    if (!currentPdfBytes || currentPdfBytes.byteLength === 0) return;
    try {
      setIsProcessing(true);
      const pdfDoc = await PDFDocument.load(clonePdfBytes(currentPdfBytes), { ignoreEncryption: true });
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

      const updatedBytes = clonePdfBytes(await pdfDoc.save());
      setCurrentPdfBytes(updatedBytes);
      pushSnapshot(updatedBytes, elements, drawingStrokes);
      generateThumbnails(updatedBytes);
      setShowWatermarkModal(false);
      showNotification('success', t('pdf_editor_watermark_applied', 'Watermark applied'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Compile all staged annotations, images, text, and strokes directly into PDF bytes
  const compileEditsIntoPdfBytes = useCallback(
    async (baseBytes: Uint8Array): Promise<Uint8Array> => {
      const pdfDoc = await PDFDocument.load(clonePdfBytes(baseBytes), { ignoreEncryption: true });

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

      // Load pdfjs doc for exact viewport-to-PDF coordinate conversion per page (handles CropBox/MediaBox)
      const pdfJsDoc = await pdfjsLib.getDocument({ data: clonePdfBytes(baseBytes) }).promise;
      const numPages = pdfDoc.getPageCount();

      for (let p = 0; p < numPages; p++) {
        const pageMasks = elements.filter(
          el => el.pageIndex === p && (el.type === 'whiteout' || el.type === 'redact' || el.type === 'highlight')
        ) as MaskElement[];
        const pageTexts = elements.filter(el => el.pageIndex === p && el.type === 'text') as TextElement[];
        const pageImages = elements.filter(el => el.pageIndex === p && el.type === 'image') as ImageElement[];
        const pageStrokes = drawingStrokes.filter(s => s.pageIndex === p);

        if (pageMasks.length === 0 && pageTexts.length === 0 && pageImages.length === 0 && pageStrokes.length === 0) {
          continue;
        }

        const page = pdfDoc.getPage(p);
        const jsPage = await pdfJsDoc.getPage(p + 1);
        const vp = jsPage.getViewport({ scale: 1.0 });

        const toPdfBox = (vx: number, vy: number, vw: number, vh: number) => {
          const [x1, y1] = vp.convertToPdfPoint(vx, vy);
          const [x2, y2] = vp.convertToPdfPoint(vx + vw, vy + vh);
          return {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            width: Math.abs(x2 - x1),
            height: Math.abs(y2 - y1),
          };
        };

        // 1. Masks (White Cover, Highlight, etc.)
        for (const mask of pageMasks) {
          const box = toPdfBox(mask.x, mask.y, mask.width, mask.height);
          const [r, g, b] = mask.type === 'highlight' ? [0.99, 0.88, 0.28] : hexToRgbTuple(mask.color);
          page.drawRectangle({
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            color: rgb(r, g, b),
            opacity: mask.opacity ?? 1.0,
          });
        }

        // 2. Text Elements (vector PDF text whenever WinAnsi-compatible, high-DPI fallback for extended scripts)
        for (const textElem of pageTexts) {
          const box = toPdfBox(textElem.x, textElem.y, textElem.width, textElem.height);
          const [r, g, b] = hexToRgbTuple(textElem.color || '#0f172a');

          if (textElem.hasWhiteoutBg) {
            page.drawRectangle({
              x: box.x - 2,
              y: box.y - 2,
              width: box.width + 4,
              height: box.height + 4,
              color: rgb(1, 1, 1),
              opacity: 1.0,
            });
          }

          const fontOpt = AVAILABLE_FONTS.find(f => f.id === textElem.fontFamily);
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

          const canVector = !fontOpt?.renderAsImageOnExport && canFontEncodeWinAnsi(targetFont, textElem.text);

          if (canVector) {
            // Baseline in PDF user space sits near bottom of text box (offset by ~0.2 * fontSize)
            const [baseX, baseY] = vp.convertToPdfPoint(textElem.x, textElem.y + textElem.fontSize * 0.95);
            page.drawText(textElem.text, {
              x: baseX,
              y: baseY,
              size: Math.max(6, textElem.fontSize),
              font: targetFont,
              color: rgb(r, g, b),
            });
          } else {
            // Render non-WinAnsi Unicode or display script font at 3x HiDPI
            const highResCanvas = document.createElement('canvas');
            const renderDpr = 3;
            const fontPx = Math.max(8, textElem.fontSize) * renderDpr;
            const hCtx = highResCanvas.getContext('2d');
            if (hCtx) {
              const cssFont = fontOpt?.cssFont || 'Helvetica, Arial, sans-serif';
              hCtx.font = `${textElem.isBold ? 'bold ' : ''}${textElem.isItalic ? 'italic ' : ''}${fontPx}px ${cssFont}`;
              const lines = textElem.text.split('\n');
              const maxLineW = Math.max(...lines.map(l => hCtx.measureText(l || ' ').width));
              const lineH = fontPx * 1.25;
              highResCanvas.width = Math.ceil(maxLineW + 12 * renderDpr);
              highResCanvas.height = Math.ceil(lineH * lines.length + 6 * renderDpr);

              hCtx.font = `${textElem.isBold ? 'bold ' : ''}${textElem.isItalic ? 'italic ' : ''}${fontPx}px ${cssFont}`;
              hCtx.fillStyle = textElem.color || '#0f172a';
              hCtx.textBaseline = 'top';
              lines.forEach((line, lIdx) => {
                hCtx.fillText(line, 2 * renderDpr, 2 * renderDpr + lIdx * lineH);
              });

              const textPngUrl = highResCanvas.toDataURL('image/png');
              const embeddedImage = await pdfDoc.embedPng(textPngUrl);
              const exportW = highResCanvas.width / renderDpr;
              const exportH = highResCanvas.height / renderDpr;
              const imgBox = toPdfBox(textElem.x, textElem.y, exportW, exportH);

              page.drawImage(embeddedImage, {
                x: imgBox.x,
                y: imgBox.y,
                width: imgBox.width,
                height: imgBox.height,
              });
            }
          }
        }

        // 3. Images, Signatures & Stamps (PNG, JPEG, WebP, SVG, GIF all supported)
        for (const imgElem of pageImages) {
          try {
            const box = toPdfBox(imgElem.x, imgElem.y, imgElem.width, imgElem.height);
            const rot = ((imgElem.rotation ?? 0) % 360 + 360) % 360;
            const isJpeg = imgElem.dataUrl.startsWith('data:image/jpeg') || imgElem.dataUrl.startsWith('data:image/jpg');
            const isPng = imgElem.dataUrl.startsWith('data:image/png');

            let embeddedImage;
            if (rot === 0 && isJpeg) {
              embeddedImage = await pdfDoc.embedJpg(imgElem.dataUrl);
            } else if (rot === 0 && isPng) {
              embeddedImage = await pdfDoc.embedPng(imgElem.dataUrl);
            } else {
              const pngUrl = await imageDataUrlToPngDataUrl(imgElem.dataUrl, rot);
              embeddedImage = await pdfDoc.embedPng(pngUrl);
            }

            page.drawImage(embeddedImage, {
              x: box.x,
              y: box.y,
              width: box.width,
              height: box.height,
              opacity: imgElem.opacity ?? 1,
            });
          } catch (e) {
            console.warn('Could not embed image:', e);
          }
        }

        // 4. Freehand Pen Strokes
        if (pageStrokes.length > 0) {
          const strokeCanvas = document.createElement('canvas');
          const dpr = 2;
          strokeCanvas.width = Math.ceil(vp.width * dpr);
          strokeCanvas.height = Math.ceil(vp.height * dpr);
          const sCtx = strokeCanvas.getContext('2d');
          if (sCtx) {
            sCtx.scale(dpr, dpr);
            sCtx.lineCap = 'round';
            sCtx.lineJoin = 'round';

            pageStrokes.forEach(stroke => {
              if (stroke.points.length < 2) return;
              sCtx.strokeStyle = stroke.color;
              sCtx.lineWidth = stroke.width;
              sCtx.beginPath();
              sCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
              for (let i = 1; i < stroke.points.length; i++) {
                sCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
              }
              sCtx.stroke();
            });

            const strokePngUrl = strokeCanvas.toDataURL('image/png');
            const strokePng = await pdfDoc.embedPng(strokePngUrl);
            const fullBox = toPdfBox(0, 0, vp.width, vp.height);
            page.drawImage(strokePng, {
              x: fullBox.x,
              y: fullBox.y,
              width: fullBox.width,
              height: fullBox.height,
            });
          }
        }
      }

      return clonePdfBytes(await pdfDoc.save());
    },
    [elements, drawingStrokes]
  );

  // Commit staged edits directly into the working PDF bytes
  const handleCommitToPdf = async () => {
    if (!currentPdfBytes || (elements.length === 0 && drawingStrokes.length === 0)) return;
    try {
      setIsProcessing(true);
      const finalBytes = await compileEditsIntoPdfBytes(currentPdfBytes);
      setCurrentPdfBytes(finalBytes);
      setElements([]);
      setDrawingStrokes([]);
      setSelectedElementId(null);
      pushSnapshot(finalBytes, [], []);
      generateThumbnails(finalBytes);
      showNotification('success', t('pdf_editor_committed_success', 'All edits committed into the PDF file'));
    } catch (err) {
      console.error('Commit failed:', err);
      showNotification('error', `${t('pdf_editor_error_processing', 'Error processing document: ')} ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export & Save PDF
  const handleExportPdf = async () => {
    if (!currentPdfBytes || currentPdfBytes.byteLength === 0) return;
    try {
      setIsProcessing(true);
      const finalBytes = await compileEditsIntoPdfBytes(currentPdfBytes);
      const exportName = fileName.replace(/\.pdf$/i, '') + '-edited.pdf';

      await saveBinaryWithDialog(exportName, finalBytes, 'application/pdf');

      setCurrentPdfBytes(finalBytes);
      setElements([]);
      setDrawingStrokes([]);
      setSelectedElementId(null);
      pushSnapshot(finalBytes, [], []);
      generateThumbnails(finalBytes);

      showNotification('success', t('pdf_editor_saved_success', 'PDF exported and saved successfully!'));
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('error', `${t('pdf_editor_error_processing', 'Error processing document: ')} ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportPagePng = () => {
    if (!pageCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${fileName.replace(/\.pdf$/i, '')}-page-${activePageIndex + 1}.png`;
    link.href = pageCanvasRef.current.toDataURL('image/png');
    link.click();
    showNotification('success', t('pdf_editor_export_png', 'Export Page PNG'));
  };

  const confirmResetDocument = () => {
    if (!originalPdfBytes) return;
    setShowResetConfirm(false);
    handleLoadPdf(originalPdfBytes, fileName);
  };

  const selectedTextElem = elements.find(el => el.id === selectedElementId && el.type === 'text') as TextElement | undefined;
  const selectedImgElem = elements.find(el => el.id === selectedElementId && el.type === 'image') as ImageElement | undefined;
  const hasStagedEdits = elements.length > 0 || drawingStrokes.length > 0;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden font-sans relative">
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
                {totalPages > 0
                  ? t('pdf_editor_page_num', 'Page {current} of {total}', {
                      current: activePageIndex + 1,
                      total: totalPages,
                    })
                  : t('pdf_editor_all_saved', 'Document ready')}
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
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFileSelected(file);
              e.target.value = '';
            }}
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

          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-800 transition-all"
            title={t('pdf_editor_undo', 'Undo')}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-800 transition-all"
            title={t('pdf_editor_redo', 'Redo')}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Right Save / Export buttons */}
        <div className="flex items-center gap-2">
          {hasStagedEdits && (
            <button
              onClick={handleCommitToPdf}
              disabled={isProcessing}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:text-white bg-sky-500/15 hover:bg-sky-500/30 border border-sky-500/40 rounded-xl transition-all"
              title={t('pdf_editor_apply_to_pdf', 'Commit to PDF')}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('pdf_editor_apply_to_pdf', 'Commit to PDF')}</span>
            </button>
          )}

          <button
            onClick={handleExportPagePng}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-all"
            title={t('pdf_editor_export_png', 'Export Page PNG')}
          >
            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">{t('pdf_editor_export_png', 'Export Page PNG')}</span>
          </button>

          <button
            onClick={() => originalPdfBytes && setShowResetConfirm(true)}
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
        <div className="absolute top-16 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md">
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="text-slate-200">{statusMessage.text}</span>
        </div>
      )}

      {/* SECONDARY TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800/80 text-xs shrink-0 overflow-x-auto gap-2 z-20">
        <div className="flex items-center gap-1">
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

          <button
            onClick={() => imageInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title={t('pdf_editor_add_image_hint', 'Insert a PNG, JPG, WebP, or SVG image into the PDF')}
          >
            <ImagePlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('pdf_editor_tool_add_image', 'Add Image')}</span>
          </button>

          <button
            onClick={() => setActiveTool('whiteout')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTool === 'whiteout'
                ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={t('pdf_editor_erase_area_hint', 'Drag over text or images to permanently delete them from inside the PDF')}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>{t('pdf_editor_tool_erase', 'Erase Inside')}</span>
          </button>

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

          <button
            onClick={() => setActiveTool('pen')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTool === 'pen'
                ? 'bg-purple-400 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title={t('pdf_editor_tool_pen', 'Pen')}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{t('pdf_editor_tool_pen', 'Pen')}</span>
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          <button
            onClick={() => setShowSigModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-all"
            title={t('pdf_editor_signature_title', 'Signatures & Stamps')}
          >
            <FileSignature className="w-3.5 h-3.5 text-teal-400" />
            <span>{t('pdf_editor_tool_signature', 'Signature & Stamp')}</span>
          </button>

          <button
            onClick={() => setShowWatermarkModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-all"
            title={t('pdf_editor_watermark_text', 'Watermark Text')}
          >
            <Stamp className="w-3.5 h-3.5 text-rose-400" />
            <span>{t('pdf_editor_tool_watermark', 'Watermark')}</span>
          </button>
        </div>

        {/* Contextual Bars */}
        {activeTool === 'whiteout' && (
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-amber-400/40">
            <button
              onClick={() => setEraseSubMode('clean')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                eraseSubMode === 'clean' ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('pdf_editor_erase_mode_clean', 'Delete Inside (Clean)')}
            </button>
            <button
              onClick={() => setEraseSubMode('whiteout')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                eraseSubMode === 'whiteout' ? 'bg-slate-200 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('pdf_editor_erase_mode_whiteout', 'White Cover (Scanned PDF)')}
            </button>
          </div>
        )}

        {selectedTextElem && (
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-sky-500/40 shadow-inner">
            <span className="text-[10px] text-sky-400 font-semibold">{t('pdf_editor_font_family', 'Font Family')}:</span>
            <select
              value={selectedTextElem.fontFamily || 'Helvetica'}
              onChange={(e) => changeSelectedElementFontFamily(e.target.value as FontFamilyType)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 pr-6 focus:outline-none focus:border-sky-400 cursor-pointer"
              style={{ fontFamily: getCssFontFamily(selectedTextElem.fontFamily) }}
            >
              <optgroup label={t('pdf_editor_font_category_sans', 'Sans-Serif Fonts')}>
                {AVAILABLE_FONTS.filter(f => f.category === 'sans').map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </optgroup>
              <optgroup label={t('pdf_editor_font_category_serif', 'Serif Fonts')}>
                {AVAILABLE_FONTS.filter(f => f.category === 'serif').map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </optgroup>
              <optgroup label={t('pdf_editor_font_category_mono', 'Monospace Fonts')}>
                {AVAILABLE_FONTS.filter(f => f.category === 'mono').map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </optgroup>
              <optgroup label={t('pdf_editor_font_category_display', 'Display & Script Fonts')}>
                {AVAILABLE_FONTS.filter(f => f.category === 'display').map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </optgroup>
            </select>

            <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => changeSelectedElementFontSize(-2)}
                className="text-slate-400 hover:text-white text-xs px-1"
                title={t('decrease_font_size', 'Decrease font size')}
              >
                -
              </button>
              <span className="text-[10px] font-mono text-slate-200">{selectedTextElem.fontSize}pt</span>
              <button
                onClick={() => changeSelectedElementFontSize(2)}
                className="text-slate-400 hover:text-white text-xs px-1"
                title={t('increase_font_size', 'Increase font size')}
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                onClick={toggleSelectedElementBold}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                  selectedTextElem.isBold ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
                title={t('pdf_editor_bold', 'Bold')}
              >
                B
              </button>
              <button
                onClick={toggleSelectedElementItalic}
                className={`px-1.5 py-0.5 text-[10px] italic rounded ${
                  selectedTextElem.isItalic ? 'bg-sky-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
                title={t('pdf_editor_italic', 'Italic')}
              >
                I
              </button>
            </div>
          </div>
        )}

        {selectedImgElem && (
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-cyan-500/40">
            <button
              onClick={rotateSelectedImage}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 text-[11px]"
              title={t('pdf_editor_rotate_90', 'Rotate 90°')}
            >
              <RotateCw className="w-3 h-3 text-cyan-400" />
              <span>{t('pdf_editor_rotate_90', 'Rotate 90°')}</span>
            </button>
            <button
              onClick={cycleSelectedImageOpacity}
              className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 text-[11px]"
            >
              {t('pdf_editor_opacity', 'Opacity')}: {Math.round((selectedImgElem.opacity ?? 1) * 100)}%
            </button>
            {selectedImgElem.naturalRatio && (
              <button
                onClick={resetSelectedImageAspect}
                className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 text-[11px]"
              >
                {t('pdf_editor_reset_aspect', 'Reset Aspect')}
              </button>
            )}
            <span className="text-[10px] text-slate-400 hidden xl:inline">
              {t('pdf_editor_resize_hint', 'Drag corners to resize')}
            </span>
          </div>
        )}

        {/* Zoom & Pen Controls */}
        <div className="flex items-center gap-2">
          {activeTool === 'pen' && (
            <div className="flex items-center gap-1.5 bg-slate-950/70 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">{t('pdf_editor_pen_color', 'Brush Color')}:</span>
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
                {t('pdf_editor_clear_drawings', 'Clear Strokes')}
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

      {/* MAIN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT RAIL: Page Thumbnails */}
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
                    setSelectedDetectedImage(null);
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-200">
                      {t('pdf_editor_page_short', 'Page')} {idx + 1}
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
                      <img src={thumbUrl} alt={`${t('pdf_editor_page_short', 'Page')} ${idx + 1}`} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-slate-400 text-[10px] font-mono">{idx + 1}</div>
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

        {/* CENTER STAGE */}
        <div
          className="flex-1 overflow-auto bg-slate-950 flex flex-col items-center justify-start p-6 relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleStageDrop}
        >
          {/* Active Tool Help Banner */}
          <div className="sticky top-0 z-20 mb-4 px-4 py-1.5 rounded-full bg-slate-900/95 border border-slate-800 text-xs text-slate-300 shadow-xl backdrop-blur-md flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {activeTool === 'select' && (
              <span>{t('pdf_editor_drag_hint', 'Drag to move anywhere. Press Delete to remove.')} · {t('pdf_editor_paste_image_hint', 'Tip: Drag & drop or paste (Ctrl+V) any image onto the page')}</span>
            )}
            {activeTool === 'add_text' && (
              <span>{t('pdf_editor_text_hint', 'Click anywhere on the page to insert a custom text box')}</span>
            )}
            {activeTool === 'whiteout' && (
              <span>
                {eraseSubMode === 'clean'
                  ? t('pdf_editor_erase_area_hint', 'Drag over text or images to permanently delete them from inside the PDF')
                  : t('pdf_editor_whiteout_hint', 'Drag over any section or text to mask it with clean whiteout')}
              </span>
            )}
            {activeTool === 'redact' && (
              <span>{t('pdf_editor_redact_hint', 'Drag over confidential text or images to blackout redact')}</span>
            )}
            {activeTool === 'highlight' && (
              <span>{t('pdf_editor_highlight_hint', 'Drag across lines of text to highlight them')}</span>
            )}
            {activeTool === 'pen' && (
              <span>{t('pdf_editor_tool_pen', 'Pen')}</span>
            )}
          </div>

          {/* Interactive Document Page Container */}
          <div
            ref={stageContainerRef}
            className="relative shadow-2xl rounded-sm bg-white overflow-visible"
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

            {/* 2a. Embedded Images inside PDF (Selectable & Permanently Deletable/Movable) */}
            {(activeTool === 'select' || activeTool === 'edit_text') && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                {detectedImages.map(imgObj => {
                  const isSelected = selectedDetectedImage?.id === imgObj.id;
                  return (
                    <div
                      key={imgObj.id}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        e.stopPropagation();
                        setSelectedDetectedImage(imgObj);
                        setSelectedDetectedText(null);
                        setSelectedElementId(null);
                      }}
                      className={`absolute pointer-events-auto cursor-pointer rounded transition-all ${
                        isSelected
                          ? 'border-2 border-cyan-400 bg-cyan-400/15 ring-2 ring-cyan-400/30'
                          : 'border border-dashed border-cyan-400/0 hover:border-cyan-400/60 hover:bg-cyan-400/5'
                      }`}
                      style={{
                        left: `${imgObj.viewportBbox.x * zoomScale}px`,
                        top: `${imgObj.viewportBbox.y * zoomScale}px`,
                        width: `${imgObj.viewportBbox.width * zoomScale}px`,
                        height: `${imgObj.viewportBbox.height * zoomScale}px`,
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute -top-9 left-0 flex items-center gap-1.5 bg-slate-900 border border-slate-700 text-white px-2 py-1 rounded-lg shadow-2xl text-[11px] font-medium z-40 whitespace-nowrap"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] text-cyan-300 px-1 py-0.5 rounded bg-slate-800">
                            {t('pdf_editor_embedded_image', 'PDF Image')}
                          </span>
                          <div className="w-px h-3 bg-slate-700" />
                          <button
                            onClick={() => handleLiftEmbeddedImage(imgObj)}
                            className="flex items-center gap-1 hover:text-emerald-400 px-1 py-0.5 rounded hover:bg-slate-800"
                          >
                            <Move className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{t('pdf_editor_move_image', 'Move Image')}</span>
                          </button>
                          <div className="w-px h-3 bg-slate-700" />
                          <button
                            onClick={() => handleDeleteEmbeddedImage(imgObj)}
                            className="flex items-center gap-1 hover:text-rose-400 px-1 py-0.5 rounded hover:bg-slate-800"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>{t('pdf_editor_remove_image', 'Delete Image')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2b. Detected PDF Text Spans */}
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
                        setSelectedDetectedImage(null);
                        setSelectedElementId(null);
                        setPendingTextDrag({ dt, startX: e.clientX, startY: e.clientY });
                      }}
                      className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing rounded transition-all ${
                        isSelected
                          ? 'border-2 border-sky-400 bg-sky-400/20 shadow-md ring-2 ring-sky-400/40'
                          : 'border border-dashed border-sky-400/0 hover:border-sky-400/60 hover:bg-sky-400/10'
                      }`}
                      style={{
                        left: `${dt.x * zoomScale}px`,
                        top: `${dt.y * zoomScale}px`,
                        width: `${dt.width * zoomScale}px`,
                        height: `${dt.height * zoomScale}px`,
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute -top-9 left-0 flex items-center gap-1.5 bg-slate-900 border border-slate-700 text-white px-2 py-1 rounded-lg shadow-2xl text-[11px] font-medium z-40 whitespace-nowrap"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] text-slate-400 px-1 py-0.5 rounded bg-slate-800">
                            {dt.fontFamily} {dt.isBold ? t('pdf_editor_bold_short', 'Bold') : ''}
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
                                color: dt.colorHex,
                                isBold: dt.isBold,
                                isItalic: dt.isItalic,
                                originalText: dt.str,
                                hasWhiteoutBg: false,
                                sourceDetectedText: dt,
                              });
                              setSelectedDetectedText(null);
                            }}
                            className="flex items-center gap-1 hover:text-sky-400 px-1 py-0.5 rounded hover:bg-slate-800"
                          >
                            <Type className="w-3.5 h-3.5 text-sky-400" />
                            <span>{t('pdf_editor_tool_edit_text', 'Edit Text')}</span>
                          </button>
                          <div className="w-px h-3 bg-slate-700" />
                          <button
                            onClick={() => handleLiftAndMoveExistingText(dt)}
                            className="flex items-center gap-1 hover:text-emerald-400 px-1 py-0.5 rounded hover:bg-slate-800"
                          >
                            <Move className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{t('pdf_editor_move_text', 'Move text')}</span>
                          </button>
                          <div className="w-px h-3 bg-slate-700" />
                          <button
                            onClick={() => handleEraseExistingText(dt)}
                            className="flex items-center gap-1 hover:text-rose-400 px-1 py-0.5 rounded hover:bg-slate-800"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>{t('pdf_editor_erase_text', 'Erase text')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Staged Masks Layer (White Cover for scans, Highlights) */}
            {elements
              .filter(el => el.pageIndex === activePageIndex && (el.type === 'whiteout' || el.type === 'redact' || el.type === 'highlight'))
              .map(el => {
                const mask = el as MaskElement;
                const isSelected = selectedElementId === mask.id;
                const maskLabel =
                  mask.type === 'highlight'
                    ? t('pdf_editor_mask_highlight', 'Highlight')
                    : mask.type === 'redact'
                    ? t('pdf_editor_mask_redact', 'Redact')
                    : t('pdf_editor_mask_whiteout', 'White Cover');

                return (
                  <div
                    key={mask.id}
                    onMouseDown={(e) => {
                      if (activeTool !== 'select' || e.button !== 0) return;
                      e.stopPropagation();
                      setSelectedElementId(mask.id);
                      setSelectedDetectedText(null);
                      setSelectedDetectedImage(null);
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
                      isSelected ? 'ring-2 ring-emerald-400 shadow-lg cursor-grab active:cursor-grabbing' : 'cursor-grab hover:ring-1 hover:ring-emerald-400/50'
                    }`}
                    style={{
                      left: `${mask.x * zoomScale}px`,
                      top: `${mask.y * zoomScale}px`,
                      width: `${mask.width * zoomScale}px`,
                      height: `${mask.height * zoomScale}px`,
                      backgroundColor: mask.color,
                      opacity: mask.opacity ?? 1,
                    }}
                  >
                    {isSelected && (
                      <div className="absolute -top-8 right-0 flex items-center gap-1 bg-slate-900 border border-slate-700 text-white px-2 py-0.5 rounded shadow-xl text-[10px] z-30 whitespace-nowrap">
                        <span className="text-slate-400">{maskLabel}</span>
                        <div className="w-px h-3 bg-slate-700" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteElement(mask.id);
                          }}
                          className="hover:text-rose-400 p-0.5"
                          title={t('pdf_editor_delete_element', 'Delete')}
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
                  left: `${Math.min(dragBox.startX, dragBox.currentX) * zoomScale}px`,
                  top: `${Math.min(dragBox.startY, dragBox.currentY) * zoomScale}px`,
                  width: `${Math.abs(dragBox.currentX - dragBox.startX) * zoomScale}px`,
                  height: `${Math.abs(dragBox.currentY - dragBox.startY) * zoomScale}px`,
                  backgroundColor:
                    activeTool === 'redact'
                      ? 'rgba(0,0,0,0.85)'
                      : activeTool === 'highlight'
                      ? 'rgba(250, 204, 21, 0.4)'
                      : eraseSubMode === 'clean'
                      ? 'rgba(245, 158, 11, 0.18)'
                      : 'rgba(255,255,255,0.9)',
                  borderColor:
                    activeTool === 'redact'
                      ? '#ef4444'
                      : activeTool === 'whiteout' && eraseSubMode === 'clean'
                      ? '#f59e0b'
                      : '#38bdf8',
                }}
              />
            )}

            {/* 5. Staged Text Elements Layer */}
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
                      setSelectedDetectedImage(null);
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
                    className={`absolute z-20 group cursor-grab active:cursor-grabbing rounded whitespace-pre ${
                      isSelected ? 'ring-2 ring-sky-400 shadow-xl' : 'hover:outline hover:outline-1 hover:outline-sky-400'
                    }`}
                    style={{
                      left: `${textElem.x * zoomScale}px`,
                      top: `${textElem.y * zoomScale}px`,
                      backgroundColor: textElem.hasWhiteoutBg ? '#ffffff' : 'transparent',
                      padding: `${2 * zoomScale}px ${3 * zoomScale}px`,
                      color: textElem.color,
                      fontSize: `${textElem.fontSize * zoomScale}px`,
                      fontFamily: getCssFontFamily(textElem.fontFamily),
                      fontWeight: textElem.isBold ? 700 : 400,
                      fontStyle: textElem.isItalic ? 'italic' : 'normal',
                      lineHeight: '1.2',
                    }}
                  >
                    <span>{textElem.text}</span>

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
                        >
                          <Type className="w-3 h-3 text-sky-400" />
                          <span>{t('pdf_editor_tool_edit_text', 'Edit Text')}</span>
                        </button>
                        <div className="w-px h-3 bg-slate-700" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteElement(textElem.id);
                          }}
                          className="hover:text-rose-400 p-0.5 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>{t('pdf_editor_delete_element', 'Delete')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* 6. Staged Images, Signatures & Stamps (with Corner Resize Handles!) */}
            {elements
              .filter(el => el.pageIndex === activePageIndex && el.type === 'image')
              .map(el => {
                const imgElem = el as ImageElement;
                const isSelected = selectedElementId === imgElem.id;
                const rot = imgElem.rotation ?? 0;

                const startResize = (corner: ResizeCorner) => (e: React.MouseEvent) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setResizingImage({
                    id: imgElem.id,
                    corner,
                    startX: e.clientX,
                    startY: e.clientY,
                    startBox: { x: imgElem.x, y: imgElem.y, width: imgElem.width, height: imgElem.height },
                    aspectRatio: imgElem.width / Math.max(1, imgElem.height),
                  });
                };

                return (
                  <div
                    key={imgElem.id}
                    onMouseDown={(e) => {
                      if (activeTool !== 'select' || e.button !== 0) return;
                      e.stopPropagation();
                      setSelectedElementId(imgElem.id);
                      setSelectedDetectedText(null);
                      setSelectedDetectedImage(null);
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
                    className={`absolute z-20 cursor-grab active:cursor-grabbing rounded ${
                      isSelected ? 'ring-2 ring-emerald-400 shadow-xl' : 'hover:outline hover:outline-1 hover:outline-slate-400'
                    }`}
                    style={{
                      left: `${imgElem.x * zoomScale}px`,
                      top: `${imgElem.y * zoomScale}px`,
                      width: `${imgElem.width * zoomScale}px`,
                      height: `${imgElem.height * zoomScale}px`,
                    }}
                  >
                    <div className="w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
                      <img
                        src={imgElem.dataUrl}
                        alt={imgElem.label || t('pdf_editor_image_label', 'Image')}
                        className="w-full h-full object-fill select-none"
                        style={{
                          opacity: imgElem.opacity ?? 1,
                          transform: rot ? `rotate(${rot}deg)` : undefined,
                        }}
                      />
                    </div>

                    {isSelected && (
                      <>
                        {/* 4 Corner Resize Handles */}
                        <div
                          onMouseDown={startResize('nw')}
                          className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-emerald-400 border border-slate-950 rounded-sm cursor-nwse-resize z-30"
                        />
                        <div
                          onMouseDown={startResize('ne')}
                          className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 border border-slate-950 rounded-sm cursor-nesw-resize z-30"
                        />
                        <div
                          onMouseDown={startResize('sw')}
                          className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-emerald-400 border border-slate-950 rounded-sm cursor-nesw-resize z-30"
                        />
                        <div
                          onMouseDown={startResize('se')}
                          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-emerald-400 border border-slate-950 rounded-sm cursor-nwse-resize z-30"
                        />

                        <div
                          className="absolute -top-8 right-0 flex items-center gap-1 bg-slate-900 border border-slate-700 text-white px-2 py-0.5 rounded shadow-xl text-[10px] z-30 whitespace-nowrap"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <span className="text-slate-400 truncate max-w-[120px]">{imgElem.label || t('pdf_editor_image_label', 'Image')}</span>
                          <div className="w-px h-3 bg-slate-700" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              rotateSelectedImage();
                            }}
                            className="hover:text-cyan-400 p-0.5"
                            title={t('pdf_editor_rotate_90', 'Rotate 90°')}
                          >
                            <RotateCw className="w-3 h-3 text-cyan-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteElement(imgElem.id);
                            }}
                            className="hover:text-rose-400 p-0.5"
                            title={t('pdf_editor_delete_element', 'Delete')}
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

            {/* 7. Freehand Pen Strokes */}
            <svg className="absolute inset-0 z-15 pointer-events-none w-full h-full">
              {drawingStrokes
                .filter(s => s.pageIndex === activePageIndex)
                .map(stroke => (
                  <path
                    key={stroke.id}
                    d={stroke.points.reduce(
                      (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x * zoomScale} ${pt.y * zoomScale}`,
                      ''
                    )}
                    stroke={stroke.color}
                    strokeWidth={stroke.width * zoomScale}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}

              {currentStroke && currentStroke.length > 1 && (
                <path
                  d={currentStroke.reduce(
                    (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x * zoomScale} ${pt.y * zoomScale}`,
                    ''
                  )}
                  stroke={penColor}
                  strokeWidth={penWidth * zoomScale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* MODAL 1: In-Place Text Editor Modal */}
      {editingTextElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-sky-400" />
                <span className="font-semibold text-sm">
                  {editingTextElement.originalText
                    ? t('pdf_editor_tool_edit_text', 'Edit Text')
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

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">
                  {t('pdf_editor_font_family', 'Font Family')}:
                </label>
                <div className="max-h-48 overflow-y-auto pr-1 space-y-2 border border-slate-800/80 rounded-xl p-2 bg-slate-950/50">
                  {(['sans', 'serif', 'mono', 'display'] as const).map(cat => {
                    const catKey =
                      cat === 'sans'
                        ? 'pdf_editor_font_category_sans'
                        : cat === 'serif'
                        ? 'pdf_editor_font_category_serif'
                        : cat === 'mono'
                        ? 'pdf_editor_font_category_mono'
                        : 'pdf_editor_font_category_display';
                    return (
                      <div key={cat}>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 px-1">
                          {t(catKey, cat)}
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {AVAILABLE_FONTS.filter(f => f.category === cat).map(f => (
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
                    );
                  })}
                </div>
              </div>

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
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-6 h-5 rounded bg-transparent cursor-pointer border-0 p-0"
                    />
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 text-slate-100">
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
                {t('pdf_editor_quick_stamps', 'Quick Approval Stamps')}
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
                  <span className="text-slate-500 italic">{t('pdf_editor_sign_hint', 'Sign with your mouse or touchscreen')}</span>
                  <button onClick={clearSigCanvas} className="text-rose-400 hover:underline">
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
                    <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                      {t('pdf_editor_click_to_place', 'Click to insert')}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {sigMode === 'upload' && (
              <div className="mt-4 p-6 border-2 border-dashed border-slate-800 rounded-xl text-center">
                <input
                  type="file"
                  accept="image/*"
                  id="sig-file-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        handleInsertSignature(reader.result, t('pdf_editor_uploaded_signature', 'Uploaded Signature'));
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <label htmlFor="sig-file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                  <Upload className="w-8 h-8 text-teal-400" />
                  <span className="text-xs font-medium text-slate-300">
                    {t('pdf_editor_upload_signature', 'Upload Image')} (PNG / JPG / WebP)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {t('pdf_editor_transparent_png_hint', 'Transparent PNG recommended')}
                  </span>
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
                    handleInsertSignature(canvas.toDataURL('image/png'), t('pdf_editor_digital_signature', 'Digital Signature'));
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 text-slate-100">
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

      {/* MODAL 4: Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 text-slate-100">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <RefreshCw className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-sm">{t('pdf_editor_reset', 'Reset to Original')}</span>
            </div>
            <p className="mt-4 text-xs text-slate-300">
              {t('pdf_editor_reset_confirm', 'Revert all modifications to the initial file?')}
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                {t('pdf_editor_cancel', 'Cancel')}
              </button>
              <button
                onClick={confirmResetDocument}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-400 rounded-xl shadow-md transition-colors"
              >
                {t('pdf_editor_reset', 'Reset to Original')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
