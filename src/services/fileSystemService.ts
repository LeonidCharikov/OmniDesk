/**
 * Služba pro přístup k nativnímu souborovému systému hostitelského počítače.
 * Využívá Tauri v2 API (@tauri-apps/plugin-fs, @tauri-apps/plugin-dialog a @tauri-apps/api/core)
 * s automatickým webovým fallbackem pro vývoj a preview režim.
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
}

export interface SaveFileOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilterOption[];
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
        defaultPath: options?.defaultPath,
        filters: options?.filters,
      });
    } catch (err) {
      console.warn('Tauri save dialog failed, falling back:', err);
    }
  }
  return options?.defaultPath || 'vystup.dat';
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

  // Web fallback: vyvolá uložení stažením souboru do složky Stažené soubory
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pathOrFilename.split(/[/\\]/).pop() || 'soubor.txt';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Zapíše binární data (např. PDF nebo obrázek) do souboru na hostitelském disku.
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

  // Web fallback
  const blob = new Blob([data as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pathOrFilename.split(/[/\\]/).pop() || 'soubor.bin';
  a.click();
  URL.revokeObjectURL(url);
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
