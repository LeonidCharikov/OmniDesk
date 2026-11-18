export interface PhotoCompressRequest {
  id: string;
  file: File;
  format: 'image/jpeg' | 'image/webp';
  maxDimension: number;
  mode: 'quality' | 'target';
  fixedQuality: number;
  targetBytes: number;
}

export interface PhotoCompressResponse {
  id: string;
  ok: boolean;
  blob?: Blob;
  width?: number;
  height?: number;
  hadExif?: boolean;
  error?: string;
}

function detectJpegExif(buffer: ArrayBuffer): boolean {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return false;
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffe1) return true;
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break;
    const size = view.getUint16(offset, false);
    if (size < 2) break;
    offset += size;
  }
  return false;
}

self.onmessage = async (event: MessageEvent<PhotoCompressRequest>) => {
  const { id, file, format, maxDimension, mode, fixedQuality, targetBytes } = event.data;
  let bitmap: ImageBitmap | null = null;
  let canvas: OffscreenCanvas | null = null;

  try {
    const buffer = await file.arrayBuffer();
    const hadExif = detectJpegExif(buffer);

    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
      throw new Error('OFFSCREEN_UNSUPPORTED');
    }

    bitmap = await createImageBitmap(file);
    let w = bitmap.width;
    let h = bitmap.height;
    if (w > maxDimension || h > maxDimension) {
      const ratio = Math.min(maxDimension / w, maxDimension / h);
      w = Math.max(1, Math.round(w * ratio));
      h = Math.max(1, Math.round(h * ratio));
    }

    canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('CANVAS_CTX_UNAVAILABLE');
    }

    if (format === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(bitmap, 0, 0, w, h);

    let finalBlob: Blob;
    if (mode === 'quality') {
      finalBlob = await canvas.convertToBlob({ type: format, quality: fixedQuality });
    } else {
      let lo = 0.1;
      let hi = 0.95;
      let best = await canvas.convertToBlob({ type: format, quality: lo });
      for (let step = 0; step < 6; step++) {
        const mid = (lo + hi) / 2;
        const candidate = await canvas.convertToBlob({ type: format, quality: mid });
        if (candidate.size <= targetBytes) {
          best = candidate;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      finalBlob = best;
    }

    const response: PhotoCompressResponse = {
      id,
      ok: true,
      blob: finalBlob,
      width: w,
      height: h,
      hadExif,
    };
    self.postMessage(response);
  } catch (err) {
    const response: PhotoCompressResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : 'Compression worker error',
    };
    self.postMessage(response);
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
};
