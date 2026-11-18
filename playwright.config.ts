import fs from 'node:fs';
import { chromium, defineConfig } from '@playwright/test';

const fallbackExecutable =
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';

const defaultExecutable = (() => {
  try {
    return chromium.executablePath();
  } catch {
    return '';
  }
})();

const resolvedExecutablePath =
  defaultExecutable && fs.existsSync(defaultExecutable)
    ? defaultExecutable
    : fs.existsSync(fallbackExecutable)
    ? fallbackExecutable
    : undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: resolvedExecutablePath
      ? { executablePath: resolvedExecutablePath }
      : undefined,
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
