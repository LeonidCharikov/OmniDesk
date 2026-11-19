import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import {
  ConverterCategoryId,
  detectFileExtension,
  stripExtension,
} from './converterCatalog';
import {
  ArchiveEntry,
  buildMinimalDocx,
  compressGzip,
  createTarArchive,
  createZipArchive,
  decompressGzip,
  encodeAiffPcm16,
  encodeBmp24,
  encodeIcoFromPng,
  encodeWavPcm16,
  htmlToMarkdown,
  htmlToPlainText,
  markdownToHtml,
  parseDelimitedText,
  parseSimpleXmlToRows,
  parseTarArchive,
  parseZipArchive,
  resampleChannelData,
  rowsToHtmlTable,
  rowsToMarkdownTable,
  rowsToXml,
  serializeDelimitedRows,
  stripRtfToText,
} from './converterEncoders';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface ConversionOptions {
  // Images
  imageQuality: number; // 10..100
  imageScale: number; // 25..100
  icoSize: number; // 32 | 64 | 128 | 256
  // Video
  gifFps: number; // 5..20
  gifWidth: number; // 320 | 480 | 640
  gifMaxDurationSec: number; // 3..15
  videoScale: number; // 50 | 75 | 100
  frameTimeSec: number; // >= 0
  // Audio
  audioSampleRate: 22050 | 44100 | 48000;
  audioChannels: 1 | 2;
  // PDF to image
  pdfRenderScale: number; // 1 | 1.5 | 2
}

export const DEFAULT_CONVERSION_OPTIONS: ConversionOptions = {
  imageQuality: 85,
  imageScale: 100,
  icoSize: 64,
  gifFps: 10,
  gifWidth: 480,
  gifMaxDurationSec: 8,
  videoScale: 100,
  frameTimeSec: 0.5,
  audioSampleRate: 44100,
  audioChannels: 2,
  pdfRenderScale: 1.5,
};

export type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'archive' | 'none';

export interface ConversionResult {
  blob: Blob;
  fileName: string;
  mime: string;
  originalSize: number;
  newSize: number;
  durationMs: number;
  previewKind: PreviewKind;
  textPreview?: string;
  archiveEntries?: ArchiveEntry[];
  note?: string;
}

export type ProgressCallback = (percent: number, stage?: string) => void;

function makeWinAnsiSafe(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

function toBlobPart(bytes: Uint8Array): BlobPart {
  return bytes as unknown as BlobPart;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error(`Unable to export ${mime} from canvas.`));
      },
      mime,
      quality
    );
  });
}

function loadImageFromFile(file: File): Promise<{ img: HTMLImageElement; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve({ img, cleanup: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to decode image file in browser.'));
    };
    img.src = url;
  });
}

function loadVideoMetadata(file: File): Promise<{ video: HTMLVideoElement; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    const url = URL.createObjectURL(file);
    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };

    video.onloadeddata = () => resolve({ video, cleanup });
    video.onerror = () => {
      cleanup();
      reject(new Error('This video codec is not natively playable by your browser.'));
    };
    video.src = url;
  });
}

function seekVideoTo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const clamped = Math.max(0, Math.min(timeSec, Math.max(0, (video.duration || 0) - 0.01)));
    if (Math.abs(video.currentTime - clamped) < 0.005) {
      resolve();
      return;
    }
    const timer = window.setTimeout(() => {
      video.onseeked = null;
      resolve();
    }, 3000);

    video.onseeked = () => {
      window.clearTimeout(timer);
      video.onseeked = null;
      resolve();
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Failed seeking video frame.'));
    };
    video.currentTime = clamped;
  });
}

async function createTextPdfBlob(textContent: string, headerLabel: string): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const fontSize = 10;
  const lineHeight = 14;
  const maxLineWidth = pageWidth - margin * 2;

  const paragraphs = textContent.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];

  for (const rawP of paragraphs) {
    const safeP = makeWinAnsiSafe(rawP);
    if (!safeP.trim()) {
      lines.push('');
      continue;
    }
    const words = safeP.split(/\s+/);
    let currentLine = '';
    for (const w of words) {
      const test = currentLine ? `${currentLine} ${w}` : w;
      if (font.widthOfTextAtSize(test, fontSize) > maxLineWidth && currentLine) {
        lines.push(currentLine);
        currentLine = w;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  const linesPerPage = Math.floor((pageHeight - margin * 2 - 30) / lineHeight);
  const totalPages = Math.max(1, Math.ceil(lines.length / linesPerPage));

  for (let p = 0; p < totalPages; p++) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawText(`${makeWinAnsiSafe(headerLabel)} (OmniDesk)`, {
      x: margin,
      y: pageHeight - margin + 12,
      size: 8,
      font: fontBold,
      color: rgb(0.35, 0.38, 0.45),
    });

    const pLines = lines.slice(p * linesPerPage, (p + 1) * linesPerPage);
    let y = pageHeight - margin - 15;
    for (const line of pLines) {
      if (line) {
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0.12, 0.14, 0.18),
        });
      }
      y -= lineHeight;
    }

    page.drawText(`${p + 1} / ${totalPages}`, {
      x: pageWidth - margin - 40,
      y: margin - 15,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([toBlobPart(pdfBytes)], { type: 'application/pdf' });
}

// ---------------------------------------------------------------------------
// CATEGORY 1: VIDEO CONVERSIONS
// ---------------------------------------------------------------------------

async function convertVideo(
  file: File,
  targetExt: string,
  options: ConversionOptions,
  onProgress?: ProgressCallback
): Promise<Omit<ConversionResult, 'originalSize' | 'newSize' | 'durationMs'>> {
  const baseName = stripExtension(file.name);

  if (targetExt === 'wav') {
    onProgress?.(15, 'Decoding audio track');
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new AudioCtx();
    try {
      const arrayBuf = await file.arrayBuffer();
      const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));
      onProgress?.(60, 'Encoding WAV PCM');
      const channels: Float32Array[] = [];
      for (let c = 0; c < decoded.numberOfChannels; c++) {
        channels.push(decoded.getChannelData(c));
      }
      const processed = resampleChannelData(
        channels,
        decoded.sampleRate,
        options.audioSampleRate,
        options.audioChannels
      );
      const wavBytes = encodeWavPcm16(processed, options.audioSampleRate);
      onProgress?.(100);
      return {
        blob: new Blob([toBlobPart(wavBytes)], { type: 'audio/wav' }),
        fileName: `${baseName}.wav`,
        mime: 'audio/wav',
        previewKind: 'audio',
      };
    } finally {
      await audioCtx.close();
    }
  }

  const { video, cleanup } = await loadVideoMetadata(file);
  try {
    const srcW = video.videoWidth || 640;
    const srcH = video.videoHeight || 360;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 2;

    if (targetExt === 'png' || targetExt === 'jpg' || targetExt === 'webp') {
      onProgress?.(25, 'Seeking frame');
      await seekVideoTo(video, Math.min(options.frameTimeSec, duration * 0.9));
      const scale = options.videoScale / 100;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(srcW * scale));
      canvas.height = Math.max(1, Math.round(srcH * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const mime = targetExt === 'png' ? 'image/png' : targetExt === 'jpg' ? 'image/jpeg' : 'image/webp';
      const blob = await canvasToBlob(canvas, mime, options.imageQuality / 100);
      onProgress?.(100);
      return {
        blob,
        fileName: `${baseName}_frame.${targetExt}`,
        mime,
        previewKind: 'image',
      };
    }

    if (targetExt === 'gif') {
      const fps = Math.max(4, Math.min(20, options.gifFps));
      const clipDuration = Math.min(duration, Math.max(0.5, options.gifMaxDurationSec));
      const totalFrames = Math.max(2, Math.floor(clipDuration * fps));
      const outW = Math.min(srcW, Math.max(160, options.gifWidth));
      const outH = Math.max(1, Math.round((srcH / srcW) * outW));

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas 2D context unavailable.');

      const gif = GIFEncoder();
      const delayMs = Math.round(1000 / fps);

      for (let i = 0; i < totalFrames; i++) {
        const t = (i / totalFrames) * clipDuration;
        await seekVideoTo(video, t);
        ctx.drawImage(video, 0, 0, outW, outH);
        const imgData = ctx.getImageData(0, 0, outW, outH);
        const palette = quantize(imgData.data, 256);
        const index = applyPalette(imgData.data, palette);
        gif.writeFrame(index, outW, outH, {
          palette,
          delay: delayMs,
          repeat: 0,
        });
        onProgress?.(Math.round(((i + 1) / totalFrames) * 95), `Frame ${i + 1}/${totalFrames}`);
        // Yield briefly to keep UI responsive
        if (i % 4 === 0) {
          await new Promise(r => window.setTimeout(r, 0));
        }
      }

      gif.finish();
      const bytes = gif.bytes();
      onProgress?.(100);
      return {
        blob: new Blob([toBlobPart(bytes)], { type: 'image/gif' }),
        fileName: `${baseName}.gif`,
        mime: 'image/gif',
        previewKind: 'image',
        note: `${totalFrames} frames · ${outW}×${outH} @ ${fps} fps`,
      };
    }

    if (targetExt === 'webm') {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder API is not supported in this browser.');
      }
      const scale = options.videoScale / 100;
      const outW = Math.max(2, Math.round((srcW * scale) / 2) * 2);
      const outH = Math.max(2, Math.round((srcH * scale) / 2) * 2);

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');

      const canvasStream = canvas.captureStream(30);
      const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

      // Route audio silently into the recording stream if possible
      let audioCtx: AudioContext | null = null;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioCtx();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        video.muted = false;
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) combinedTracks.push(audioTrack);
      } catch {
        video.muted = true;
      }

      const combinedStream = new MediaStream(combinedTracks);
      const preferredMimes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];
      const chosenMime = preferredMimes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: chosenMime,
        videoBitsPerSecond: 2_500_000,
      });

      const recordedBlob = await new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onerror = () => reject(new Error('WebM MediaRecorder failed during encoding.'));
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));

        let rafId = 0;
        const drawLoop = () => {
          if (video.paused || video.ended) return;
          ctx.drawImage(video, 0, 0, outW, outH);
          if (duration > 0) {
            onProgress?.(Math.min(98, Math.round((video.currentTime / duration) * 98)), 'Encoding WebM');
          }
          rafId = requestAnimationFrame(drawLoop);
        };

        video.onended = () => {
          cancelAnimationFrame(rafId);
          if (recorder.state !== 'inactive') recorder.stop();
        };

        video.currentTime = 0;
        recorder.start(250);
        video
          .play()
          .then(() => {
            drawLoop();
          })
          .catch(err => {
            cancelAnimationFrame(rafId);
            if (recorder.state !== 'inactive') recorder.stop();
            reject(err);
          });
      });

      if (audioCtx) {
        await audioCtx.close().catch(() => {});
      }
      onProgress?.(100);
      return {
        blob: recordedBlob,
        fileName: `${baseName}.webm`,
        mime: 'video/webm',
        previewKind: 'video',
        note: `${outW}×${outH} WebM`,
      };
    }

    throw new Error(`Unsupported video target format: .${targetExt}`);
  } finally {
    cleanup();
  }
}

// ---------------------------------------------------------------------------
// CATEGORY 2: AUDIO CONVERSIONS
// ---------------------------------------------------------------------------

async function convertAudio(
  file: File,
  targetExt: string,
  options: ConversionOptions,
  onProgress?: ProgressCallback
): Promise<Omit<ConversionResult, 'originalSize' | 'newSize' | 'durationMs'>> {
  const baseName = stripExtension(file.name);
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();

  try {
    onProgress?.(20, 'Decoding audio');
    const arrayBuf = await file.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));

    if (targetExt === 'wav' || targetExt === 'aiff') {
      onProgress?.(65, `Encoding ${targetExt.toUpperCase()}`);
      const channels: Float32Array[] = [];
      for (let c = 0; c < decoded.numberOfChannels; c++) {
        channels.push(decoded.getChannelData(c));
      }
      const processed = resampleChannelData(
        channels,
        decoded.sampleRate,
        options.audioSampleRate,
        options.audioChannels
      );

      const bytes =
        targetExt === 'wav'
          ? encodeWavPcm16(processed, options.audioSampleRate)
          : encodeAiffPcm16(processed, options.audioSampleRate);
      const mime = targetExt === 'wav' ? 'audio/wav' : 'audio/aiff';
      onProgress?.(100);
      return {
        blob: new Blob([toBlobPart(bytes)], { type: mime }),
        fileName: `${baseName}.${targetExt}`,
        mime,
        previewKind: 'audio',
        note: `${(options.audioSampleRate / 1000).toFixed(1)} kHz · ${options.audioChannels === 1 ? 'Mono' : 'Stereo'} · 16-bit`,
      };
    }

    if (targetExt === 'webm') {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder is unavailable in this browser.');
      }
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createBufferSource();
      source.buffer = decoded;
      source.connect(dest);

      const preferred = ['audio/webm;codecs=opus', 'audio/webm'];
      const mime = preferred.find(m => MediaRecorder.isTypeSupported(m)) || 'audio/webm';
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(dest.stream, { mimeType: mime });

      const startTs = performance.now();
      const totalMs = Math.max(200, decoded.duration * 1000);
      const interval = window.setInterval(() => {
        const pct = Math.min(95, Math.round(((performance.now() - startTs) / totalMs) * 95));
        onProgress?.(pct, 'Encoding WebM Opus');
      }, 150);

      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = e => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onerror = () => reject(new Error('Audio WebM encoding failed.'));
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
        source.onended = () => {
          if (recorder.state !== 'inactive') recorder.stop();
        };
        recorder.start(200);
        source.start(0);
      });

      window.clearInterval(interval);
      onProgress?.(100);
      return {
        blob,
        fileName: `${baseName}.webm`,
        mime: 'audio/webm',
        previewKind: 'audio',
      };
    }

    throw new Error(`Unsupported audio target format: .${targetExt}`);
  } finally {
    await audioCtx.close();
  }
}

// ---------------------------------------------------------------------------
// CATEGORY 3: IMAGE CONVERSIONS
// ---------------------------------------------------------------------------

async function convertImage(
  file: File,
  targetExt: string,
  options: ConversionOptions,
  onProgress?: ProgressCallback
): Promise<Omit<ConversionResult, 'originalSize' | 'newSize' | 'durationMs'>> {
  const baseName = stripExtension(file.name);
  onProgress?.(20, 'Decoding image');
  const { img, cleanup } = await loadImageFromFile(file);

  try {
    const scaleFactor = options.imageScale / 100;
    const width =
      targetExt === 'ico'
        ? options.icoSize
        : Math.max(1, Math.round((img.naturalWidth || img.width || 512) * scaleFactor));
    const height =
      targetExt === 'ico'
        ? options.icoSize
        : Math.max(1, Math.round((img.naturalHeight || img.height || 512) * scaleFactor));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D context unavailable.');

    if (targetExt === 'jpg' || targetExt === 'bmp') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }

    if (targetExt === 'ico') {
      // Aspect-fit centered inside square ICO canvas
      const srcW = img.naturalWidth || img.width || 1;
      const srcH = img.naturalHeight || img.height || 1;
      const ratio = Math.min(width / srcW, height / srcH);
      const drawW = Math.round(srcW * ratio);
      const drawH = Math.round(srcH * ratio);
      ctx.drawImage(img, Math.round((width - drawW) / 2), Math.round((height - drawH) / 2), drawW, drawH);
    } else {
      ctx.drawImage(img, 0, 0, width, height);
    }

    onProgress?.(60, `Encoding ${targetExt.toUpperCase()}`);

    if (targetExt === 'png' || targetExt === 'jpg' || targetExt === 'webp') {
      const mime = targetExt === 'png' ? 'image/png' : targetExt === 'jpg' ? 'image/jpeg' : 'image/webp';
      const blob = await canvasToBlob(canvas, mime, options.imageQuality / 100);
      onProgress?.(100);
      return {
        blob,
        fileName: `${baseName}.${targetExt}`,
        mime,
        previewKind: 'image',
        note: `${width}×${height}`,
      };
    }

    if (targetExt === 'bmp') {
      const imgData = ctx.getImageData(0, 0, width, height);
      const bmpBytes = encodeBmp24(imgData.data, width, height);
      onProgress?.(100);
      return {
        blob: new Blob([toBlobPart(bmpBytes)], { type: 'image/bmp' }),
        fileName: `${baseName}.bmp`,
        mime: 'image/bmp',
        previewKind: 'image',
        note: `${width}×${height} 24-bit BMP`,
      };
    }

    if (targetExt === 'ico') {
      const pngBlob = await canvasToBlob(canvas, 'image/png');
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
      const icoBytes = encodeIcoFromPng(pngBytes, width, height);
      onProgress?.(100);
      return {
        blob: new Blob([toBlobPart(icoBytes)], { type: 'image/x-icon' }),
        fileName: `${baseName}.ico`,
        mime: 'image/x-icon',
        previewKind: 'image',
        note: `${width}×${height} ICO`,
      };
    }

    if (targetExt === 'gif') {
      const imgData = ctx.getImageData(0, 0, width, height);
      const palette = quantize(imgData.data, 256);
      const index = applyPalette(imgData.data, palette);
      const gif = GIFEncoder();
      gif.writeFrame(index, width, height, { palette });
      gif.finish();
      const bytes = gif.bytes();
      onProgress?.(100);
      return {
        blob: new Blob([toBlobPart(bytes)], { type: 'image/gif' }),
        fileName: `${baseName}.gif`,
        mime: 'image/gif',
        previewKind: 'image',
        note: `${width}×${height} GIF`,
      };
    }

    if (targetExt === 'pdf') {
      const pngBlob = await canvasToBlob(canvas, 'image/png');
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
      const pdfDoc = await PDFDocument.create();
      const embedded = await pdfDoc.embedPng(pngBytes);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(embedded, { x: 0, y: 0, width, height });
      const pdfBytes = await pdfDoc.save();
      onProgress?.(100);
      return {
        blob: new Blob([toBlobPart(pdfBytes)], { type: 'application/pdf' }),
        fileName: `${baseName}.pdf`,
        mime: 'application/pdf',
        previewKind: 'pdf',
        note: `${width}×${height} pt`,
      };
    }

    if (targetExt === 'svg') {
      const dataUrl = canvas.toDataURL('image/png');
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="${dataUrl}" width="${width}" height="${height}" />
</svg>`;
      onProgress?.(100);
      return {
        blob: new Blob([svgContent], { type: 'image/svg+xml' }),
        fileName: `${baseName}.svg`,
        mime: 'image/svg+xml',
        previewKind: 'image',
        note: `${width}×${height} SVG`,
      };
    }

    throw new Error(`Unsupported image target format: .${targetExt}`);
  } finally {
    cleanup();
  }
}

// ---------------------------------------------------------------------------
// CATEGORY 4: DOCUMENT CONVERSIONS
// ---------------------------------------------------------------------------

async function convertDocument(
  file: File,
  inputExt: string,
  targetExt: string,
  options: ConversionOptions,
  onProgress?: ProgressCallback
): Promise<Omit<ConversionResult, 'originalSize' | 'newSize' | 'durationMs'>> {
  const baseName = stripExtension(file.name);

  // Special case: PDF input
  if (inputExt === 'pdf') {
    onProgress?.(15, 'Loading PDF');
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const numPages = pdf.numPages;

    if (targetExt === 'png' || targetExt === 'jpg') {
      const mime = targetExt === 'png' ? 'image/png' : 'image/jpeg';
      const maxPages = Math.min(numPages, 25);
      const renderedEntries: ArchiveEntry[] = [];

      for (let p = 1; p <= maxPages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: options.pdfRenderScale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable.');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        const pageBlob = await canvasToBlob(canvas, mime, options.imageQuality / 100);
        const bytes = new Uint8Array(await pageBlob.arrayBuffer());
        renderedEntries.push({
          name: `${baseName}_page_${String(p).padStart(2, '0')}.${targetExt}`,
          data: bytes,
          size: bytes.length,
        });
        onProgress?.(Math.round((p / maxPages) * 95), `Rendering page ${p}/${maxPages}`);
      }

      onProgress?.(100);
      if (renderedEntries.length === 1) {
        return {
          blob: new Blob([toBlobPart(renderedEntries[0].data)], { type: mime }),
          fileName: renderedEntries[0].name,
          mime,
          previewKind: 'image',
          note: `1 page rendered`,
        };
      }
      const zipBytes = createZipArchive(renderedEntries);
      return {
        blob: new Blob([toBlobPart(zipBytes)], { type: 'application/zip' }),
        fileName: `${baseName}_pages.zip`,
        mime: 'application/zip',
        previewKind: 'archive',
        archiveEntries: renderedEntries,
        note: `${renderedEntries.length} pages packed in ZIP`,
      };
    }

    // Extract text from all PDF pages
    const pageTexts: string[] = [];
    for (let p = 1; p <= numPages; p++) {
      const page = await pdf.getPage(p);
      const textContent = await page.getTextContent();
      const strings = textContent.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ');
      pageTexts.push(strings.trim());
      onProgress?.(Math.round((p / numPages) * 90), `Extracting page ${p}/${numPages}`);
    }
    const combinedText = pageTexts.join('\n\n');
    onProgress?.(100);

    if (targetExt === 'txt') {
      return {
        blob: new Blob([combinedText], { type: 'text/plain;charset=utf-8' }),
        fileName: `${baseName}.txt`,
        mime: 'text/plain',
        previewKind: 'text',
        textPreview: combinedText.slice(0, 4000),
      };
    }
    if (targetExt === 'md') {
      const md = pageTexts.map((t, idx) => `## Page ${idx + 1}\n\n${t}`).join('\n\n---\n\n');
      return {
        blob: new Blob([md], { type: 'text/markdown;charset=utf-8' }),
        fileName: `${baseName}.md`,
        mime: 'text/markdown',
        previewKind: 'text',
        textPreview: md.slice(0, 4000),
      };
    }
    if (targetExt === 'html') {
      const html = markdownToHtml(
        pageTexts.map((t, idx) => `## Page ${idx + 1}\n\n${t}`).join('\n\n'),
        baseName
      );
      return {
        blob: new Blob([html], { type: 'text/html;charset=utf-8' }),
        fileName: `${baseName}.html`,
        mime: 'text/html',
        previewKind: 'text',
        textPreview: html.slice(0, 4000),
      };
    }
  }

  // Non-PDF document inputs: DOCX, MD, HTML, TXT, RTF
  onProgress?.(25, 'Reading document');
  let plainText = '';
  let markdown = '';
  let html = '';

  if (inputExt === 'docx') {
    const ab = await file.arrayBuffer();
    const htmlRes = await mammoth.convertToHtml({ arrayBuffer: ab });
    const rawRes = await mammoth.extractRawText({ arrayBuffer: ab });
    const safeHtml = DOMPurify.sanitize(htmlRes.value);
    html = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8" /><title>${baseName}</title></head>\n<body>\n${safeHtml}\n</body>\n</html>`;
    markdown = htmlToMarkdown(safeHtml);
    plainText = rawRes.value.trim() || htmlToPlainText(safeHtml);
  } else if (inputExt === 'html') {
    const rawHtml = await file.text();
    const safeHtml = DOMPurify.sanitize(rawHtml);
    html = rawHtml;
    markdown = htmlToMarkdown(safeHtml);
    plainText = htmlToPlainText(safeHtml);
  } else if (inputExt === 'md') {
    markdown = await file.text();
    html = markdownToHtml(markdown, baseName);
    plainText = htmlToPlainText(html);
  } else if (inputExt === 'rtf') {
    const rawRtf = await file.text();
    plainText = stripRtfToText(rawRtf);
    markdown = plainText;
    html = markdownToHtml(plainText, baseName);
  } else {
    plainText = await file.text();
    markdown = plainText;
    html = markdownToHtml(plainText, baseName);
  }

  onProgress?.(70, `Generating ${targetExt.toUpperCase()}`);

  if (targetExt === 'pdf') {
    const blob = await createTextPdfBlob(plainText || markdown, file.name);
    onProgress?.(100);
    return {
      blob,
      fileName: `${baseName}.pdf`,
      mime: 'application/pdf',
      previewKind: 'pdf',
    };
  }
  if (targetExt === 'html') {
    onProgress?.(100);
    return {
      blob: new Blob([html], { type: 'text/html;charset=utf-8' }),
      fileName: `${baseName}.html`,
      mime: 'text/html',
      previewKind: 'text',
      textPreview: html.slice(0, 4000),
    };
  }
  if (targetExt === 'md') {
    onProgress?.(100);
    return {
      blob: new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
      fileName: `${baseName}.md`,
      mime: 'text/markdown',
      previewKind: 'text',
      textPreview: markdown.slice(0, 4000),
    };
  }
  if (targetExt === 'txt') {
    onProgress?.(100);
    return {
      blob: new Blob([plainText], { type: 'text/plain;charset=utf-8' }),
      fileName: `${baseName}.txt`,
      mime: 'text/plain',
      previewKind: 'text',
      textPreview: plainText.slice(0, 4000),
    };
  }
  if (targetExt === 'docx') {
    const docxBytes = buildMinimalDocx(markdown || plainText);
    onProgress?.(100);
    return {
      blob: new Blob([toBlobPart(docxBytes)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      fileName: `${baseName}.docx`,
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      previewKind: 'none',
      note: 'OOXML Word document',
    };
  }

  throw new Error(`Unsupported document target format: .${targetExt}`);
}

// ---------------------------------------------------------------------------
// CATEGORY 5: SPREADSHEETS & STRUCTURED DATA
// ---------------------------------------------------------------------------

async function convertSpreadsheetOrData(
  file: File,
  inputExt: string,
  targetExt: string,
  onProgress?: ProgressCallback
): Promise<Omit<ConversionResult, 'originalSize' | 'newSize' | 'durationMs'>> {
  const baseName = stripExtension(file.name);
  onProgress?.(20, 'Parsing structured data');

  let rows: Record<string, unknown>[] = [];
  let rawData: unknown = null;

  if (inputExt === 'xlsx' || inputExt === 'xls' || inputExt === 'ods') {
    const XLSX = await import('xlsx');
    const ab = await file.arrayBuffer();
    const workbook = XLSX.read(ab, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('Workbook contains no sheets.');
    const sheet = workbook.Sheets[firstSheetName];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    rawData = rows;
  } else if (inputExt === 'csv' || inputExt === 'tsv') {
    const text = await file.text();
    rows = parseDelimitedText(text, inputExt === 'tsv' ? '\t' : ',');
    rawData = rows;
  } else if (inputExt === 'json') {
    const text = await file.text();
    const parsed: unknown = JSON.parse(text);
    rawData = parsed;
    if (Array.isArray(parsed)) {
      rows = parsed.map(item =>
        item && typeof item === 'object' ? (item as Record<string, unknown>) : { value: item }
      );
    } else if (parsed && typeof parsed === 'object') {
      rows = [parsed as Record<string, unknown>];
    } else {
      rows = [{ value: parsed }];
    }
  } else if (inputExt === 'yaml') {
    const text = await file.text();
    const parsed: unknown = yamlLoad(text);
    rawData = parsed;
    if (Array.isArray(parsed)) {
      rows = parsed.map(item =>
        item && typeof item === 'object' ? (item as Record<string, unknown>) : { value: item }
      );
    } else if (parsed && typeof parsed === 'object') {
      rows = [parsed as Record<string, unknown>];
    } else {
      rows = [{ value: parsed }];
    }
  } else if (inputExt === 'xml') {
    const text = await file.text();
    rows = parseSimpleXmlToRows(text);
    rawData = rows;
  } else {
    throw new Error(`Unsupported spreadsheet/data input: .${inputExt}`);
  }

  onProgress?.(65, `Serializing ${targetExt.toUpperCase()}`);

  if (targetExt === 'xlsx' || targetExt === 'ods') {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{}]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const bookType = targetExt === 'ods' ? 'ods' : 'xlsx';
    const outArray = XLSX.write(workbook, { bookType, type: 'array' }) as ArrayBuffer;
    const mime =
      targetExt === 'ods'
        ? 'application/vnd.oasis.opendocument.spreadsheet'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    onProgress?.(100);
    return {
      blob: new Blob([outArray], { type: mime }),
      fileName: `${baseName}.${targetExt}`,
      mime,
      previewKind: 'none',
      note: `${rows.length} rows exported`,
    };
  }

  if (targetExt === 'csv' || targetExt === 'tsv') {
    const out = serializeDelimitedRows(rows, targetExt === 'tsv' ? '\t' : ',');
    const mime = targetExt === 'tsv' ? 'text/tab-separated-values' : 'text/csv';
    onProgress?.(100);
    return {
      blob: new Blob([out], { type: `${mime};charset=utf-8` }),
      fileName: `${baseName}.${targetExt}`,
      mime,
      previewKind: 'text',
      textPreview: out.slice(0, 4000),
      note: `${rows.length} rows`,
    };
  }

  if (targetExt === 'json') {
    const out = JSON.stringify(rawData ?? rows, null, 2);
    onProgress?.(100);
    return {
      blob: new Blob([out], { type: 'application/json;charset=utf-8' }),
      fileName: `${baseName}.json`,
      mime: 'application/json',
      previewKind: 'text',
      textPreview: out.slice(0, 4000),
    };
  }

  if (targetExt === 'yaml') {
    const out = yamlDump(rawData ?? rows, { noRefs: true, lineWidth: 100 });
    onProgress?.(100);
    return {
      blob: new Blob([out], { type: 'text/yaml;charset=utf-8' }),
      fileName: `${baseName}.yaml`,
      mime: 'text/yaml',
      previewKind: 'text',
      textPreview: out.slice(0, 4000),
    };
  }

  if (targetExt === 'xml') {
    const out = rowsToXml(rows);
    onProgress?.(100);
    return {
      blob: new Blob([out], { type: 'application/xml;charset=utf-8' }),
      fileName: `${baseName}.xml`,
      mime: 'application/xml',
      previewKind: 'text',
      textPreview: out.slice(0, 4000),
    };
  }

  if (targetExt === 'md') {
    const out = rowsToMarkdownTable(rows);
    onProgress?.(100);
    return {
      blob: new Blob([out], { type: 'text/markdown;charset=utf-8' }),
      fileName: `${baseName}.md`,
      mime: 'text/markdown',
      previewKind: 'text',
      textPreview: out.slice(0, 4000),
    };
  }

  if (targetExt === 'html') {
    const out = rowsToHtmlTable(rows, baseName);
    onProgress?.(100);
    return {
      blob: new Blob([out], { type: 'text/html;charset=utf-8' }),
      fileName: `${baseName}.html`,
      mime: 'text/html',
      previewKind: 'text',
      textPreview: out.slice(0, 4000),
    };
  }

  throw new Error(`Unsupported spreadsheet/data target format: .${targetExt}`);
}

// ---------------------------------------------------------------------------
// CATEGORY 6: ARCHIVE CONVERSIONS (ZIP, TAR, TAR.GZ, GZ)
// ---------------------------------------------------------------------------

async function convertArchive(
  file: File,
  inputExt: string,
  targetExt: string,
  onProgress?: ProgressCallback
): Promise<Omit<ConversionResult, 'originalSize' | 'newSize' | 'durationMs'>> {
  const baseName = stripExtension(file.name);
  onProgress?.(20, 'Reading archive');
  const bytes = new Uint8Array(await file.arrayBuffer());

  let entries: ArchiveEntry[] = [];
  if (inputExt === 'zip') {
    entries = parseZipArchive(bytes);
  } else if (inputExt === 'tar') {
    entries = parseTarArchive(bytes);
  } else if (inputExt === 'tar.gz') {
    const untarred = decompressGzip(bytes);
    entries = parseTarArchive(untarred);
  } else if (inputExt === 'gz') {
    const decompressed = decompressGzip(bytes);
    const innerName = baseName || 'extracted.bin';
    entries = [{ name: innerName, data: decompressed, size: decompressed.length }];
  } else {
    entries = [{ name: file.name, data: bytes, size: bytes.length }];
  }

  onProgress?.(65, `Packing ${targetExt.toUpperCase()}`);

  if (targetExt === 'zip') {
    const outBytes = createZipArchive(entries);
    onProgress?.(100);
    return {
      blob: new Blob([toBlobPart(outBytes)], { type: 'application/zip' }),
      fileName: `${baseName}.zip`,
      mime: 'application/zip',
      previewKind: 'archive',
      archiveEntries: entries,
      note: `${entries.length} file(s)`,
    };
  }

  if (targetExt === 'tar') {
    const outBytes = createTarArchive(entries);
    onProgress?.(100);
    return {
      blob: new Blob([toBlobPart(outBytes)], { type: 'application/x-tar' }),
      fileName: `${baseName}.tar`,
      mime: 'application/x-tar',
      previewKind: 'archive',
      archiveEntries: entries,
      note: `${entries.length} file(s)`,
    };
  }

  if (targetExt === 'tar.gz') {
    const tarBytes = createTarArchive(entries);
    const gzBytes = compressGzip(tarBytes);
    onProgress?.(100);
    return {
      blob: new Blob([toBlobPart(gzBytes)], { type: 'application/gzip' }),
      fileName: `${baseName}.tar.gz`,
      mime: 'application/gzip',
      previewKind: 'archive',
      archiveEntries: entries,
      note: `${entries.length} file(s)`,
    };
  }

  if (targetExt === 'gz') {
    const payload = entries.length === 1 ? entries[0].data : createTarArchive(entries);
    const gzBytes = compressGzip(payload);
    const outName = entries.length === 1 ? `${entries[0].name}.gz` : `${baseName}.tar.gz`;
    onProgress?.(100);
    return {
      blob: new Blob([toBlobPart(gzBytes)], { type: 'application/gzip' }),
      fileName: outName,
      mime: 'application/gzip',
      previewKind: 'archive',
      archiveEntries: entries,
      note: `${entries.length} file(s)`,
    };
  }

  throw new Error(`Unsupported archive target format: .${targetExt}`);
}

// ---------------------------------------------------------------------------
// PUBLIC DISPATCHER & BATCH ZIP HELPER
// ---------------------------------------------------------------------------

export async function convertFile(
  file: File,
  category: ConverterCategoryId,
  targetExt: string,
  options: ConversionOptions = DEFAULT_CONVERSION_OPTIONS,
  onProgress?: ProgressCallback
): Promise<ConversionResult> {
  const start = performance.now();
  const inputExt = detectFileExtension(file.name, file.type);

  let partial: Omit<ConversionResult, 'originalSize' | 'newSize' | 'durationMs'>;

  switch (category) {
    case 'video':
      partial = await convertVideo(file, targetExt, options, onProgress);
      break;
    case 'audio':
      partial = await convertAudio(file, targetExt, options, onProgress);
      break;
    case 'images':
      partial = await convertImage(file, targetExt, options, onProgress);
      break;
    case 'documents':
      partial = await convertDocument(file, inputExt, targetExt, options, onProgress);
      break;
    case 'spreadsheets':
      partial = await convertSpreadsheetOrData(file, inputExt, targetExt, onProgress);
      break;
    case 'archives':
      partial = await convertArchive(file, inputExt, targetExt, onProgress);
      break;
  }

  return {
    ...partial,
    originalSize: file.size,
    newSize: partial.blob.size,
    durationMs: Math.max(1, Math.round(performance.now() - start)),
  };
}

export async function bundleResultsAsZip(
  items: Array<{ fileName: string; blob: Blob }>
): Promise<Blob> {
  const entries: ArchiveEntry[] = [];
  const usedNames = new Map<string, number>();

  for (const item of items) {
    const count = usedNames.get(item.fileName) ?? 0;
    usedNames.set(item.fileName, count + 1);
    const uniqueName =
      count === 0
        ? item.fileName
        : `${stripExtension(item.fileName)}_${count + 1}.${item.fileName.split('.').pop() || 'bin'}`;
    const data = new Uint8Array(await item.blob.arrayBuffer());
    entries.push({ name: uniqueName, data, size: data.length });
  }

  const zipBytes = createZipArchive(entries);
  return new Blob([toBlobPart(zipBytes)], { type: 'application/zip' });
}

// ---------------------------------------------------------------------------
// BUILT-IN SAMPLE GENERATORS FOR ALL 6 CATEGORIES
// ---------------------------------------------------------------------------

export async function createSampleFileForCategory(category: ConverterCategoryId): Promise<File> {
  if (category === 'documents') {
    const md = `# OmniDesk Offline Converter

## Highlights
- 100% local processing with zero cloud uploads
- Supports Video, Audio, Images, Documents, Spreadsheets & Archives
- Instant batch conversions in device memory

## Sample Section
Drop any supported file or test conversions directly in the queue.`;
    return new File([md], 'omnidesk_guide.md', { type: 'text/markdown' });
  }

  if (category === 'spreadsheets') {
    const csv = `SKU,Product,Category,Price,InStock
OD-101,4K Studio Monitor,Displays,549,true
OD-102,Mechanical Keyboard,Peripherals,149,true
OD-103,USB-C Audio Interface,Audio,219,true
OD-104,Ergonomic Desk Lamp,Lighting,89,false`;
    return new File([csv], 'inventory_catalog.csv', { type: 'text/csv' });
  }

  if (category === 'archives') {
    const enc = new TextEncoder();
    const zipBytes = createZipArchive([
      { name: 'readme.txt', data: enc.encode('OmniDesk Offline Archive Sample\nCreated locally in memory.'), size: 58 },
      { name: 'data/config.json', data: enc.encode(JSON.stringify({ app: 'OmniDesk', offline: true }, null, 2)), size: 42 },
    ]);
    return new File([toBlobPart(zipBytes)], 'sample_bundle.zip', { type: 'application/zip' });
  }

  if (category === 'audio') {
    const sampleRate = 44100;
    const durationSec = 1.6;
    const frames = Math.floor(sampleRate * durationSec);
    const left = new Float32Array(frames);
    const right = new Float32Array(frames);
    // Warm C-major chord envelope
    const freqs = [261.63, 329.63, 392.0, 523.25];
    for (let i = 0; i < frames; i++) {
      const t = i / sampleRate;
      const env = Math.min(1, t * 10) * Math.max(0, 1 - t / durationSec);
      let s = 0;
      for (const f of freqs) s += Math.sin(2 * Math.PI * f * t);
      const val = (s / freqs.length) * env * 0.6;
      left[i] = val;
      right[i] = val;
    }
    const wavBytes = encodeWavPcm16([left, right], sampleRate);
    return new File([toBlobPart(wavBytes)], 'sample_chord.wav', { type: 'audio/wav' });
  }

  if (category === 'video') {
    // Generate a real 2-second animated WebM clip locally using Canvas + MediaRecorder
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 270;
    const ctx = canvas.getContext('2d')!;
    const stream = canvas.captureStream(24);
    const mime =
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const blob = await new Promise<Blob>(resolve => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      recorder.start();
      const startTs = performance.now();
      const durationMs = 1800;

      const tick = () => {
        const elapsed = performance.now() - startTs;
        const p = Math.min(1, elapsed / durationMs);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Moving geometric orb & progress track
        const cx = 80 + p * 320;
        const cy = 135 + Math.sin(p * Math.PI * 3) * 35;
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(cx, cy, 34, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('OmniDesk Video Demo', 24, 42);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px monospace';
        ctx.fillText(`${(elapsed / 1000).toFixed(2)}s / 1.80s`, 24, 248);

        if (elapsed < durationMs) {
          requestAnimationFrame(tick);
        } else {
          recorder.stop();
        }
      };
      tick();
    });

    return new File([blob], 'sample_motion.webm', { type: 'video/webm' });
  }

  // Default: Images sample
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 640, 400);
  grad.addColorStop(0, '#312e81');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 400);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 592, 352);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('OmniDesk Converter', 56, 185);
  ctx.fillStyle = '#a5b4fc';
  ctx.font = '16px sans-serif';
  ctx.fillText('Offline Multi-Format Sample Image · 640×400', 56, 225);

  const blob = await canvasToBlob(canvas, 'image/png');
  return new File([blob], 'sample_banner.png', { type: 'image/png' });
}
