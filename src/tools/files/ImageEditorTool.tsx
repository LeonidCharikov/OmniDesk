import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Sliders,
  Download,
  Copy,
  Check,
  AlertCircle,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Redo2,
  Image as ImageIcon,
  FileUp,
  Sparkles,
  Type,
  Pencil,
  Eraser,
  Eye,
  Link,
  Unlink,
  RefreshCw,
  Layers,
  Palette,
  Sun,
  Contrast,
  CheckSquare,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { saveBinaryWithDialog } from '../../services/fileSystemService';

interface TextOverlayState {
  enabled: boolean;
  text: string;
  fontSize: number;
  color: string;
  bgColor: string;
  position: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';
  opacity: number;
}

interface CensorBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'blackout' | 'pixelate';
}

interface DrawingStroke {
  points: Array<{ x: number; y: number }>;
  color: string;
  size: number;
  isEraser: boolean;
}

interface EditorStateSnapshot {
  width: number;
  height: number;
  lockAspect: boolean;
  resizeMode: 'resample' | 'canvas';
  canvasBgColor: string;
  rotation: number;
  fineAngle: number;
  flipH: boolean;
  flipV: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  hue: number;
  blur: number;
  sepia: number;
  grayscale: number;
  invert: number;
  vignette: number;
  textOverlay: TextOverlayState;
  drawings: DrawingStroke[];
  censorBoxes: CensorBox[];
}

export const ImageEditorTool: React.FC = () => {
  const { t } = useI18n();

  // Primary image states
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('photo.jpg');
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);
  const [originalFileSize, setOriginalFileSize] = useState<number>(0);

  // Active Dimensions & Scaling
  const [width, setWidth] = useState<number>(1200);
  const [height, setHeight] = useState<number>(800);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number>(1.5);
  const [scalePercent, setScalePercent] = useState<number>(100);
  const [resizeMode, setResizeMode] = useState<'resample' | 'canvas'>('resample');
  const [canvasBgColor, setCanvasBgColor] = useState<string>('transparent');

  // Transformations
  const [rotation, setRotation] = useState<number>(0);
  const [fineAngle, setFineAngle] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Color & Adjustments
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [warmth, setWarmth] = useState<number>(0);
  const [hue, setHue] = useState<number>(0);
  const [blur, setBlur] = useState<number>(0);
  const [sepia, setSepia] = useState<number>(0);
  const [grayscale, setGrayscale] = useState<number>(0);
  const [invert, setInvert] = useState<number>(0);
  const [vignette, setVignette] = useState<number>(0);

  // Annotations, Drawing & Censor
  const [textOverlay, setTextOverlay] = useState<TextOverlayState>({
    enabled: false,
    text: '',
    fontSize: 36,
    color: '#ffffff',
    bgColor: '#00000088',
    position: 'bottom-right',
    opacity: 90,
  });
  const [drawings, setDrawings] = useState<DrawingStroke[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [brushColor, setBrushColor] = useState<string>('#ef4444');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [censorBoxes, setCensorBoxes] = useState<CensorBox[]>([]);

  // Crop State
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [cropAspectRatio, setCropAspectRatio] = useState<string>('free');

  // Viewport & Zoom
  const [zoom, setZoom] = useState<number>(1);
  const [isComparingOriginal, setIsComparingOriginal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'resize' | 'crop' | 'adjust' | 'annotate' | 'export'>('resize');

  // Export parameters
  const [exportFormat, setExportFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/jpeg');
  const [exportQuality, setExportQuality] = useState<number>(90);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // History Stacks
  const [history, setHistory] = useState<EditorStateSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorStateSnapshot[]>([]);

  // Canvas Refs
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingCropRef = useRef<string | null>(null);
  const cropStartPosRef = useRef<{ mouseX: number; mouseY: number; rect: typeof cropRect }>({
    mouseX: 0,
    mouseY: 0,
    rect: { x: 0, y: 0, width: 0, height: 0 },
  });
  const isMouseDownRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);

  // Helper: Snapshot current state
  const getCurrentSnapshot = useCallback((): EditorStateSnapshot => {
    return {
      width,
      height,
      lockAspect,
      resizeMode,
      canvasBgColor,
      rotation,
      fineAngle,
      flipH,
      flipV,
      brightness,
      contrast,
      saturation,
      warmth,
      hue,
      blur,
      sepia,
      grayscale,
      invert,
      vignette,
      textOverlay: { ...textOverlay },
      drawings: [...drawings],
      censorBoxes: [...censorBoxes],
    };
  }, [
    width,
    height,
    lockAspect,
    resizeMode,
    canvasBgColor,
    rotation,
    fineAngle,
    flipH,
    flipV,
    brightness,
    contrast,
    saturation,
    warmth,
    hue,
    blur,
    sepia,
    grayscale,
    invert,
    vignette,
    textOverlay,
    drawings,
    censorBoxes,
  ]);

  // Push state to history
  const pushHistory = useCallback(() => {
    const current = getCurrentSnapshot();
    setHistory(prev => [...prev.slice(-25), current]);
    setRedoStack([]);
  }, [getCurrentSnapshot]);

  // Apply snapshot
  const applySnapshot = (snapshot: EditorStateSnapshot) => {
    setWidth(snapshot.width);
    setHeight(snapshot.height);
    setLockAspect(snapshot.lockAspect);
    setResizeMode(snapshot.resizeMode);
    setCanvasBgColor(snapshot.canvasBgColor);
    setRotation(snapshot.rotation);
    setFineAngle(snapshot.fineAngle);
    setFlipH(snapshot.flipH);
    setFlipV(snapshot.flipV);
    setBrightness(snapshot.brightness);
    setContrast(snapshot.contrast);
    setSaturation(snapshot.saturation);
    setWarmth(snapshot.warmth);
    setHue(snapshot.hue);
    setBlur(snapshot.blur);
    setSepia(snapshot.sepia);
    setGrayscale(snapshot.grayscale);
    setInvert(snapshot.invert);
    setVignette(snapshot.vignette);
    setTextOverlay(snapshot.textOverlay);
    setDrawings(snapshot.drawings);
    setCensorBoxes(snapshot.censorBoxes);
  };

  // Undo
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const current = getCurrentSnapshot();
    setRedoStack(prev => [...prev, current]);
    setHistory(prev => prev.slice(0, -1));
    applySnapshot(previous);
  };

  // Redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = getCurrentSnapshot();
    setHistory(prev => [...prev, current]);
    setRedoStack(prev => prev.slice(0, -1));
    applySnapshot(next);
  };

  // Load new image from File
  const loadImageFromFile = useCallback((newFile: File) => {
    const url = URL.createObjectURL(newFile);
    const img = new Image();
    img.onload = () => {
      setSourceImage(img);
      setOriginalWidth(img.width);
      setOriginalHeight(img.height);
      setOriginalFileSize(newFile.size);
      setWidth(img.width);
      setHeight(img.height);
      const ratio = img.height > 0 ? img.width / img.height : 1;
      setAspectRatio(ratio);
      setScalePercent(100);
      setFile(newFile);
      setFileName(newFile.name);

      // Reset transformations
      setRotation(0);
      setFineAngle(0);
      setFlipH(false);
      setFlipV(false);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setWarmth(0);
      setHue(0);
      setBlur(0);
      setSepia(0);
      setGrayscale(0);
      setInvert(0);
      setVignette(0);
      setDrawings([]);
      setCensorBoxes([]);
      setIsCropping(false);
      setHistory([]);
      setRedoStack([]);
      setStatusMessage('');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  // Generate Sample Photo (Instant, high-res crisp landscape)
  const loadSamplePhoto = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sky gradient (Sunset twilight)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 1080);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.3, '#312e81');
    skyGrad.addColorStop(0.55, '#831843');
    skyGrad.addColorStop(0.75, '#ea580c');
    skyGrad.addColorStop(1, '#fde047');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Glowing sun
    const sunGrad = ctx.createRadialGradient(960, 680, 20, 960, 680, 260);
    sunGrad.addColorStop(0, '#fffbeb');
    sunGrad.addColorStop(0.2, '#fef08a');
    sunGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.4)');
    sunGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(960, 680, 260, 0, Math.PI * 2);
    ctx.fill();

    // Far mountains
    ctx.fillStyle = '#471435';
    ctx.beginPath();
    ctx.moveTo(0, 750);
    ctx.lineTo(280, 560);
    ctx.lineTo(540, 710);
    ctx.lineTo(820, 510);
    ctx.lineTo(1100, 690);
    ctx.lineTo(1420, 480);
    ctx.lineTo(1700, 680);
    ctx.lineTo(1920, 590);
    ctx.lineTo(1920, 1080);
    ctx.lineTo(0, 1080);
    ctx.closePath();
    ctx.fill();

    // Mid mountains with snow caps
    ctx.fillStyle = '#260b24';
    ctx.beginPath();
    ctx.moveTo(0, 830);
    ctx.lineTo(380, 620);
    ctx.lineTo(760, 790);
    ctx.lineTo(1050, 610);
    ctx.lineTo(1380, 810);
    ctx.lineTo(1680, 640);
    ctx.lineTo(1920, 780);
    ctx.lineTo(1920, 1080);
    ctx.lineTo(0, 1080);
    ctx.closePath();
    ctx.fill();

    // Lake water reflection
    const waterGrad = ctx.createLinearGradient(0, 820, 0, 1080);
    waterGrad.addColorStop(0, '#1c1917');
    waterGrad.addColorStop(0.4, '#1e1b4b');
    waterGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 820, 1920, 260);

    // Light reflection on water
    const reflectGrad = ctx.createLinearGradient(960, 820, 960, 1080);
    reflectGrad.addColorStop(0, 'rgba(253, 224, 71, 0.5)');
    reflectGrad.addColorStop(0.5, 'rgba(234, 88, 12, 0.25)');
    reflectGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = reflectGrad;
    ctx.beginPath();
    ctx.moveTo(900, 820);
    ctx.lineTo(1020, 820);
    ctx.lineTo(1140, 1080);
    ctx.lineTo(780, 1080);
    ctx.closePath();
    ctx.fill();

    // Pine trees silhouettes
    ctx.fillStyle = '#050508';
    for (let x = 20; x < 1920; x += 35) {
      const treeH = 90 + Math.sin(x * 0.05) * 45;
      const baseY = 840 + Math.sin(x * 0.02) * 15;
      ctx.beginPath();
      ctx.moveTo(x, baseY - treeH);
      ctx.lineTo(x - 16, baseY);
      ctx.lineTo(x + 16, baseY);
      ctx.closePath();
      ctx.fill();
    }

    canvas.toBlob(blob => {
      if (blob) {
        const sampleFile = new File([blob], 'sunset-landscape-sample.jpg', { type: 'image/jpeg' });
        loadImageFromFile(sampleFile);
      }
    }, 'image/jpeg', 0.95);
  }, [loadImageFromFile]);

  // Window paste listener for quick clipboard image import
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const pastedFile = items[i].getAsFile();
          if (pastedFile) {
            loadImageFromFile(pastedFile);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadImageFromFile]);

  // Handle manual width change
  const handleWidthChange = (newW: number) => {
    const val = Math.max(10, Math.min(8000, Math.round(newW)));
    setWidth(val);
    if (lockAspect && aspectRatio > 0) {
      setHeight(Math.max(10, Math.round(val / aspectRatio)));
    }
  };

  // Handle manual height change
  const handleHeightChange = (newH: number) => {
    const val = Math.max(10, Math.min(8000, Math.round(newH)));
    setHeight(val);
    if (lockAspect && aspectRatio > 0) {
      setWidth(Math.max(10, Math.round(val * aspectRatio)));
    }
  };

  // Handle scale percent change
  const handleScalePercent = (pct: number) => {
    setScalePercent(pct);
    if (originalWidth > 0 && originalHeight > 0) {
      const newW = Math.round((originalWidth * pct) / 100);
      const newH = Math.round((originalHeight * pct) / 100);
      setWidth(newW);
      setHeight(newH);
    }
  };

  // Set resolution preset
  const setPresetResolution = (w: number, h: number) => {
    pushHistory();
    setWidth(w);
    setHeight(h);
    if (lockAspect) {
      setAspectRatio(w / h);
    }
  };

  // Apply crop
  const applyCrop = () => {
    if (!sourceImage || !isCropping) return;
    if (cropRect.width <= 10 || cropRect.height <= 10) {
      setIsCropping(false);
      return;
    }
    pushHistory();

    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(cropRect.width);
    offscreen.height = Math.round(cropRect.height);
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    // Draw crop area from the current scaled/composed render
    renderMainCanvas(offscreen, true);

    const croppedImg = new Image();
    croppedImg.onload = () => {
      setSourceImage(croppedImg);
      setOriginalWidth(croppedImg.width);
      setOriginalHeight(croppedImg.height);
      setWidth(croppedImg.width);
      setHeight(croppedImg.height);
      setAspectRatio(croppedImg.width / croppedImg.height);
      // Reset transformations since they are now baked into the cropped base
      setRotation(0);
      setFineAngle(0);
      setFlipH(false);
      setFlipV(false);
      setDrawings([]);
      setCensorBoxes([]);
      setIsCropping(false);
    };
    croppedImg.src = offscreen.toDataURL('image/png');
  };

  // Cancel crop
  const cancelCrop = () => {
    setIsCropping(false);
  };

  // Start crop mode
  const startCrop = () => {
    if (!sourceImage) return;
    setIsCropping(true);
    // Initialize crop rect to 80% centered inside width x height
    const initialW = Math.round(width * 0.8);
    const initialH = Math.round(height * 0.8);
    setCropRect({
      x: Math.round((width - initialW) / 2),
      y: Math.round((height - initialH) / 2),
      width: initialW,
      height: initialH,
    });
  };

  // Handle crop aspect ratio change
  const handleCropAspectChange = (aspect: string) => {
    setCropAspectRatio(aspect);
    if (aspect === 'free') return;
    let targetRatio = 1;
    if (aspect === '1:1') targetRatio = 1;
    else if (aspect === '16:9') targetRatio = 16 / 9;
    else if (aspect === '9:16') targetRatio = 9 / 16;
    else if (aspect === '4:3') targetRatio = 4 / 3;
    else if (aspect === '3:2') targetRatio = 3 / 2;

    const currentW = cropRect.width;
    const newH = Math.round(currentW / targetRatio);
    if (cropRect.y + newH <= height) {
      setCropRect(prev => ({ ...prev, height: newH }));
    } else {
      const clampedH = height - cropRect.y;
      const newW = Math.round(clampedH * targetRatio);
      setCropRect(prev => ({ ...prev, width: newW, height: clampedH }));
    }
  };

  // Style Presets
  const applyFilterPreset = (preset: string) => {
    pushHistory();
    // Default values
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setWarmth(0);
    setHue(0);
    setBlur(0);
    setSepia(0);
    setGrayscale(0);
    setInvert(0);
    setVignette(0);

    switch (preset) {
      case 'vivid':
        setBrightness(108);
        setContrast(125);
        setSaturation(145);
        setVignette(15);
        break;
      case 'bw':
        setGrayscale(100);
        setContrast(140);
        setBrightness(105);
        break;
      case 'vintage':
        setSepia(55);
        setContrast(90);
        setBrightness(105);
        setWarmth(25);
        setVignette(35);
        break;
      case 'cool':
        setWarmth(-45);
        setBrightness(102);
        setSaturation(110);
        break;
      case 'warm':
        setWarmth(45);
        setBrightness(105);
        setSaturation(120);
        setVignette(20);
        break;
      case 'cinematic':
        setContrast(130);
        setSaturation(85);
        setBrightness(95);
        setVignette(40);
        break;
      case 'cyberpunk':
        setHue(290);
        setSaturation(180);
        setContrast(135);
        setBrightness(110);
        break;
      case 'matte':
        setContrast(85);
        setBrightness(112);
        setSaturation(90);
        break;
      default:
        break;
    }
  };

  // Reset all adjustments
  const resetAdjustments = () => {
    pushHistory();
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setWarmth(0);
    setHue(0);
    setBlur(0);
    setSepia(0);
    setGrayscale(0);
    setInvert(0);
    setVignette(0);
  };

  // Reset transformations
  const resetOrientation = () => {
    pushHistory();
    setRotation(0);
    setFineAngle(0);
    setFlipH(false);
    setFlipV(false);
  };

  // Revert all to original
  const revertToOriginal = () => {
    if (!sourceImage) return;
    if (window.confirm(t('image_editor_revert_confirm', 'Opravdu vrátit fotografii do původního stavu?'))) {
      setWidth(originalWidth);
      setHeight(originalHeight);
      setAspectRatio(originalHeight > 0 ? originalWidth / originalHeight : 1);
      setScalePercent(100);
      setResizeMode('resample');
      setCanvasBgColor('transparent');
      setRotation(0);
      setFineAngle(0);
      setFlipH(false);
      setFlipV(false);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setWarmth(0);
      setHue(0);
      setBlur(0);
      setSepia(0);
      setGrayscale(0);
      setInvert(0);
      setVignette(0);
      setTextOverlay(prev => ({ ...prev, enabled: false }));
      setDrawings([]);
      setCensorBoxes([]);
      setIsCropping(false);
      setHistory([]);
      setRedoStack([]);
      setStatusMessage('');
    }
  };

  // Add Censor Box
  const addCensorBox = (type: 'blackout' | 'pixelate') => {
    pushHistory();
    const boxW = Math.round(width * 0.25);
    const boxH = Math.round(height * 0.15);
    const newBox: CensorBox = {
      id: Math.random().toString(36).substring(2, 9),
      x: Math.round((width - boxW) / 2),
      y: Math.round((height - boxH) / 2),
      width: boxW,
      height: boxH,
      type,
    };
    setCensorBoxes(prev => [...prev, newBox]);
  };

  // Main rendering routine: draws the current state onto any canvas target
  const renderMainCanvas = useCallback(
    (targetCanvas: HTMLCanvasElement, forCropping = false) => {
      if (!sourceImage) return;
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) return;

      const isRotatedQuarter = (rotation / 90) % 2 !== 0;
      const finalCanvasWidth = isRotatedQuarter ? height : width;
      const finalCanvasHeight = isRotatedQuarter ? width : height;

      if (!forCropping) {
        targetCanvas.width = finalCanvasWidth;
        targetCanvas.height = finalCanvasHeight;
      }

      ctx.save();
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

      // Canvas background color for expand mode
      if (canvasBgColor !== 'transparent') {
        ctx.fillStyle = canvasBgColor;
        ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
      }

      // If comparing original, render pristine original centered
      if (isComparingOriginal) {
        ctx.drawImage(sourceImage, 0, 0, targetCanvas.width, targetCanvas.height);
        ctx.restore();
        return;
      }

      // Build CSS filter string
      const filters: string[] = [];
      if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
      if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
      if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
      if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);
      if (blur > 0) filters.push(`blur(${blur}px)`);
      if (sepia > 0) filters.push(`sepia(${sepia}%)`);
      if (grayscale > 0) filters.push(`grayscale(${grayscale}%)`);
      if (invert > 0) filters.push(`invert(${invert}%)`);

      if (filters.length > 0) {
        ctx.filter = filters.join(' ');
      }

      // Transformations
      ctx.translate(targetCanvas.width / 2, targetCanvas.height / 2);
      const totalAngle = ((rotation + fineAngle) * Math.PI) / 180;
      ctx.rotate(totalAngle);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

      // Draw image
      if (resizeMode === 'resample') {
        ctx.drawImage(sourceImage, -width / 2, -height / 2, width, height);
      } else {
        // Center original content within canvas
        ctx.drawImage(sourceImage, -originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight);
      }

      ctx.restore();

      // Post-transformation pixel overlays: Temperature / Warmth
      if (warmth !== 0) {
        ctx.save();
        ctx.globalCompositeOperation = warmth > 0 ? 'color' : 'color';
        ctx.fillStyle = warmth > 0 ? `rgba(255, 160, 40, ${Math.abs(warmth) / 300})` : `rgba(40, 140, 255, ${Math.abs(warmth) / 300})`;
        ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.restore();
      }

      // Vignette effect
      if (vignette > 0) {
        ctx.save();
        const maxRadius = Math.sqrt(Math.pow(targetCanvas.width / 2, 2) + Math.pow(targetCanvas.height / 2, 2));
        const vigGrad = ctx.createRadialGradient(
          targetCanvas.width / 2,
          targetCanvas.height / 2,
          maxRadius * 0.45,
          targetCanvas.width / 2,
          targetCanvas.height / 2,
          maxRadius
        );
        vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vigGrad.addColorStop(1, `rgba(0, 0, 0, ${(vignette / 100) * 0.85})`);
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
        ctx.restore();
      }

      // Censor Boxes
      for (const box of censorBoxes) {
        ctx.save();
        if (box.type === 'blackout') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(box.x, box.y, box.width, box.height);
        } else {
          // Pixelate
          const size = 12;
          const w = Math.max(1, box.width);
          const h = Math.max(1, box.height);
          const sample = ctx.getImageData(box.x, box.y, w, h);
          ctx.imageSmoothingEnabled = false;
          // Render low-res offscreen then upscale
          const mini = document.createElement('canvas');
          mini.width = Math.max(1, Math.round(w / size));
          mini.height = Math.max(1, Math.round(h / size));
          const miniCtx = mini.getContext('2d');
          if (miniCtx) {
            miniCtx.putImageData(sample, 0, 0);
            ctx.drawImage(mini, box.x, box.y, w, h);
          }
        }
        ctx.restore();
      }

      // Render Drawings / Brush strokes
      for (const stroke of drawings) {
        if (stroke.points.length < 2) continue;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stroke.size;
        if (stroke.isEraser) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
          ctx.strokeStyle = stroke.color;
        }
        ctx.stroke();
        ctx.restore();
      }

      // Render Text Overlay
      if (textOverlay.enabled && textOverlay.text.trim()) {
        ctx.save();
        ctx.font = `600 ${textOverlay.fontSize}px sans-serif`;
        const textMetrics = ctx.measureText(textOverlay.text);
        const textW = textMetrics.width;
        const textH = textOverlay.fontSize;
        const padding = 16;
        let posX = padding;
        let posY = textH + padding;

        if (textOverlay.position === 'top-right') {
          posX = targetCanvas.width - textW - padding * 2;
          posY = textH + padding;
        } else if (textOverlay.position === 'center') {
          posX = (targetCanvas.width - textW) / 2;
          posY = (targetCanvas.height + textH) / 2;
        } else if (textOverlay.position === 'bottom-left') {
          posX = padding;
          posY = targetCanvas.height - padding * 1.5;
        } else if (textOverlay.position === 'bottom-right') {
          posX = targetCanvas.width - textW - padding * 2;
          posY = targetCanvas.height - padding * 1.5;
        }

        ctx.globalAlpha = textOverlay.opacity / 100;
        // Background badge
        if (textOverlay.bgColor !== 'transparent') {
          ctx.fillStyle = textOverlay.bgColor;
          ctx.fillRect(posX - 10, posY - textH, textW + 20, textH + 14);
        }
        // Text
        ctx.fillStyle = textOverlay.color;
        ctx.fillText(textOverlay.text, posX, posY);
        ctx.restore();
      }
    },
    [
      sourceImage,
      width,
      height,
      rotation,
      fineAngle,
      flipH,
      flipV,
      brightness,
      contrast,
      saturation,
      warmth,
      hue,
      blur,
      sepia,
      grayscale,
      invert,
      vignette,
      resizeMode,
      canvasBgColor,
      isComparingOriginal,
      originalWidth,
      originalHeight,
      textOverlay,
      drawings,
      censorBoxes,
    ]
  );

  // Live Canvas Updates & Size Estimation
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !sourceImage) return;
    renderMainCanvas(canvas);

    // Calculate estimated file size
    const timer = setTimeout(() => {
      const q = exportFormat === 'image/png' ? undefined : exportQuality / 100;
      canvas.toBlob(
        blob => {
          if (blob) {
            setEstimatedSize(blob.size);
          }
        },
        exportFormat,
        q
      );
    }, 200);

    return () => clearTimeout(timer);
  }, [renderMainCanvas, sourceImage, exportFormat, exportQuality]);

  // Mouse handlers for Drawing & Cropping
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!previewCanvasRef.current) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const scaleX = previewCanvasRef.current.width / rect.width;
    const scaleY = previewCanvasRef.current.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    if (isDrawingMode) {
      isMouseDownRef.current = true;
      currentStrokeRef.current = {
        points: [{ x: canvasX, y: canvasY }],
        color: brushColor,
        size: brushSize,
        isEraser,
      };
      return;
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDownRef.current || !previewCanvasRef.current || !isDrawingMode) return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const scaleX = previewCanvasRef.current.width / rect.width;
    const scaleY = previewCanvasRef.current.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push({ x: canvasX, y: canvasY });
      // Redraw
      const canvas = previewCanvasRef.current;
      renderMainCanvas(canvas);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.beginPath();
        const stroke = currentStrokeRef.current;
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = stroke.size;
        ctx.strokeStyle = stroke.isEraser ? '#ffffff' : stroke.color;
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDrawingMode && currentStrokeRef.current) {
      pushHistory();
      setDrawings(prev => [...prev, currentStrokeRef.current!]);
      currentStrokeRef.current = null;
    }
    isMouseDownRef.current = false;
  };

  // Crop Dragging Handlers
  const handleCropHandleMouseDown = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    isDraggingCropRef.current = handle;
    cropStartPosRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      rect: { ...cropRect },
    };
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingCropRef.current || !isCropping || !previewCanvasRef.current) return;
      const canvas = previewCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const deltaX = (e.clientX - cropStartPosRef.current.mouseX) * scaleX;
      const deltaY = (e.clientY - cropStartPosRef.current.mouseY) * scaleY;
      const prevRect = cropStartPosRef.current.rect;

      const handle = isDraggingCropRef.current;
      let newX = prevRect.x;
      let newY = prevRect.y;
      let newW = prevRect.width;
      let newH = prevRect.height;

      if (handle === 'move') {
        newX = Math.max(0, Math.min(canvas.width - prevRect.width, prevRect.x + deltaX));
        newY = Math.max(0, Math.min(canvas.height - prevRect.height, prevRect.y + deltaY));
      } else {
        if (handle.includes('e')) newW = Math.max(30, Math.min(canvas.width - prevRect.x, prevRect.width + deltaX));
        if (handle.includes('s')) newH = Math.max(30, Math.min(canvas.height - prevRect.y, prevRect.height + deltaY));
        if (handle.includes('w')) {
          const clamped = Math.min(prevRect.width - 30, deltaX);
          newX = Math.max(0, prevRect.x + clamped);
          newW = prevRect.width - (newX - prevRect.x);
        }
        if (handle.includes('n')) {
          const clamped = Math.min(prevRect.height - 30, deltaY);
          newY = Math.max(0, prevRect.y + clamped);
          newH = prevRect.height - (newY - prevRect.y);
        }
      }

      setCropRect({
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    };

    const handleGlobalMouseUp = () => {
      isDraggingCropRef.current = null;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isCropping]);

  // Export & Save File
  const handleExportSave = async () => {
    if (!previewCanvasRef.current || !sourceImage) return;
    const canvas = document.createElement('canvas');
    renderMainCanvas(canvas);

    const ext = exportFormat === 'image/jpeg' ? 'jpg' : exportFormat === 'image/png' ? 'png' : 'webp';
    const filterName = exportFormat === 'image/jpeg' ? 'JPEG (*.jpg)' : exportFormat === 'image/png' ? 'PNG (*.png)' : 'WebP (*.webp)';
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const q = exportFormat === 'image/png' ? undefined : exportQuality / 100;

    canvas.toBlob(async blob => {
      if (!blob) return;
      const res = await saveBinaryWithDialog(
        `${baseName}-edited.${ext}`,
        blob,
        exportFormat,
        [{ name: filterName, extensions: [ext] }],
        t('image_editor_save_dialog_title', 'Uložit upravený obrázek jako')
      );
      if (res.success) {
        setIsSuccess(true);
        setStatusMessage(t('image_editor_saved_success', 'Obrázek byl úspěšně vyexportován a uložen!'));
        setTimeout(() => setStatusMessage(''), 4000);
      }
    }, exportFormat, q);
  };

  // Copy to Clipboard
  const handleCopyToClipboard = async () => {
    if (!previewCanvasRef.current) return;
    const canvas = document.createElement('canvas');
    renderMainCanvas(canvas);

    canvas.toBlob(async blob => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        console.error('Failed to copy to clipboard', err);
      }
    }, 'image/png');
  };

  // Compute aspect ratio text
  const aspectRatioDisplay = useMemo(() => {
    if (width <= 0 || height <= 0) return '1:1';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const d = gcd(Math.round(width), Math.round(height));
    const simpW = Math.round(width / d);
    const simpH = Math.round(height / d);
    if (simpW <= 16 && simpH <= 16) return `${simpW}:${simpH}`;
    return (width / height).toFixed(2) + ':1';
  }, [width, height]);

  // Common UI styles
  const btnPrimary =
    'px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm';
  const btnSecondary =
    'px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 border border-slate-700/60';
  const inputStyle =
    'w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-xs text-slate-200 font-mono';
  const labelStyle = 'block text-[11px] font-medium text-slate-400 mb-1';

  return (
    <div className="space-y-4 max-w-full">
      {/* Header banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
            {t('image_editor_title', 'Editor obrázků')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('image_editor_desc', 'Vizuální editor fotografií: změna šířky a výšky, ořez, rotace, filtry, vodoznaky a export.')}
          </p>
        </div>

        {sourceImage && (
          <div className="flex flex-wrap items-center gap-2">
            <label className={btnSecondary + ' cursor-pointer'}>
              <FileUp className="w-3.5 h-3.5" />
              {t('image_editor_replace_photo', 'Otevřít jiný obrázek')}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) loadImageFromFile(f);
                }}
              />
            </label>
            <button type="button" className={btnSecondary} onClick={revertToOriginal} title={t('image_editor_revert_original', 'Obnovit původní')}>
              <RefreshCw className="w-3.5 h-3.5" />
              {t('image_editor_revert_original', 'Obnovit původní')}
            </button>
          </div>
        )}
      </div>

      {/* When NO IMAGE is loaded: Dropzone & Upload Actions */}
      {!sourceImage && (
        <div
          className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-10 text-center transition-all bg-slate-950/40 space-y-5"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const dropped = e.dataTransfer.files?.[0];
            if (dropped && dropped.type.startsWith('image/')) {
              loadImageFromFile(dropped);
            }
          }}
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
            <ImageIcon className="w-8 h-8" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-semibold text-white">{t('image_editor_upload_title', 'Načíst obrázek k úpravě')}</h3>
            <p className="text-xs text-slate-400">{t('image_editor_drag_drop_hint', 'Přetáhněte sem obrázek myší nebo zvolte možnost níže')}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <label className={btnPrimary + ' px-4 py-2 text-sm cursor-pointer'}>
              <FileUp className="w-4 h-4" />
              {t('image_editor_choose_file', 'Vybrat obrázek z počítače')}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) loadImageFromFile(f);
                }}
              />
            </label>

            <button type="button" className={btnSecondary + ' px-4 py-2 text-sm'} onClick={loadSamplePhoto}>
              <Sparkles className="w-4 h-4 text-amber-400" />
              {t('image_editor_sample_photo', 'Načíst ukázkovou fotografii')}
            </button>
          </div>

          <div className="pt-3">
            <p className="text-[11px] text-slate-500 font-mono">{t('image_editor_paste_hint', 'Tip: Můžete také stisknout Ctrl+V pro vložení obrázku ze schránky')}</p>
          </div>
        </div>
      )}

      {/* When IMAGE IS LOADED: Full Studio Workspace */}
      {sourceImage && (
        <div className="space-y-4">
          {/* Main Top Bar: Info & Quick Action Controls */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Image specs summary */}
            <div className="flex flex-wrap items-center gap-3 text-slate-300">
              <span className="font-medium text-white truncate max-w-[180px]">{fileName}</span>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-indigo-300">
                {width} × {height} {t('image_editor_pixels', 'px')}
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-slate-400">{aspectRatioDisplay}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">
                {originalFileSize > 0 ? `${(originalFileSize / 1024).toFixed(0)} KB` : ''}
                {estimatedSize ? ` → ~${(estimatedSize / 1024).toFixed(0)} KB` : ''}
              </span>
            </div>

            {/* Quick Actions: Undo, Redo, Zoom, Compare */}
            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              <button
                type="button"
                className={btnSecondary}
                onClick={handleUndo}
                disabled={history.length === 0}
                title={t('image_editor_undo', 'Zpět (Ctrl+Z)')}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                title={t('image_editor_redo', 'Znovu (Ctrl+Y)')}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              <button
                type="button"
                className={btnSecondary}
                onClick={() => setZoom(z => Math.max(0.15, Number((z - 0.15).toFixed(2))))}
                title={t('image_editor_zoom_out', 'Oddálit')}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className={btnSecondary + ' font-mono text-[11px] min-w-12'}
                onClick={() => setZoom(1)}
                title={t('image_editor_zoom_100', '100% velikost')}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setZoom(z => Math.min(3, Number((z + 0.15).toFixed(2))))}
                title={t('image_editor_zoom_in', 'Přiblížit')}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              {/* Compare with original button */}
              <button
                type="button"
                className={isComparingOriginal ? btnPrimary : btnSecondary}
                onMouseDown={() => setIsComparingOriginal(true)}
                onMouseUp={() => setIsComparingOriginal(false)}
                onTouchStart={() => setIsComparingOriginal(true)}
                onTouchEnd={() => setIsComparingOriginal(false)}
                title={t('image_editor_compare_hold', 'Podržet pro zobrazení původního obrázku')}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isComparingOriginal ? t('image_editor_compare_active', 'Původní') : t('image_editor_compare_hold', 'Porovnat')}</span>
              </button>
            </div>
          </div>

          {/* Interactive Workspace Canvas Display */}
          <div
            ref={containerRef}
            className="relative w-full min-h-[420px] max-h-[580px] rounded-2xl border border-slate-800 overflow-auto flex items-center justify-center p-6 bg-slate-950 select-none shadow-2xl"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #0f172a 25%, transparent 25%), linear-gradient(-45deg, #0f172a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0f172a 75%), linear-gradient(-45deg, transparent 75%, #0f172a 75%)',
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
            }}
          >
            {/* Canvas Container with smooth scaling */}
            <div
              className="relative transition-transform duration-75 origin-center shadow-2xl"
              style={{
                transform: `scale(${zoom})`,
              }}
            >
              <canvas
                ref={previewCanvasRef}
                className="rounded-lg shadow-2xl cursor-crosshair block"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              />

              {/* Interactive Crop Box Overlay */}
              {isCropping && previewCanvasRef.current && (
                <div
                  className="absolute inset-0 pointer-events-auto"
                  style={{
                    width: `${previewCanvasRef.current.width}px`,
                    height: `${previewCanvasRef.current.height}px`,
                  }}
                >
                  {/* Surrounding Dim Backdrop */}
                  <div
                    className="absolute bg-black/65 border border-white/20"
                    style={{
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: `${cropRect.y}px`,
                    }}
                  />
                  <div
                    className="absolute bg-black/65 border border-white/20"
                    style={{
                      left: 0,
                      top: `${cropRect.y + cropRect.height}px`,
                      width: '100%',
                      height: `${previewCanvasRef.current.height - (cropRect.y + cropRect.height)}px`,
                    }}
                  />
                  <div
                    className="absolute bg-black/65 border border-white/20"
                    style={{
                      left: 0,
                      top: `${cropRect.y}px`,
                      width: `${cropRect.x}px`,
                      height: `${cropRect.height}px`,
                    }}
                  />
                  <div
                    className="absolute bg-black/65 border border-white/20"
                    style={{
                      left: `${cropRect.x + cropRect.width}px`,
                      top: `${cropRect.y}px`,
                      width: `${previewCanvasRef.current.width - (cropRect.x + cropRect.width)}px`,
                      height: `${cropRect.height}px`,
                    }}
                  />

                  {/* Active Crop Frame */}
                  <div
                    className="absolute border-2 border-white shadow-2xl cursor-move"
                    style={{
                      left: `${cropRect.x}px`,
                      top: `${cropRect.y}px`,
                      width: `${cropRect.width}px`,
                      height: `${cropRect.height}px`,
                    }}
                    onMouseDown={e => handleCropHandleMouseDown('move', e)}
                  >
                    {/* Rule of thirds grid lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                      <div className="border-r border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-b border-white" />
                      <div className="border-r border-white" />
                      <div className="border-r border-white" />
                      <div />
                    </div>

                    {/* Corner & Edge Drag Handles */}
                    <div
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-slate-900 rounded-sm cursor-nwse-resize shadow"
                      onMouseDown={e => handleCropHandleMouseDown('nw', e)}
                    />
                    <div
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-slate-900 rounded-sm cursor-nesw-resize shadow"
                      onMouseDown={e => handleCropHandleMouseDown('ne', e)}
                    />
                    <div
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-slate-900 rounded-sm cursor-nesw-resize shadow"
                      onMouseDown={e => handleCropHandleMouseDown('sw', e)}
                    />
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-slate-900 rounded-sm cursor-nwse-resize shadow"
                      onMouseDown={e => handleCropHandleMouseDown('se', e)}
                    />
                    <div
                      className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-5 bg-white border border-slate-900 rounded-sm cursor-ew-resize shadow"
                      onMouseDown={e => handleCropHandleMouseDown('w', e)}
                    />
                    <div
                      className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-5 bg-white border border-slate-900 rounded-sm cursor-ew-resize shadow"
                      onMouseDown={e => handleCropHandleMouseDown('e', e)}
                    />
                    <div
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-3 bg-white border border-slate-900 rounded-sm cursor-ns-resize shadow"
                      onMouseDown={e => handleCropHandleMouseDown('n', e)}
                    />
                    <div
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-3 bg-white border border-slate-900 rounded-sm cursor-ns-resize shadow"
                      onMouseDown={e => handleCropHandleMouseDown('s', e)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Floating crop action buttons directly in viewport */}
            {isCropping && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md z-30">
                <button type="button" className={btnPrimary} onClick={applyCrop}>
                  <Check className="w-3.5 h-3.5" />
                  {t('image_editor_crop_apply', 'Použít ořez')}
                </button>
                <button type="button" className={btnSecondary} onClick={cancelCrop}>
                  {t('image_editor_crop_cancel', 'Zrušit')}
                </button>
              </div>
            )}
          </div>

          {/* Tab Navigation Toolbar (Anti-Pill clean segmented buttons) */}
          <div className="p-1.5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-wrap gap-1">
            <button
              type="button"
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'resize' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              onClick={() => setActiveTab('resize')}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              {t('image_editor_tab_resize', 'Rozměry a velikost')}
            </button>

            <button
              type="button"
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'crop' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              onClick={() => setActiveTab('crop')}
            >
              <Crop className="w-3.5 h-3.5" />
              {t('image_editor_tab_crop', 'Ořez a otočení')}
            </button>

            <button
              type="button"
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'adjust' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              onClick={() => setActiveTab('adjust')}
            >
              <Sliders className="w-3.5 h-3.5" />
              {t('image_editor_tab_adjust', 'Filtry a barvy')}
            </button>

            <button
              type="button"
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'annotate' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              onClick={() => setActiveTab('annotate')}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t('image_editor_tab_annotate', 'Text a kreslení')}
            </button>

            <button
              type="button"
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ml-auto ${
                activeTab === 'export' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/60'
              }`}
              onClick={() => setActiveTab('export')}
            >
              <Download className="w-3.5 h-3.5" />
              {t('image_editor_tab_export', 'Export a uložení')}
            </button>
          </div>

          {/* Tab 1: RESIZE & DIMENSIONS */}
          {activeTab === 'resize' && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Width & Height manual inputs with Aspect Lock */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">{t('image_editor_dimensions', 'Rozměry obrázku')}</span>
                    <button
                      type="button"
                      className={`text-xs px-2 py-1 rounded flex items-center gap-1.5 transition-colors ${
                        lockAspect ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/50' : 'bg-slate-800 text-slate-400'
                      }`}
                      onClick={() => {
                        const nextLock = !lockAspect;
                        setLockAspect(nextLock);
                        if (nextLock && height > 0) setAspectRatio(width / height);
                      }}
                      title={lockAspect ? t('image_editor_lock_aspect', 'Zamknout poměr stran') : t('image_editor_unlock_aspect', 'Odemčeno')}
                    >
                      {lockAspect ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
                      <span>{lockAspect ? t('image_editor_lock_aspect', 'Zamčeno') : t('image_editor_unlock_aspect', 'Volné')}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={labelStyle}>{t('image_editor_width', 'Šířka (px)')}</label>
                      <input
                        type="number"
                        className={inputStyle}
                        value={width}
                        min={10}
                        max={8000}
                        onChange={e => handleWidthChange(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className={labelStyle}>{t('image_editor_height', 'Výška (px)')}</label>
                      <input
                        type="number"
                        className={inputStyle}
                        value={height}
                        min={10}
                        max={8000}
                        onChange={e => handleHeightChange(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Percentage buttons */}
                  <div>
                    <label className={labelStyle}>{t('image_editor_scale_percent', 'Měřítko')}</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[25, 50, 75, 100, 150].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          className={scalePercent === pct ? btnPrimary : btnSecondary}
                          onClick={() => handleScalePercent(pct)}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preset Dimensions */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-3">
                  <span className="text-xs font-medium text-slate-300 block">{t('image_editor_preset_resolutions', 'Předvolby standardních rozlišení')}</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button type="button" className={btnSecondary + ' py-2'} onClick={() => setPresetResolution(1920, 1080)}>
                      1920 × 1080 (16:9 FHD)
                    </button>
                    <button type="button" className={btnSecondary + ' py-2'} onClick={() => setPresetResolution(1280, 720)}>
                      1280 × 720 (16:9 HD)
                    </button>
                    <button type="button" className={btnSecondary + ' py-2'} onClick={() => setPresetResolution(1080, 1080)}>
                      1080 × 1080 (1:1 Čtverec)
                    </button>
                    <button type="button" className={btnSecondary + ' py-2'} onClick={() => setPresetResolution(1080, 1920)}>
                      1080 × 1920 (9:16 Příběh)
                    </button>
                    <button type="button" className={btnSecondary + ' py-2'} onClick={() => setPresetResolution(1200, 630)}>
                      1200 × 630 (Social / OG)
                    </button>
                    <button type="button" className={btnSecondary + ' py-2'} onClick={() => setPresetResolution(512, 512)}>
                      512 × 512 (Avatar)
                    </button>
                  </div>
                </div>

                {/* Resize Mode & Canvas padding */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-3">
                  <span className="text-xs font-medium text-slate-300 block">{t('image_editor_resize_mode', 'Režim změny rozměrů')}</span>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="resizeMode"
                        checked={resizeMode === 'resample'}
                        onChange={() => setResizeMode('resample')}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <span>{t('image_editor_mode_resample', 'Převzorkovat / roztáhnout pixely')}</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="resizeMode"
                        checked={resizeMode === 'canvas'}
                        onChange={() => setResizeMode('canvas')}
                        className="text-indigo-600 focus:ring-0"
                      />
                      <span>{t('image_editor_mode_canvas', 'Zvětšit plátno / doplnit pozadí')}</span>
                    </label>
                  </div>

                  {resizeMode === 'canvas' && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <label className={labelStyle}>{t('image_editor_canvas_bg', 'Barva pozadí plátna')}</label>
                      <div className="flex items-center gap-2">
                        {['transparent', '#000000', '#ffffff', '#1e293b'].map(c => (
                          <button
                            key={c}
                            type="button"
                            className={`w-7 h-7 rounded border ${
                              canvasBgColor === c ? 'ring-2 ring-indigo-500 border-white' : 'border-slate-700'
                            }`}
                            style={{
                              backgroundColor: c === 'transparent' ? 'transparent' : c,
                              backgroundImage:
                                c === 'transparent'
                                  ? 'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)'
                                  : 'none',
                              backgroundSize: '8px 8px',
                            }}
                            onClick={() => setCanvasBgColor(c)}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: CROP & ROTATE */}
          {activeTab === 'crop' && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Crop section */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">{t('image_editor_crop_aspect', 'Poměr stran ořezu')}</span>
                    {!isCropping ? (
                      <button type="button" className={btnPrimary} onClick={startCrop}>
                        <Crop className="w-3.5 h-3.5" />
                        {t('image_editor_crop_start', 'Spustit ořez')}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button type="button" className={btnPrimary} onClick={applyCrop}>
                          <Check className="w-3.5 h-3.5" />
                          {t('image_editor_crop_apply', 'Použít')}
                        </button>
                        <button type="button" className={btnSecondary} onClick={cancelCrop}>
                          {t('image_editor_crop_cancel', 'Zrušit')}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {['free', '1:1', '16:9', '9:16', '4:3', '3:2'].map(ratio => (
                      <button
                        key={ratio}
                        type="button"
                        className={cropAspectRatio === ratio ? btnPrimary : btnSecondary}
                        onClick={() => handleCropAspectChange(ratio)}
                      >
                        {ratio === 'free' ? t('image_editor_aspect_free', 'Volný') : ratio}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500">
                    {t('image_editor_crop_instructions', 'Uchopte úchyty na fotografii a nastavte výřez, poté klikněte na Použít ořez.')}
                  </p>
                </div>

                {/* Rotate & Flip transformations */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">{t('image_editor_reset_transform', 'Orientace a otočení')}</span>
                    <button type="button" className={btnSecondary} onClick={resetOrientation}>
                      <RefreshCw className="w-3 h-3" />
                      {t('image_editor_reset_transform', 'Reset')}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => {
                        pushHistory();
                        setRotation(r => (r + 90) % 360);
                      }}
                      title={t('image_editor_rotate_cw', 'Otočit o 90° doprava')}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      +90°
                    </button>
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => {
                        pushHistory();
                        setRotation(r => (r - 90 + 360) % 360);
                      }}
                      title={t('image_editor_rotate_ccw', 'Otočit o 90° doleva')}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      -90°
                    </button>
                    <button
                      type="button"
                      className={flipH ? btnPrimary : btnSecondary}
                      onClick={() => {
                        pushHistory();
                        setFlipH(!flipH);
                      }}
                      title={t('image_editor_flip_horizontal', 'Převrátit vodorovně')}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      {t('image_editor_flip_horizontal', 'Zrcadlo X')}
                    </button>
                    <button
                      type="button"
                      className={flipV ? btnPrimary : btnSecondary}
                      onClick={() => {
                        pushHistory();
                        setFlipV(!flipV);
                      }}
                      title={t('image_editor_flip_vertical', 'Převrátit svisle')}
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      {t('image_editor_flip_vertical', 'Zrcadlo Y')}
                    </button>
                  </div>

                  {/* Fine tilt angle slider */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{t('image_editor_fine_rotation', 'Jemný náklon úhlu')}</span>
                      <span className="font-mono text-indigo-400">{fineAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={fineAngle}
                      onChange={e => setFineAngle(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: FILTERS & COLOR ADJUSTMENTS */}
          {activeTab === 'adjust' && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
              {/* Presets Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">{t('image_editor_filter_presets', 'Stylové předvolby')}</span>
                  <button type="button" className={btnSecondary} onClick={resetAdjustments}>
                    <RefreshCw className="w-3 h-3" />
                    {t('image_editor_reset_adjustments', 'Resetovat úpravy')}
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 text-xs">
                  {[
                    { id: 'normal', name: t('image_editor_filter_normal', 'Původní') },
                    { id: 'vivid', name: t('image_editor_filter_vivid', 'Živý') },
                    { id: 'bw', name: t('image_editor_filter_bw', 'ČB') },
                    { id: 'vintage', name: t('image_editor_filter_vintage', 'Vintage') },
                    { id: 'cool', name: t('image_editor_filter_cool', 'Chladný') },
                    { id: 'warm', name: t('image_editor_filter_warm', 'Zlatý') },
                    { id: 'cinematic', name: t('image_editor_filter_cinematic', 'Kino') },
                    { id: 'cyberpunk', name: t('image_editor_filter_cyberpunk', 'Cyber') },
                    { id: 'matte', name: t('image_editor_filter_matte', 'Matný') },
                  ].map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      className={btnSecondary + ' py-2 text-[11px]'}
                      onClick={() => applyFilterPreset(preset.id)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                {/* Brightness */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Sun className="w-3 h-3 text-amber-400" />
                      {t('image_editor_brightness', 'Jas')}
                    </span>
                    <span className="font-mono">{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={brightness}
                    onChange={e => setBrightness(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Contrast */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Contrast className="w-3 h-3 text-indigo-400" />
                      {t('image_editor_contrast', 'Kontrast')}
                    </span>
                    <span className="font-mono">{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={contrast}
                    onChange={e => setContrast(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Saturation */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Palette className="w-3 h-3 text-pink-400" />
                      {t('image_editor_saturation', 'Sytost')}
                    </span>
                    <span className="font-mono">{saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="220"
                    value={saturation}
                    onChange={e => setSaturation(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Temperature / Warmth */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{t('image_editor_warmth', 'Teplota barev')}</span>
                    <span className="font-mono">{warmth}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={warmth}
                    onChange={e => setWarmth(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Hue Rotate */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{t('image_editor_hue', 'Posun odstínu')}</span>
                    <span className="font-mono">{hue}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={hue}
                    onChange={e => setHue(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Vignette */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{t('image_editor_vignette', 'Vinětace')}</span>
                    <span className="font-mono">{vignette}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={vignette}
                    onChange={e => setVignette(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Blur */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{t('image_editor_blur', 'Rozostření')}</span>
                    <span className="font-mono">{blur} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={blur}
                    onChange={e => setBlur(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Sepia */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{t('image_editor_sepia', 'Sépie')}</span>
                    <span className="font-mono">{sepia}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sepia}
                    onChange={e => setSepia(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Invert */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{t('image_editor_invert', 'Invertovat')}</span>
                    <span className="font-mono">{invert}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={invert}
                    onChange={e => setInvert(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: TEXT, DRAWING & PRIVACY CENSOR */}
          {activeTab === 'annotate' && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Text Watermark */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-indigo-400" />
                      {t('image_editor_text_overlay', 'Textový vodoznak')}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={textOverlay.enabled}
                        onChange={e => setTextOverlay(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0"
                      />
                      <span>{textOverlay.enabled ? t('image_editor_active', 'Aktivní') : t('image_editor_disabled', 'Vypnuto')}</span>
                    </label>
                  </div>

                  <div>
                    <label className={labelStyle}>{t('image_editor_text_content', 'Text')}</label>
                    <input
                      type="text"
                      className={inputStyle}
                      placeholder={t('image_editor_text_placeholder', 'Napište vodoznak nebo popisek...')}
                      value={textOverlay.text}
                      onChange={e => setTextOverlay(prev => ({ ...prev, text: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelStyle}>{t('image_editor_font_size', 'Velikost písma')}</label>
                      <input
                        type="number"
                        min={12}
                        max={140}
                        className={inputStyle}
                        value={textOverlay.fontSize}
                        onChange={e => setTextOverlay(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className={labelStyle}>{t('image_editor_text_position', 'Umístění')}</label>
                      <select
                        className={inputStyle}
                        value={textOverlay.position}
                        onChange={e =>
                          setTextOverlay(prev => ({
                            ...prev,
                            position: e.target.value as TextOverlayState['position'],
                          }))
                        }
                      >
                        <option value="top-left">{t('image_editor_pos_top_left', 'Vlevo nahoře')}</option>
                        <option value="top-right">{t('image_editor_pos_top_right', 'Vpravo nahoře')}</option>
                        <option value="center">{t('image_editor_pos_center', 'Uprostřed')}</option>
                        <option value="bottom-left">{t('image_editor_pos_bottom_left', 'Vlevo dole')}</option>
                        <option value="bottom-right">{t('image_editor_pos_bottom_right', 'Vpravo dole')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelStyle}>{t('image_editor_text_color', 'Barva textu')}</label>
                      <input
                        type="color"
                        className="w-full h-8 bg-slate-950 border border-slate-800 rounded cursor-pointer"
                        value={textOverlay.color}
                        onChange={e => setTextOverlay(prev => ({ ...prev, color: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={labelStyle}>{t('image_editor_text_bg', 'Pozadí textu')}</label>
                      <select
                        className={inputStyle}
                        value={textOverlay.bgColor}
                        onChange={e => setTextOverlay(prev => ({ ...prev, bgColor: e.target.value }))}
                      >
                        <option value="transparent">{t('image_editor_transparent', 'Průhledné')}</option>
                        <option value="#00000088">{t('image_editor_bg_black_semi', 'Černé poloprůhledné')}</option>
                        <option value="#ffffffaa">{t('image_editor_bg_white_semi', 'Bílé poloprůhledné')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Freehand Brush / Doodle */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                      {t('image_editor_draw_tool', 'Kreslení štětcem')}
                    </span>
                    <button
                      type="button"
                      className={isDrawingMode ? btnPrimary : btnSecondary}
                      onClick={() => setIsDrawingMode(!isDrawingMode)}
                    >
                      {isDrawingMode ? t('image_editor_brush_on', 'Kreslení zapnuto') : t('image_editor_brush_off', 'Zapnout kreslení')}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={!isEraser ? btnPrimary : btnSecondary}
                      onClick={() => setIsEraser(false)}
                      title={t('image_editor_draw_tool', 'Štětec')}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className={isEraser ? btnPrimary : btnSecondary}
                      onClick={() => setIsEraser(true)}
                      title={t('image_editor_eraser', 'Guma')}
                    >
                      <Eraser className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className={btnSecondary + ' ml-auto text-rose-400 hover:text-rose-300'}
                      disabled={drawings.length === 0}
                      onClick={() => setDrawings([])}
                      title={t('image_editor_clear_drawings', 'Smazat kresby')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t('image_editor_clear_drawings', 'Vymazat')}
                    </button>
                  </div>

                  <div>
                    <label className={labelStyle}>{t('image_editor_brush_color', 'Barva štětce')}</label>
                    <div className="flex items-center gap-1.5">
                      {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ffffff', '#000000'].map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`w-6 h-6 rounded-full border ${brushColor === c ? 'ring-2 ring-indigo-500 border-white' : 'border-slate-800'}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setBrushColor(c)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{t('image_editor_brush_size', 'Tloušťka štětce')}</span>
                      <span className="font-mono">{brushSize} px</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="48"
                      value={brushSize}
                      onChange={e => setBrushSize(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>

                {/* Privacy & Redact Box */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      {t('image_editor_censor_tool', 'Začernění & Anonymizace')}
                    </span>
                    {censorBoxes.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-rose-400 hover:text-rose-300"
                        onClick={() => setCensorBoxes([])}
                      >
                        {t('image_editor_clear_censors', 'Odstranit')}
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    {t('image_editor_crop_instructions', 'Vložte maskovací blok pro skrytí citlivých údajů nebo obličejů.')}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className={btnSecondary} onClick={() => addCensorBox('blackout')}>
                      <CheckSquare className="w-3.5 h-3.5" />
                      {t('image_editor_censor_blackout', 'Černý blok')}
                    </button>
                    <button type="button" className={btnSecondary} onClick={() => addCensorBox('pixelate')}>
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('image_editor_censor_pixelate', 'Rozostřit')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: EXPORT & SAVE */}
          {activeTab === 'export' && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Format & Quality settings */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-3">
                  <label className={labelStyle}>{t('image_editor_export_format', 'Cílový formát souboru')}</label>
                  <select
                    className={inputStyle}
                    value={exportFormat}
                    onChange={e => setExportFormat(e.target.value as typeof exportFormat)}
                  >
                    <option value="image/jpeg">{t('image_editor_format_jpeg', 'JPEG (.jpg) - Fotografie a menší velikost')}</option>
                    <option value="image/png">{t('image_editor_format_png', 'PNG (.png) - Bezztrátový s průhledností')}</option>
                    <option value="image/webp">{t('image_editor_format_webp', 'WebP (.webp) - Moderní webový formát')}</option>
                  </select>

                  {exportFormat !== 'image/png' && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{t('image_editor_quality', 'Kvalita komprese')}</span>
                        <span className="font-mono text-indigo-400">{exportQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={exportQuality}
                        onChange={e => setExportQuality(Number(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* File size & compression card */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
                  <span className="text-xs font-medium text-slate-300 block">{t('image_editor_dimensions', 'Statistika komprese')}</span>
                  <div className="space-y-1.5 text-slate-400">
                    <div className="flex justify-between">
                      <span>{t('image_editor_original_size', 'Původní velikost')}:</span>
                      <span className="font-mono text-slate-200">
                        {originalFileSize > 0 ? `${(originalFileSize / 1024).toFixed(1)} KB` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('image_editor_estimated_size', 'Odhadovaná velikost')}:</span>
                      <span className="font-mono text-emerald-400">
                        {estimatedSize ? `${(estimatedSize / 1024).toFixed(1)} KB` : '...'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('image_editor_dimensions', 'Finální rozměry')}:</span>
                      <span className="font-mono text-slate-200">
                        {width} × {height} px
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-col justify-center gap-2.5">
                  <button type="button" className={btnPrimary + ' py-2.5 text-sm'} onClick={handleExportSave}>
                    <Download className="w-4 h-4" />
                    {t('image_editor_export_download', 'Uložit a stáhnout obrázek')}
                  </button>

                  <button type="button" className={btnSecondary + ' py-2'} onClick={handleCopyToClipboard}>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? t('image_editor_copied', 'Zkopírováno!') : t('image_editor_copy_clipboard', 'Kopírovat do schránky')}</span>
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    isSuccess
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                      : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{statusMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
