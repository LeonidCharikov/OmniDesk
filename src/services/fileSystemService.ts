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
  const suggestedName = options.suggestedName || options.defaultPath || 'soubor';
  const mimeType = options.mimeType || (typeof options.content === 'string' ? 'text/plain;charset=utf-8' : 'application/octet-stream');

  // 1. Režim Tauri (nativní desktopová aplikace Windows / Mac / Linux)
  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const selectedPath = await save({
        title: options.title || 'Uložit soubor jako',
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
        error: error?.message || 'Uložení souboru v nativním dialogu selhalo.',
      };
    }
  }

  // 2. Prohlížeč s podporou File System Access API (zobrazí nativní průzkumník souborů OS)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      let pickerTypes: Array<{ description: string; accept: Record<string, string[]> }> | undefined;
      
      if (options.filters && options.filters.length > 0) {
        pickerTypes = options.filters.map(f => {
          const acceptMap: Record<string, string[]> = {};
          acceptMap[mimeType] = f.extensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`);
          return {
            description: f.name,
            accept: acceptMap,
          };
        });
      } else {
        const ext = suggestedName.includes('.') ? `.${suggestedName.split('.').pop()}` : '';
        if (ext) {
          pickerTypes = [{
            description: options.title || 'Soubor',
            accept: { [mimeType]: [ext] }
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
    a.download = suggestedName.split(/[/\\]/).pop() || 'soubor';
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
    return { success: false, error: error?.message || 'Uložení selhalo' };
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
        { name: 'Textový soubor (*.txt)', extensions: ['txt'] },
        { name: 'Všechny soubory (*.*)', extensions: ['*'] }
      ]
    : ext === 'json'
    ? [
        { name: 'JSON Soubor (*.json)', extensions: ['json'] },
        { name: 'Všechny soubory (*.*)', extensions: ['*'] }
      ]
    : ext === 'csv'
    ? [
        { name: 'CSV Soubor (*.csv)', extensions: ['csv'] },
        { name: 'Všechny soubory (*.*)', extensions: ['*'] }
      ]
    : [
        { name: 'Textový soubor (*.txt)', extensions: ['txt'] },
        { name: 'Markdown (*.md)', extensions: ['md'] },
        { name: 'Všechny soubory (*.*)', extensions: ['*'] }
      ]);

  const mimeType = ext === 'json'
    ? 'application/json;charset=utf-8'
    : ext === 'csv'
    ? 'text/csv;charset=utf-8'
    : ext === 'svg'
    ? 'image/svg+xml;charset=utf-8'
    : 'text/plain;charset=utf-8';

  return await saveFileWithPicker({
    suggestedName,
    content: text,
    mimeType,
    filters: defaultFilters,
    title: title || 'Uložit soubor jako',
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
    title: title || 'Uložit soubor jako',
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
        title: options?.title || 'Vyberte soubor',
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
        title: options?.title || 'Uložit soubor jako',
        defaultPath: options?.defaultPath || options?.suggestedName,
        filters: options?.filters,
      });
    } catch (err) {
      console.warn('Tauri save dialog failed, falling back:', err);
    }
  }
  return options?.defaultPath || options?.suggestedName || 'vystup.dat';
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
    throw new Error('Přímé čtení z absolutní cesty disku vyžaduje nativní běh Tauri.');
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
    throw new Error('Přímé čtení binárních dat z absolutní cesty vyžaduje nativní běh Tauri.');
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

/**
 * Zavolá vlastní Rust příkaz přes bezpečný Tauri IPC bridge.
 */
export async function invokeRustCommand<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    return await invoke<T>(cmd, args);
  }
  throw new Error(`Rust příkaz "${cmd}" není v prohlížečovém sandboxu dostupný.`);
}
