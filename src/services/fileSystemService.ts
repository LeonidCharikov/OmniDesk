/**
 * Služba pro přístup k nativnímu souborovému systému hostitelského počítače.
 * Využívá Tauri v2 API (@tauri-apps/plugin-fs, @tauri-apps/plugin-dialog a @tauri-apps/api/core)
 * a moderní File System Access API (window.showSaveFilePicker / window.showOpenFilePicker)
 * s plnohodnotným systémovým dialogem průzkumníka souborů a automatickým webovým fallbackem.
 */

import { invoke } from '@tauri-apps/api/core';

export interface FileFilterOption {
  name: string;
  extensions: string[];
}

export interface OpenFileOptions {
  title?: string;
  multiple?: boolean;
  directory?: boolean;
  filters?: FileFilterOption[];
  accept?: string;
}

export interface SaveFileOptions {
  title?: string;
  defaultPath?: string;
  suggestedName?: string;
  filters?: FileFilterOption[];
  mimeType?: string;
}

export interface SaveResult {
  success: boolean;
  path?: string;
  canceled?: boolean;
  error?: string;
}

export interface LoadedFileResult {
  name: string;
  path?: string;
  size: number;
  content: string | Uint8Array;
}

/**
 * Zjišťuje, zda aplikace běží uvnitř nativního Tauri okna na hostitelském počítači.
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
    (window as unknown as { __TAURI__?: unknown }).__TAURI__
  );
}

/**
 * Otevře nativní systémový dialog pro uložení souboru (Tauri nebo File System Access API v prohlížeči).
 * Umožňuje uživateli vybrat libovolnou složku a zadat název souboru.
 */
export async function saveFileWithPicker(options: {
  defaultPath?: string;
  suggestedName?: string;
  content: string | Blob | Uint8Array;
  mimeType?: string;
  filters?: FileFilterOption[];
  title?: string;
}): Promise<SaveResult> {
  const suggestedName = options.suggestedName || options.defaultPath || 'file';
  const mimeType = options.mimeType || (typeof options.content === 'string' ? 'text/plain;charset=utf-8' : 'application/octet-stream');

  // 1. Režim Tauri (nativní desktopová aplikace Windows / Mac / Linux)
  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const selectedPath = await save({
        title: options.title || 'Save file as',
        defaultPath: suggestedName,
        filters: options.filters,
      });

      if (!selectedPath) {
        return { success: false, canceled: true };
      }

      if (typeof options.content === 'string') {
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(selectedPath, options.content);
      } else {
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        let bytes: Uint8Array;
        if (options.content instanceof Blob) {
          bytes = new Uint8Array(await options.content.arrayBuffer());
        } else {
          bytes = options.content;
        }
        await writeFile(selectedPath, bytes);
      }

      return { success: true, path: selectedPath };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: error?.message || 'Saving file in the native dialog failed.',
      };
    }
  }

  // 2. Prohlížeč s podporou File System Access API (zobrazí nativní průzkumník souborů OS)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      let pickerTypes: Array<{ description: string; accept: Record<string, string[]> }> | undefined;
      
      const cleanMime = mimeType.split(';')[0].trim() || 'application/octet-stream';
      if (options.filters && options.filters.length > 0) {
        pickerTypes = options.filters
          .map(f => {
            const exts = f.extensions
              .filter(ext => ext && ext !== '*')
              .map(ext => (ext.startsWith('.') ? ext : `.${ext}`));
            if (exts.length === 0) return null;
            return {
              description: f.name,
              accept: { [cleanMime]: exts },
            };
          })
          .filter((item): item is { description: string; accept: Record<string, string[]> } => item !== null);
        if (pickerTypes.length === 0) pickerTypes = undefined;
      } else {
        const ext = suggestedName.includes('.') ? `.${suggestedName.split('.').pop()}` : '';
        if (ext) {
          pickerTypes = [{
            description: options.title || 'File',
            accept: { [cleanMime]: [ext] }
          }];
        }
      }

      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: {
          suggestedName?: string;
          types?: Array<{ description: string; accept: Record<string, string[]> }>;
        }) => Promise<{
          name: string;
          createWritable: () => Promise<{
            write: (data: unknown) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      }).showSaveFilePicker({
        suggestedName,
        types: pickerTypes,
      });

      const writable = await handle.createWritable();
      if (options.content instanceof Blob) {
        await writable.write(options.content);
      } else if (typeof options.content === 'string') {
        await writable.write(new Blob([options.content], { type: mimeType }));
      } else {
        await writable.write(new Blob([options.content as unknown as BlobPart], { type: mimeType }));
      }
      await writable.close();

      return { success: true, path: handle.name };
    } catch (err: unknown) {
      const error = err as Error;
      if (error?.name === 'AbortError') {
        // Uživatel kliknul v průzkumníku souborů na Storno
        return { success: false, canceled: true };
      }
      console.warn('showSaveFilePicker failed or was blocked, falling back to download:', err);
    }
  }

  // 3. Fallback: Standardní prohlížečové stažení přes odkaz <a>
  try {
    let blob: Blob;
    if (options.content instanceof Blob) {
      blob = options.content;
    } else if (typeof options.content === 'string') {
      blob = new Blob([options.content], { type: mimeType });
    } else {
      blob = new Blob([options.content as unknown as BlobPart], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName.split(/[/\\]/).pop() || 'file';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);

    return { success: true, path: suggestedName };
  } catch (err: unknown) {
    const error = err as Error;
    return { success: false, error: error?.message || 'Save failed' };
  }
}

/**
 * Uloží textový soubor prostřednictvím systémového dialogu průzkumníka souborů.
 */
export async function saveTextWithDialog(
  suggestedName: string,
  text: string,
  filters?: FileFilterOption[],
  title?: string
): Promise<SaveResult> {
  const ext = suggestedName.split('.').pop()?.toLowerCase();
  const defaultFilters: FileFilterOption[] = filters || (ext === 'md'
    ? [
        { name: 'Markdown (*.md)', extensions: ['md'] },
        { name: 'Text file (*.txt)', extensions: ['txt'] },
        { name: 'All files (*.*)', extensions: ['*'] }
      ]
    : ext === 'json'
    ? [
        { name: 'JSON file (*.json)', extensions: ['json'] },
        { name: 'All files (*.*)', extensions: ['*'] }
      ]
    : ext === 'csv'
    ? [
        { name: 'CSV file (*.csv)', extensions: ['csv'] },
        { name: 'All files (*.*)', extensions: ['*'] }
      ]
    : [
        { name: 'Text file (*.txt)', extensions: ['txt'] },
        { name: 'Markdown (*.md)', extensions: ['md'] },
        { name: 'All files (*.*)', extensions: ['*'] }
      ]);

  const mimeType = ext === 'json'
    ? 'application/json;charset=utf-8'
    : ext === 'csv'
    ? 'text/csv;charset=utf-8'
    : ext === 'html' || ext === 'htm'
    ? 'text/html;charset=utf-8'
    : ext === 'md'
    ? 'text/markdown;charset=utf-8'
    : ext === 'svg'
    ? 'image/svg+xml;charset=utf-8'
    : 'text/plain;charset=utf-8';

  return await saveFileWithPicker({
    suggestedName,
    content: text,
    mimeType,
    filters: defaultFilters,
    title: title || 'Save file as',
  });
}

/**
 * Uloží binární soubor (audio, obrázek, PDF) prostřednictvím systémového dialogu průzkumníka souborů.
 */
export async function saveBinaryWithDialog(
  suggestedName: string,
  data: Blob | Uint8Array,
  mimeType: string,
  filters?: FileFilterOption[],
  title?: string
): Promise<SaveResult> {
  return await saveFileWithPicker({
    suggestedName,
    content: data,
    mimeType,
    filters,
    title: title || 'Save file as',
  });
}

/**
 * Otevře systémový dialog pro výběr souboru (Tauri nebo showOpenFilePicker / input).
 */
export async function openFileWithPicker(options?: {
  filters?: FileFilterOption[];
  accept?: string;
  readAs?: 'text' | 'arrayBuffer' | 'blob' | 'file';
  title?: string;
}): Promise<{ file: File; content?: string | ArrayBuffer | Blob; name: string } | null> {
  // Prohlížeč s File System Access API
  if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
    try {
      const pickerTypes = options?.filters?.map(f => ({
        description: f.name,
        accept: {
          '*/*': f.extensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`)
        }
      }));

      const handles = await (window as unknown as {
        showOpenFilePicker: (opts: unknown) => Promise<Array<{ getFile: () => Promise<File> }>>;
      }).showOpenFilePicker({
        multiple: false,
        types: pickerTypes,
      });

      if (!handles || handles.length === 0) return null;
      const file = await handles[0].getFile();
      let content: string | ArrayBuffer | Blob | undefined;
      if (options?.readAs === 'text') {
        content = await file.text();
      } else if (options?.readAs === 'arrayBuffer') {
        content = await file.arrayBuffer();
      } else if (options?.readAs === 'blob') {
        content = file;
      }
      return { file, content, name: file.name };
    } catch (err: unknown) {
      const error = err as Error;
      if (error?.name === 'AbortError') return null;
      console.warn('showOpenFilePicker failed, falling back to input:', err);
    }
  }

  // Fallback: standardní input file element
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    if (options?.accept) {
      input.accept = options.accept;
    } else if (options?.filters && options.filters.length > 0) {
      input.accept = options.filters.flatMap(f => f.extensions.map(ext => `.${ext.replace(/^\./, '')}`)).join(',');
    }
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      let content: string | ArrayBuffer | Blob | undefined;
      if (options?.readAs === 'text') {
        content = await file.text();
      } else if (options?.readAs === 'arrayBuffer') {
        content = await file.arrayBuffer();
      } else if (options?.readAs === 'blob') {
        content = file;
      }
      resolve({ file, content, name: file.name });
    };
    input.click();
  });
}

/**
 * Otevře nativní systémový dialog pro výběr souboru na hostitelském počítači.
 */
export async function openFileDialog(options?: OpenFileOptions): Promise<string | string[] | null> {
  if (isTauri()) {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      return await open({
        title: options?.title || 'Select file',
        multiple: options?.multiple || false,
        directory: options?.directory || false,
        filters: options?.filters,
      });
    } catch (err) {
      console.warn('Tauri open dialog failed, falling back:', err);
    }
  }

  // Web fallback: vyvolání standardního prohlížečového inputu
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = options?.multiple || false;
    if (options?.filters && options.filters.length > 0) {
      const acceptExtensions = options.filters.flatMap(f => f.extensions.map(ext => `.${ext}`)).join(',');
      input.accept = acceptExtensions;
    } else if (options?.accept) {
      input.accept = options.accept;
    }

    input.onchange = () => {
      if (!input.files || input.files.length === 0) {
        resolve(null);
        return;
      }
      if (options?.multiple) {
        resolve(Array.from(input.files).map(f => f.name));
      } else {
        resolve(input.files[0].name);
      }
    };

    input.click();
  });
}

/**
 * Otevře nativní systémový dialog pro uložení souboru na hostitelském počítači.
 */
export async function saveFileDialog(options?: SaveFileOptions): Promise<string | null> {
  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      return await save({
        title: options?.title || 'Save file as',
        defaultPath: options?.defaultPath || options?.suggestedName,
        filters: options?.filters,
      });
    } catch (err) {
      console.warn('Tauri save dialog failed, falling back:', err);
    }
  }
  return options?.defaultPath || options?.suggestedName || 'output.dat';
}

/**
 * Přečte textový soubor z hostitelského disku podle cesty nebo z objektu File.
 */
export async function readHostTextFile(target: string | File): Promise<string> {
  if (typeof target === 'string') {
    if (isTauri()) {
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      return await readTextFile(target);
    }
    throw new Error('Reading directly from an absolute disk path requires the native Tauri runtime.');
  }

  // Web File objekt
  return await target.text();
}

/**
 * Přečte binární soubor z hostitelského disku do Uint8Array.
 */
export async function readHostBinaryFile(target: string | File): Promise<Uint8Array> {
  if (typeof target === 'string') {
    if (isTauri()) {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      return await readFile(target);
    }
    throw new Error('Reading binary data from an absolute path requires the native Tauri runtime.');
  }

  const arrayBuffer = await target.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Zapíše textový obsah do souboru na hostitelském počítači.
 */
export async function writeHostTextFile(pathOrFilename: string, content: string): Promise<void> {
  if (isTauri()) {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    await writeTextFile(pathOrFilename, content);
    return;
  }

  await saveTextWithDialog(pathOrFilename, content);
}

/**
 * Zapíše binární data do souboru na hostitelském disku.
 */
export async function writeHostBinaryFile(
  pathOrFilename: string,
  data: Uint8Array,
  mimeType: string = 'application/octet-stream'
): Promise<void> {
  if (isTauri()) {
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    await writeFile(pathOrFilename, data);
    return;
  }

  await saveBinaryWithDialog(pathOrFilename, data, mimeType);
}

export const OMNIDESK_PROJECT_WEB_URL = 'https://leonidcharikov.github.io/omnidesk.html';
export const OMNIDESK_GITHUB_URL = 'https://github.com/LeonidCharikov/OmniDesk';

/**
 * Zavolá vlastní Rust příkaz přes bezpečný Tauri IPC bridge.
 */
export async function invokeRustCommand<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    return await invoke<T>(cmd, args);
  }
  throw new Error(`Rust command "${cmd}" is not available in the browser sandbox.`);
}

/**
 * Otevře externí HTTP/HTTPS odkaz ve výchozím systémovém prohlížeči (v Tauri přes Rust příkaz, ve webu přes novou kartu).
 */
export async function openExternalUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return;

  if (isTauri()) {
    try {
      await invokeRustCommand<void>('open_external_url', { url: trimmed });
      return;
    } catch (err) {
      console.warn('open_external_url command failed, falling back:', err);
    }
  }

  if (typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = trimmed;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export interface TauriDropListenerOptions {
  onDragStateChange?: (isDragging: boolean) => void;
  onError?: (message: string) => void;
}

const DROPPED_FILE_MIME_MAP: Record<string, string> = {
  // Images
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  // Video
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  ogv: 'video/ogg',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  opus: 'audio/opus',
  aiff: 'audio/aiff',
  aif: 'audio/aiff',
  // Documents
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  md: 'text/markdown',
  markdown: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  txt: 'text/plain',
  rtf: 'application/rtf',
  // Spreadsheets & Data
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  json: 'application/json',
  yaml: 'text/yaml',
  yml: 'text/yaml',
  xml: 'application/xml',
  // Archives
  zip: 'application/zip',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  tgz: 'application/gzip',
};

async function readDroppedFileBytes(filePath: string): Promise<Uint8Array> {
  try {
    const raw = await invoke<ArrayBuffer | Uint8Array | number[]>('read_dropped_file', {
      path: filePath,
    });
    if (raw instanceof Uint8Array) return raw;
    if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
    if (Array.isArray(raw)) return new Uint8Array(raw);
  } catch {
    // Fall back to plugin-fs when running against an older binary or scoped directory
  }

  const { readFile } = await import('@tauri-apps/plugin-fs');
  return await readFile(filePath);
}

/**
 * Zaregistruje posluchač pro nativní Tauri drag-and-drop události z operačního systému.
 * Slouží pro desktopovou aplikaci běžící s dragDropEnabled: true.
 */
export function registerTauriDropListener(
  onFiles: (files: File[]) => void,
  options?: TauriDropListenerOptions
): () => void {
  if (!isTauri()) {
    return () => {};
  }

  let unlistenFn: (() => void) | undefined;
  let isActive = true;

  import('@tauri-apps/api/webview')
    .then(({ getCurrentWebview }) => {
      if (!isActive) return;
      return getCurrentWebview().onDragDropEvent(async event => {
        if (!isActive) return;

        const payloadType = event.payload.type;
        if (payloadType === 'enter' || payloadType === 'over') {
          options?.onDragStateChange?.(true);
          return;
        }
        if (payloadType === 'leave') {
          options?.onDragStateChange?.(false);
          return;
        }
        if (payloadType !== 'drop') return;

        options?.onDragStateChange?.(false);
        const paths = event.payload.paths;
        if (!paths || paths.length === 0) return;

        try {
          const loadedFiles: File[] = [];
          const errors: string[] = [];

          for (const filePath of paths) {
            try {
              const bytes = await readDroppedFileBytes(filePath);
              const filename = filePath.split(/[/\\]/).pop() || 'dropped-file';
              const lower = filename.toLowerCase();
              const ext = lower.endsWith('.tar.gz')
                ? 'gz'
                : lower.includes('.')
                ? lower.split('.').pop() || ''
                : '';
              const mime = DROPPED_FILE_MIME_MAP[ext] || 'application/octet-stream';
              loadedFiles.push(new File([bytes as unknown as BlobPart], filename, { type: mime }));
            } catch (fileErr) {
              const msg = fileErr instanceof Error ? fileErr.message : String(fileErr);
              errors.push(msg);
            }
          }

          if (loadedFiles.length > 0) {
            onFiles(loadedFiles);
          } else if (errors.length > 0) {
            options?.onError?.(errors[0]);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn('registerTauriDropListener: Failed to read dropped files:', err);
          options?.onError?.(msg);
        }
      });
    })
    .then(unlisten => {
      if (unlisten) {
        if (!isActive) {
          unlisten();
        } else {
          unlistenFn = unlisten;
        }
      }
    })
    .catch(err => {
      console.warn('registerTauriDropListener failed to register:', err);
    });

  return () => {
    isActive = false;
    options?.onDragStateChange?.(false);
    if (unlistenFn) {
      unlistenFn();
    }
  };
}
