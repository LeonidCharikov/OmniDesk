import React, { Suspense } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  canAttemptChunkReload,
  clearChunkReloadAttempt,
  isChunkLoadError,
  lazyWithRetry,
  tryReloadOnChunkError,
} from '../utils/chunkRecovery';

describe('chunkRecovery', () => {
  const originalOnLine = navigator.onLine;
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    clearChunkReloadAttempt();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    vi.restoreAllMocks();
  });

  it('recognizes browser dynamic-import and chunk-loading errors', () => {
    expect(
      isChunkLoadError(
        new TypeError(
          'error loading dynamically imported module: https://leonidcharikov.github.io/OmniDesk/assets/SizeConverterTool-BHynAHLl.js'
        )
      )
    ).toBe(true);
    expect(
      isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://example.com/app.js'))
    ).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Unable to preload CSS for https://example.com/style.css'))).toBe(true);
    expect(isChunkLoadError(new Error('ChunkLoadError: Loading chunk 12 failed'))).toBe(true);

    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it('guards reload attempts when offline, in Tauri, or within cooldown window', async () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });

    expect(canAttemptChunkReload(100_000)).toBe(true);

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    expect(canAttemptChunkReload(100_000)).toBe(false);
    expect(await tryReloadOnChunkError()).toBe(false);
    expect(reloadMock).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    expect(canAttemptChunkReload(100_000)).toBe(false);
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;

    expect(await tryReloadOnChunkError()).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
    expect(canAttemptChunkReload(Date.now())).toBe(false);
    expect(await tryReloadOnChunkError()).toBe(false);
    expect(reloadMock).toHaveBeenCalledTimes(1);

    expect(canAttemptChunkReload(Date.now() + 20_000)).toBe(true);
  });

  it('retries a transient chunk error once and renders the resolved component', async () => {
    const DummyTool: React.FC = () => React.createElement('div', null, 'Size Converter Loaded');
    const loader = vi
      .fn<() => Promise<Record<string, unknown>>>()
      .mockRejectedValueOnce(
        new TypeError(
          'error loading dynamically imported module: https://leonidcharikov.github.io/OmniDesk/assets/SizeConverterTool-BHynAHLl.js'
        )
      )
      .mockResolvedValueOnce({ SizeConverterTool: DummyTool });

    const LazyTool = lazyWithRetry(loader, 'SizeConverterTool');

    render(
      React.createElement(
        Suspense,
        { fallback: React.createElement('div', null, 'Loading...') },
        React.createElement(LazyTool)
      )
    );

    await waitFor(() => {
      expect(screen.getByText('Size Converter Loaded')).toBeTruthy();
    });
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
