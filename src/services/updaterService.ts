import type { Update } from '@tauri-apps/plugin-updater';
import { invokeRustCommand, isTauri } from './fileSystemService';

export const GITHUB_RELEASES_LATEST_URL = 'https://github.com/LeonidCharikov/OmniDesk/releases/latest';
const GITHUB_RELEASES_API_URL = 'https://api.github.com/repos/LeonidCharikov/OmniDesk/releases/latest';

export type DesktopUpdateStatus =
  | 'web-unsupported'
  | 'up-to-date'
  | 'available'
  | 'error';

export type DesktopUpdateInstallMode = 'native' | 'release-page';

export interface DesktopUpdateCheckResult {
  status: DesktopUpdateStatus;
  currentVersion: string;
  availableVersion?: string;
  date?: string;
  body?: string;
  releaseUrl?: string;
  installMode?: DesktopUpdateInstallMode;
  updateHandle?: Update;
  error?: string;
}

export interface DesktopUpdateProgress {
  downloadedBytes: number;
  totalBytes?: number;
  percent?: number;
}

function normalizeSemver(version: string): number[] {
  const cleaned = version.trim().replace(/^v/i, '').split('-')[0].split('+')[0];
  return cleaned
    .split('.')
    .slice(0, 3)
    .map(part => {
      const n = Number.parseInt(part, 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    });
}

export function compareSemver(a: string, b: string): number {
  const pa = normalizeSemver(a);
  const pb = normalizeSemver(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

export async function getDesktopAppVersion(): Promise<string> {
  if (!isTauri()) return 'web';
  try {
    const { getVersion } = await import('@tauri-apps/api/app');
    return await getVersion();
  } catch {
    return '0.1.17';
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

async function checkGitHubLatestRelease(currentVersion: string): Promise<DesktopUpdateCheckResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(GITHUB_RELEASES_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });

    if (response.status === 404) {
      return {
        status: 'up-to-date',
        currentVersion,
      };
    }

    if (!response.ok) {
      return {
        status: 'error',
        currentVersion,
        error: `HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      tag_name?: string;
      name?: string;
      body?: string;
      published_at?: string;
      html_url?: string;
    };

    const rawTag = (data.tag_name || data.name || '').trim();
    const cleanVersion = rawTag.replace(/^v/i, '');
    if (cleanVersion && compareSemver(cleanVersion, currentVersion) > 0) {
      return {
        status: 'available',
        currentVersion,
        availableVersion: cleanVersion,
        date: data.published_at ? data.published_at.slice(0, 10) : undefined,
        body: data.body?.trim() || undefined,
        releaseUrl: data.html_url || GITHUB_RELEASES_LATEST_URL,
        installMode: 'release-page',
      };
    }

    return {
      status: 'up-to-date',
      currentVersion,
    };
  } catch (err) {
    return {
      status: 'error',
      currentVersion,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    window.clearTimeout(timeoutId);
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
    return checkGitHubLatestRelease(currentVersion);
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
      installMode: 'native',
      updateHandle: update,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();
    if (lower.includes('plugin updater not found') || lower.includes('pubkey')) {
      return checkGitHubLatestRelease(currentVersion);
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
