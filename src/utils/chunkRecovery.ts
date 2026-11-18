import React from 'react';

const CHUNK_RELOAD_STORAGE_KEY = 'omnidesk_chunk_reload_at';
const CHUNK_RELOAD_COOLDOWN_MS = 15_000;
const RETRY_DELAY_MS = 250;
const SW_CLEANUP_TIMEOUT_MS = 1_200;
const RELOAD_SETTLE_TIMEOUT_MS = 3_500;

const CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'unable to preload css for',
  'loading chunk',
  'loading css chunk',
  'chunkloaderror',
];

function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return String(error ?? '');
  } catch {
    return '';
  }
}

export function isChunkLoadError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  if (!message) return false;
  return CHUNK_ERROR_PATTERNS.some(pattern => message.includes(pattern));
}

function isRunningInTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function canAttemptChunkReload(now: number = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  if (isRunningInTauri()) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;

  try {
    const raw = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    if (raw) {
      const lastAttempt = Number(raw);
      if (Number.isFinite(lastAttempt) && now - lastAttempt < CHUNK_RELOAD_COOLDOWN_MS) {
        return false;
      }
    }
  } catch {
    // Ignore restricted storage access
  }

  return true;
}

function recordChunkReloadAttempt(now: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
  } catch {
    // Ignore restricted storage access
  }
}

let reloadInFlight: Promise<boolean> | null = null;

export function clearChunkReloadAttempt(): void {
  reloadInFlight = null;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
  } catch {
    // Ignore restricted storage access
  }
}

async function clearStalePwaCacheAndUpdateSw(): Promise<void> {
  if (typeof window === 'undefined') return;

  const tasks: Array<Promise<unknown>> = [];

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    tasks.push(
      (async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (!registration) return;

          await Promise.race([registration.update().catch(() => undefined), delay(800)]);

          if (registration.waiting) {
            const waitingWorker = registration.waiting;
            await new Promise<void>(resolve => {
              let settled = false;
              const finish = () => {
                if (!settled) {
                  settled = true;
                  navigator.serviceWorker.removeEventListener('controllerchange', finish);
                  resolve();
                }
              };
              navigator.serviceWorker.addEventListener('controllerchange', finish);
              waitingWorker.postMessage({ type: 'SKIP_WAITING' });
              setTimeout(finish, 600);
            });
            return;
          }

          // Active SW precache is stale/missing a chunk while online; unregister so reload fetches fresh index.html
          await registration.unregister().catch(() => false);
        } catch {
          // Ignore SW cleanup errors
        }
      })()
    );
  }

  if ('caches' in window) {
    tasks.push(
      (async () => {
        try {
          const keys = await window.caches.keys();
          const precacheKeys = keys.filter(key => key.includes('workbox-precache'));
          await Promise.all(precacheKeys.map(key => window.caches.delete(key)));
        } catch {
          // Ignore CacheStorage errors
        }
      })()
    );
  }

  if (tasks.length > 0) {
    await Promise.race([Promise.allSettled(tasks), delay(SW_CLEANUP_TIMEOUT_MS)]);
  }
}

export async function tryReloadOnChunkError(): Promise<boolean> {
  if (!canAttemptChunkReload()) {
    return false;
  }

  if (reloadInFlight) {
    return reloadInFlight;
  }

  reloadInFlight = (async () => {
    recordChunkReloadAttempt();
    await clearStalePwaCacheAndUpdateSw();
    window.location.reload();
    return true;
  })();

  return reloadInFlight;
}

export async function forceHardReloadApp(): Promise<boolean> {
  if (typeof window === 'undefined' || isRunningInTauri()) {
    return false;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  clearChunkReloadAttempt();
  await clearStalePwaCacheAndUpdateSw();
  window.location.reload();
  return true;
}

type LazyResolvedComponent<TModule, TKey extends keyof TModule> =
  TModule[TKey] extends React.ComponentType<infer P>
    ? React.ComponentType<P>
    : React.ComponentType;

export function lazyWithRetry<
  TModule extends Record<string, unknown>,
  TKey extends keyof TModule & string,
>(
  loader: () => Promise<TModule>,
  exportName: TKey
): React.LazyExoticComponent<LazyResolvedComponent<TModule, TKey>> {
  return React.lazy(async () => {
    const resolveExport = (
      mod: TModule
    ): { default: LazyResolvedComponent<TModule, TKey> } => {
      const component = mod[exportName];
      if (!component) {
        throw new Error(`Missing lazy export "${exportName}"`);
      }
      return { default: component as LazyResolvedComponent<TModule, TKey> };
    };

    try {
      const mod = await loader();
      return resolveExport(mod);
    } catch (firstError) {
      if (!isChunkLoadError(firstError)) {
        throw firstError;
      }

      await delay(RETRY_DELAY_MS);

      try {
        const mod = await loader();
        return resolveExport(mod);
      } catch (retryError) {
        if (isChunkLoadError(retryError)) {
          const didReload = await tryReloadOnChunkError();
          if (didReload) {
            await delay(RELOAD_SETTLE_TIMEOUT_MS);
          }
        }
        throw retryError;
      }
    }
  });
}
