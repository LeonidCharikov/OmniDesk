declare module 'gifenc' {
  export type PaletteColor = [number, number, number] | [number, number, number, number];
  export type GifFormat = 'rgb565' | 'rgb444' | 'rgba4444';

  export interface GifEncoderOptions {
    initialCapacity?: number;
    auto?: boolean;
  }

  export interface GifFrameOptions {
    transparent?: boolean;
    transparentIndex?: number;
    delay?: number;
    palette?: PaletteColor[] | null;
    repeat?: number;
    colorDepth?: number;
    dispose?: number;
    first?: boolean;
  }

  export interface GifEncoderInstance {
    reset(): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    writeHeader(): void;
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: GifFrameOptions
    ): void;
  }

  export function GIFEncoder(opt?: GifEncoderOptions): GifEncoderInstance;
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: { format?: GifFormat; oneBitAlpha?: boolean | number; clearAlpha?: boolean; clearAlphaThreshold?: number; clearAlphaColor?: number }
  ): PaletteColor[];
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: PaletteColor[],
    format?: GifFormat
  ): Uint8Array;
}
