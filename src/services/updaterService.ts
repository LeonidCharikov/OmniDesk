import type { Update } from '@tauri-apps/plugin-updater';
import { invokeRustCommand, isTauri } from './fileSystemService';

export type DesktopUpdateStatus =
  | 'web-unsupported'
  | 'unconfigured'
  | 'up-to-date'
  | 'available'
  | 'error';

export interface DesktopUpdateCheckResult {
  status: DesktopUpdateStatus;
  currentVersion: string;
  availableVersion?: string;
  date?: string;
  body?: string;
  updateHandle?: Update;
  error?: string;
}

export interface DesktopUpdateProgress {
  downloadedBytes: number;
  totalBytes?: number;
  percent?: number;
}

export async function getDesktopAppVersion(): Promise<string> {
  if (!isTauri()) return 'web';
  try {
    const { getVersion } = await import('@tauri-apps/api/app');
    return await getVersion();
  } catch {
    return '0.1.16';
  }
}

export async function isDesktopUpdaterConfigured(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return Boolean(await invokeRustCommand<boolean>('is_updater_configured'));
  } catch {
    return false;
  }
}

export async function checkForDesktopUpdate(): Promise<DesktopUpdateCheckResult> {
  if (!isTauri()) {
    return {
      status: 'web-unsupported',
      currentVersion: 'web',
    };
  }

  const currentVersion = await getDesktopAppVersion();
  const configured = await isDesktopUpdaterConfigured();
  if (!configured) {
    return {
      status: 'unconfigured',
      currentVersion,
    };
  }

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check({ timeout: 15000 });
    if (!update) {
      return {
        status: 'up-to-date',
        currentVersion,
      };
    }

    return {
      status: 'available',
      currentVersion: update.currentVersion || currentVersion,
      availableVersion: update.version,
      date: update.date,
      body: update.body,
      updateHandle: update,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes('plugin updater not found') || message.toLowerCase().includes('pubkey')) {
      return {
        status: 'unconfigured',
        currentVersion,
      };
    }
    return {
      status: 'error',
      currentVersion,
      error: message,
    };
  }
}

export async function installDesktopUpdate(
  updateHandle: Update,
  onProgress?: (progress: DesktopUpdateProgress) => void
): Promise<void> {
  if (!isTauri()) {
    throw new Error('Desktop updater is only available inside the Tauri Desktop app.');
  }

  let totalBytes: number | undefined;
  let downloadedBytes = 0;

  await updateHandle.downloadAndInstall(event => {
    if (event.event === 'Started') {
      totalBytes = event.data.contentLength;
      downloadedBytes = 0;
      onProgress?.({ downloadedBytes, totalBytes, percent: totalBytes ? 0 : undefined });
    } else if (event.event === 'Progress') {
      downloadedBytes += event.data.chunkLength;
      const percent = totalBytes ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : undefined;
      onProgress?.({ downloadedBytes, totalBytes, percent });
    } else if (event.event === 'Finished') {
      onProgress?.({ downloadedBytes, totalBytes, percent: 100 });
    }
  });

  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}

export async function disposeDesktopUpdateHandle(updateHandle: Update | null | undefined): Promise<void> {
  if (!updateHandle) return;
  try {
    await updateHandle.close();
  } catch {
    // ignore already closed resource handles
  }
}
