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
  installerUrl?: string;
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
    return '0.1.18';
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

async function findMatchingAssetUrl(
  assets: Array<{ name?: string; browser_download_url?: string }> | undefined
): Promise<string | undefined> {
  if (!Array.isArray(assets) || assets.length === 0) return undefined;
  let osPlatform = '';
  let osArch = '';
  try {
    const osPlugin = await import('@tauri-apps/plugin-os');
    osPlatform = (await osPlugin.platform()).toLowerCase();
    osArch = (await osPlugin.arch()).toLowerCase();
  } catch {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    if (ua.includes('win')) osPlatform = 'windows';
    else if (ua.includes('mac')) osPlatform = 'macos';
    else if (ua.includes('linux')) osPlatform = 'linux';
  }

  const validAssets = assets.filter(
    (a): a is { name: string; browser_download_url: string } =>
      Boolean(a.name && a.browser_download_url && !a.name.endsWith('.sig'))
  );

  if (osPlatform === 'windows') {
    const exe = validAssets.find(
      a => a.name.toLowerCase().endsWith('-setup.exe') || a.name.toLowerCase().endsWith('.exe')
    );
    if (exe) return exe.browser_download_url;
    const msi = validAssets.find(a => a.name.toLowerCase().endsWith('.msi'));
    if (msi) return msi.browser_download_url;
  } else if (osPlatform === 'macos' || osPlatform === 'darwin') {
    const isArm = osArch.includes('aarch64') || osArch.includes('arm');
    const archDmg = validAssets.find(
      a =>
        a.name.toLowerCase().endsWith('.dmg') &&
        (isArm
          ? a.name.toLowerCase().includes('aarch64') || a.name.toLowerCase().includes('arm64')
          : a.name.toLowerCase().includes('x64') || a.name.toLowerCase().includes('x86_64'))
    );
    if (archDmg) return archDmg.browser_download_url;
    const anyDmg = validAssets.find(a => a.name.toLowerCase().endsWith('.dmg'));
    if (anyDmg) return anyDmg.browser_download_url;
  } else if (osPlatform === 'linux') {
    const appImage = validAssets.find(a => a.name.toLowerCase().endsWith('.appimage'));
    if (appImage) return appImage.browser_download_url;
    const deb = validAssets.find(a => a.name.toLowerCase().endsWith('.deb'));
    if (deb) return deb.browser_download_url;
  }

  return undefined;
}

async function checkGitHubLatestRelease(currentVersion: string): Promise<DesktopUpdateCheckResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(GITHUB_RELEASES_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
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
      assets?: Array<{
        name?: string;
        browser_download_url?: string;
      }>;
    };

    const rawTag = (data.tag_name || data.name || '').trim();
    const cleanVersion = rawTag.replace(/^v/i, '');
    if (cleanVersion && compareSemver(cleanVersion, currentVersion) > 0) {
      const installerUrl = await findMatchingAssetUrl(data.assets);
      return {
        status: 'available',
        currentVersion,
        availableVersion: cleanVersion,
        date: data.published_at ? data.published_at.slice(0, 10) : undefined,
        body: data.body?.trim() || undefined,
        releaseUrl: data.html_url || GITHUB_RELEASES_LATEST_URL,
        installerUrl,
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
      const fallbackResult = await checkGitHubLatestRelease(currentVersion);
      if (fallbackResult.status === 'available') {
        return fallbackResult;
      }
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
    const fallbackResult = await checkGitHubLatestRelease(currentVersion);
    if (fallbackResult.status === 'available' || fallbackResult.status === 'up-to-date') {
      return fallbackResult;
    }
    const message = err instanceof Error ? err.message : String(err);
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
