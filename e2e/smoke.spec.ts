import { test, expect } from '@playwright/test';

test.describe('OmniDesk Web E2E Smoke Suite', () => {
  test('boots cleanly with zero console/page errors and enforces Web-only exclusions', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      pageErrors.push(String(err));
    });

    await page.goto('/');

    // Header & default tool grid rendered
    await expect(page.getByText('OmniDesk').first()).toBeVisible();
    await expect(page.getByText('All Tools').first()).toBeVisible();
    await expect(page.getByText('Text Editor & Notepad (.txt)').first()).toBeVisible();

    // Web-only exclusions: no Lock button, no Sidebar Widgets
    await expect(page.getByRole('button', { name: 'Lock Workspace' })).toHaveCount(0);
    await expect(page.getByText('Live Clock & World Time')).toHaveCount(0);

    // Open Settings and verify Desktop-only tabs are hidden in Web build
    await page.getByRole('button', { name: 'Settings & Appearance' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const tablist = dialog.getByRole('tablist');
    await expect(tablist.getByRole('tab', { name: 'Themes & Colors' })).toBeVisible();
    await expect(tablist.getByRole('tab', { name: 'Language' })).toBeVisible();
    await expect(tablist.getByRole('tab', { name: 'MCP Bridge' })).toHaveCount(0);
    await expect(tablist.getByRole('tab', { name: 'Sidebar Widgets' })).toHaveCount(0);
    await expect(tablist.getByRole('tab', { name: /Backup/i })).toHaveCount(0);
    await expect(tablist.getByRole('tab', { name: 'Updates' })).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('switches languages and renders inline SVG flag icons', async ({ page }) => {
    await page.goto('/');

    const langTrigger = page.locator('button[aria-haspopup="listbox"]');
    await expect(langTrigger).toBeVisible();
    await expect(langTrigger.locator('svg').first()).toBeVisible();

    await langTrigger.click();
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();

    // All 5 language options render with SVG flags
    const options = listbox.getByRole('option');
    await expect(options).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await expect(options.nth(i).locator('svg').first()).toBeVisible();
    }

    // Switch to Czech and verify localized copy updates immediately
    await listbox.getByRole('option', { name: /Čeština/i }).click();
    await expect(page.getByText('Všechny nástroje').first()).toBeVisible();

    // Switch back to English
    await langTrigger.click();
    await page.getByRole('listbox').getByRole('option', { name: /English/i }).click();
    await expect(page.getByText('All Tools').first()).toBeVisible();
  });

  test('switches themes, launches Image Editor via Ctrl+K, and verifies Fit View & Print', async ({ page }) => {
    await page.goto('/');

    // Switch theme to Cyber Emerald via Settings
    await page.getByRole('button', { name: 'Settings & Appearance' }).click();
    const settingsDialog = page.getByRole('dialog');
    await settingsDialog.getByText('Cyber Emerald').click();
    await settingsDialog.getByRole('button', { name: 'Close' }).first().click();

    await expect(page.locator('html[data-theme="emerald"]')).toBeVisible();

    // Open Command Palette via Ctrl+K and launch Image Editor
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog');
    await expect(palette).toBeVisible();

    const searchInput = palette.locator('input[type="text"]');
    await searchInput.fill('Image Editor');
    await palette.getByRole('button', { name: /Image Editor/i }).first().click();

    // Load Sample inside Image Editor
    const loadSampleBtn = page.getByRole('button', { name: /Load Sample/i });
    await expect(loadSampleBtn).toBeVisible();
    await loadSampleBtn.click();

    // Verify canvas, Fit View, and Print controls are active without horizontal clipping
    const fitViewBtn = page.getByRole('button', { name: 'Fit View' });
    await expect(fitViewBtn).toBeVisible();

    const printBtn = page.getByRole('button', { name: 'Print' }).first();
    await expect(printBtn).toBeVisible();
    await expect(printBtn).toBeEnabled();

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(50);
    expect(box!.height).toBeGreaterThan(50);
  });
});
