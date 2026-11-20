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

  test('cycles cleanly through all 12 theme palettes with valid contrast and zero errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(String(err)));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Settings & Appearance' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const themes = [
      { id: 'midnight', label: 'Midnight Navy' },
      { id: 'oled', label: 'OLED Black' },
      { id: 'graphite', label: 'Charcoal Graphite' },
      { id: 'nord', label: 'Nordic Frost' },
      { id: 'ocean', label: 'Deep Ocean' },
      { id: 'emerald', label: 'Cyber Emerald' },
      { id: 'purple', label: 'Royal Twilight' },
      { id: 'sunset', label: 'Amber Ember' },
      { id: 'rose', label: 'Crimson Velvet' },
      { id: 'light', label: 'Light' },
      { id: 'sand', label: 'Warm Paper' },
      { id: 'mint', label: 'Soft Sage' },
    ];

    for (const theme of themes) {
      const themeBtn = dialog.locator(`button[data-theme-id="${theme.id}"]`);
      await expect(themeBtn).toBeVisible();
      await expect(themeBtn).toContainText(theme.label);
      await themeBtn.click();
      await expect(themeBtn).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator(`html[data-theme="${theme.id}"]`)).toBeVisible();

      const colors = await page.evaluate(() => {
        const bodyStyle = getComputedStyle(document.body);
        return { bg: bodyStyle.backgroundColor, fg: bodyStyle.color };
      });
      expect(colors.bg).not.toBe(colors.fg);
    }

    await dialog.getByRole('button', { name: 'Close' }).first().click();
    expect(errors).toEqual([]);
  });

  test('launches and exercises new offline tools (CSV, SVG, CSS Studio, Mock Data, Snippets, Resume, Lorem Ipsum)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(String(err)));

    // 1. CSV Grid Editor
    await page.goto('/#tool=csv-editor');
    await expect(page.getByText('CSV & Spreadsheet Grid Editor').first()).toBeVisible();
    await page.getByRole('button', { name: /Add Row/i }).click();
    await expect(page.getByText(/6 \/ 6/)).toBeVisible();

    // 2. SVG Inspector & Optimizer
    await page.goto('/#tool=svg-optimizer');
    await expect(page.getByText('SVG Inspector & Optimizer').first()).toBeVisible();
    const jsxTab = page.getByRole('tab', { name: /React TSX/i });
    await jsxTab.click();
    await expect(jsxTab).toHaveAttribute('aria-selected', 'true');

    // 3. CSS Visual Generator Studio
    await page.goto('/#tool=css-visual-studio');
    await expect(page.getByText('CSS Visual Generator Studio').first()).toBeVisible();
    const glassTab = page.getByRole('tab', { name: /Glassmorphism/i });
    await glassTab.click();
    await expect(glassTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText(/backdrop-filter/i).first()).toBeVisible();

    // 4. Mock Data Generator
    await page.goto('/#tool=mock-data-generator');
    await expect(page.getByText('Mock Data & Test Dataset Generator').first()).toBeVisible();
    const sqlTab = page.getByRole('tab', { name: /^sql$/i });
    await sqlTab.click();
    await expect(sqlTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Generated mock dataset output')).toHaveValue(/INSERT INTO users/);

    // 5. Local Code & Shell Snippet Vault
    await page.goto('/#tool=snippet-vault');
    await expect(page.getByText('Local Code & Shell Snippet Vault').first()).toBeVisible();
    const varInput = page.getByPlaceholder('count');
    await expect(varInput).toBeVisible();
    await varInput.fill('5');
    await expect(page.locator('pre').first()).toContainText('git rebase -i HEAD~5');

    // 6. Offline Resume / CV Builder
    await page.goto('/#tool=resume-builder');
    await expect(page.getByText('Offline Resume / CV Builder').first()).toBeVisible();
    const compactTab = page.getByRole('tab', { name: /compact/i });
    await compactTab.click();
    await expect(compactTab).toHaveAttribute('aria-selected', 'true');

    // 7. Lorem Ipsum Generator
    await page.goto('/#tool=lorem-ipsum');
    await expect(page.getByText('Lorem Ipsum & Placeholder Text Generator').first()).toBeVisible();
    await page.getByRole('button', { name: 'HTML', exact: true }).click();
    await expect(page.getByLabel('Lorem Ipsum & Placeholder Text Generator')).toHaveValue(/<p>Lorem ipsum/);

    expect(pageErrors).toEqual([]);
  });

  test('confirms removed online-translator is absent from registry and Command Palette', async ({ page }) => {
    await page.goto('/#tool=online-translator');
    await expect(page.getByText('All Tools').first()).toBeVisible();

    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog');
    await expect(palette).toBeVisible();
    await palette.locator('input[type="text"]').fill('Hybrid Translator');
    await expect(palette.getByRole('button', { name: /Hybrid Translator/i })).toHaveCount(0);
    await expect(palette.getByText(/No tool matches/i)).toBeVisible();
    await expect(palette.getByText('0 tools found')).toBeVisible();
  });
});

